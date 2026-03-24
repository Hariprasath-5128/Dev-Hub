import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { patients } from '../data/mockVitals';
import DigitalTwin from './DigitalTwin';
import M1 from './m1';

const API_BASES = ['http://localhost:5000/api', 'http://localhost:8000/api'];
const NODE_API_BASE = 'http://localhost:5003';

async function postJsonWithFallback(urls, payload) {
  let lastError = 'Service is currently unavailable.';

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        lastError = message || `Request failed on ${url}`;
        continue;
      }

      return await response.json();
    } catch (err) {
      lastError = err?.message || `Could not connect to ${url}`;
    }
  }

  throw new Error(lastError);
}

const situationDescriptions = {
  'Normal': 'Vitals are stable and within normal baseline parameters. No immediate anomalies detected.',
  'Tachycardia': 'Elevated heart rate detected. This could indicate stress, cardiac exertion, or an early arrhythmia signature.',
  'Bradycardia': 'Unusually low heart rate detected. If not an athlete, monitor for dizziness or fatigue.',
  'Hypoxemia': 'Low blood oxygen levels detected. Shows potential respiratory restriction or circulatory insufficiency.',
  'Fever': 'Elevated body temperature detected, suggesting possible infection or inflammatory response.',
  'Hypertension': 'High blood pressure readings. Represents increased cardiovascular load.',
  'Hypotension': 'Low blood pressure detected. Could lead to fainting or indicate poor circulation.',
  'Emergency': 'Critical multi-vital failure pattern detected. Immediate medical intervention is highly recommended.'
};

function deriveRegionFromAgentAnswer(agentResult, fallbackCondition = '') {
  const combinedText = [
    agentResult?.condition,
    agentResult?.ui_label,
    agentResult?.consensus,
    agentResult?.voice_summary,
    agentResult?.debate?.monitoring_view,
    agentResult?.debate?.diagnosis_view,
    agentResult?.debate?.consensus,
    agentResult?.explanation?.voice_summary,
    agentResult?.emergency?.urgency_note,
    ...(agentResult?.actions || [])
  ].filter(Boolean).join(' ').toLowerCase();

  const baseline = (fallbackCondition || '').toLowerCase();
  const text = `${combinedText} ${baseline}`;

  if (text.includes('brain') || text.includes('neuro') || text.includes('seizure') || text.includes('stroke')) {
    return 'brain';
  }
  if (text.includes('lung') || text.includes('respiratory') || text.includes('hypox') || text.includes('spo2') || text.includes('oxygen')) {
    return 'lungs';
  }
  if (text.includes('fever') || text.includes('sepsis') || text.includes('temperature') || text.includes('systemic')) {
    return 'body';
  }
  if (text.includes('heart') || text.includes('tachy') || text.includes('brady') || text.includes('cardia') || text.includes('arrhythm')) {
    return 'heart';
  }
  return 'heart';
}

function buildTwinDataFromAgentResult(agentResult, vitalsSnapshot, mlResult) {
  const fallbackCondition = mlResult?.predicted_condition || 'normal';
  const region = deriveRegionFromAgentAnswer(agentResult, fallbackCondition);
  const ewsLevel = (agentResult?.ews?.level || '').toLowerCase();
  const emergency = Boolean(agentResult?.emergency?.dispatch_alert);

  let heatmapColor = '#38bdf8';
  if (emergency || ewsLevel === 'high' || ewsLevel === 'red') heatmapColor = '#ef4444';
  else if (ewsLevel === 'medium' || ewsLevel === 'amber' || ewsLevel === 'yellow') heatmapColor = '#f59e0b';
  else if (ewsLevel === 'low' || ewsLevel === 'green') heatmapColor = '#22c55e';

  return {
    ...agentResult,
    condition: agentResult?.condition || agentResult?.ui_label || fallbackCondition,
    affected_regions: [region],
    heatmap_colour: agentResult?.heatmap_colour || heatmapColor,
    fingerprints: Array.isArray(agentResult?.fingerprints) && agentResult.fingerprints.length
      ? agentResult.fingerprints
      : Object.entries(mlResult?.all_probabilities || {}).map(([disease, probability]) => ({ disease, probability })),
    vitals: {
      heart_rate: vitalsSnapshot.heart_rate,
      spo2: vitalsSnapshot.spo2,
      temperature: vitalsSnapshot.temperature,
      systolic_bp: vitalsSnapshot.systolic_bp,
      diastolic_bp: vitalsSnapshot.diastolic_bp
    }
  };
}

function getSituationDescription(condition) {
  if (!condition) return '';
  const cleanCondition = condition.replace('_', ' ');
  for (const [key, desc] of Object.entries(situationDescriptions)) {
    if (cleanCondition.toLowerCase().includes(key.toLowerCase())) return desc;
  }
  return 'Pattern deviates from normal baseline. Continuous monitoring advised.';
}

export default function PatientDashboard({ userId, onLogout }) {
  const patient = patients.find((p) => p.id === userId) || patients[0];
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // Vitals State for Auto-Update
  const [vitalsHistory, setVitalsHistory] = useState(patient.vitals);
  const [liveVitalsHistory, setLiveVitalsHistory] = useState(patient.vitals);
  const originalLatest = patient.vitals[patient.vitals.length - 1];

  // Main Dashboard - Current Real-time Values
  const [currentHr, setCurrentHr] = useState(originalLatest.hr);
  const [currentSpo2, setCurrentSpo2] = useState(originalLatest.spo2);
  const [currentTemp, setCurrentTemp] = useState(originalLatest.temp);
  const [currentBpSystolic, setCurrentBpSystolic] = useState(116);
  const [currentBpDiastolic, setCurrentBpDiastolic] = useState(72);

  // Interactive Analyzer - Modifiable Values
  const [inputHr, setInputHr] = useState(originalLatest.hr);
  const [inputSpo2, setInputSpo2] = useState(originalLatest.spo2);
  const [inputTemp, setInputTemp] = useState(originalLatest.temp);
  const [inputBpSystolic, setInputBpSystolic] = useState(116);
  const [inputBpDiastolic, setInputBpDiastolic] = useState(72);

  // Dataset Label
  const [datasetLabel, setDatasetLabel] = useState('');

  // Simulation Mode
  const [dataGenerationMode, setDataGenerationMode] = useState('normal');
  const [spikeStartTime, setSpikeStartTime] = useState(null);

  const [trendResult, setTrendResult] = useState(null);
  const [trendExplanation, setTrendExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  // ML Results & Severity Score
  const [mlResult, setMlResult] = useState(null);
  const [severityScore, setSeverityScore] = useState(0);
  const [agentScanLoading, setAgentScanLoading] = useState(false);
  const [agentScanError, setAgentScanError] = useState('');
  const [agentScanResult, setAgentScanResult] = useState(null);
  const [digitalTwinData, setDigitalTwinData] = useState({
    condition: '',
    affected_regions: ['none'],
    vitals: {
      heart_rate: originalLatest.hr,
      spo2: originalLatest.spo2,
      temperature: originalLatest.temp,
      systolic_bp: 116,
      diastolic_bp: 72
    }
  });
  const [trajectoryData, setTrajectoryData] = useState([
    { hour: 0, risk: 45 },
    { hour: 2, risk: 48 },
    { hour: 4, risk: 52 },
    { hour: 6, risk: 55 },
    { hour: 8, risk: 58 },
    { hour: 10, risk: 60 },
    { hour: 12, risk: 62 },
    { hour: 14, risk: 63 },
    { hour: 16, risk: 62 },
    { hour: 18, risk: 60 },
    { hour: 20, risk: 55 },
    { hour: 22, risk: 50 },
    { hour: 24, risk: 45 }
  ]);

  const [appointmentDate, setAppointmentDate] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  });
  const [appointmentEligibility, setAppointmentEligibility] = useState({
    loading: false,
    discharged: false,
    message: ''
  });
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState('');

  // Local Helper: Linear Risk Score (Refined for Continuous Variation with User Weights)
  const calculateLinearRisk = (v) => {
    if (!v) return 0;
    
    // Baselines from user reference
    const n = { hr: 75, spo2: 96, temp: 37, sys: 120 }; 
    const s = { hr: 150, spo2: 75, temp: 42, sys: 165 };

    // Linear Progress (User's logic)
    const hrP = Math.max(0, (v.hr - n.hr) / (s.hr - n.hr));
    const spo2P = Math.max(0, (n.spo2 - v.spo2) / (n.spo2 - s.spo2));
    const tempP = Math.max(0, (v.temp - n.temp) / (s.temp - n.temp));
    const sysP = Math.max(0, ((v.bp_systolic || 120) - n.sys) / (s.sys - n.sys));

    // Weights from user reference
    const weights = { hr: 0.15, spo2: 0.30, temp: 0.40, sys: 0.15 };
    
    // Weighted raw progress
    const weightedProgress = (hrP * weights.hr) + (spo2P * weights.spo2) + (tempP * weights.temp) + (sysP * weights.sys);
    
    // Intensity curve (power of 1.5 stays lower for slight spikes, accelerates as it nears limit)
    const intensity = Math.pow(Math.min(1.0, weightedProgress), 1.5);
    const score = Math.min(100, Math.round(intensity * 100));
    
    // Subtle floor for visibility
    if (score === 0 && (hrP > 0.05 || spo2P > 0.05 || tempP > 0.05 || sysP > 0.05)) return 3;
    
    return score;
  };

  // ++++++++++++++++++++ LOCAL SIMULATION EFFECT ++++++++++++++++++++
  useEffect(() => {
    const timer = setInterval(() => {
      setVitalsHistory(prev => {
        const last = prev[prev.length - 1] || originalLatest; const now = new Date();
        const targets = dataGenerationMode === 'spike' ? { hr: 155, spo2: 75, temp: 42.8, sys: 175, dia: 130 } : { hr: 75, spo2: 96, temp: 37.0, sys: 120, dia: 80 };
        
        // Faster recovery if returning to normal from a spike
        const isRecovering = dataGenerationMode === 'normal' && (last.hr > 85 || last.spo2 < 94 || last.temp > 37.8);
        const deltas = isRecovering 
          ? { hr: 7.0, spo2: 4.5, temp: 0.8, sys: 6.0, dia: 6.0 } 
          : { hr: 3.5, spo2: 2.2, temp: 0.35, sys: 3.0, dia: 3.0 };

        let hrVar = 0, spo2Var = 0, tempVar = 0, sysVar = 0, diaVar = 0;
        if (Math.abs(last.hr - targets.hr) > deltas.hr) hrVar += last.hr < targets.hr ? deltas.hr : -deltas.hr;
        if (Math.abs(last.spo2 - targets.spo2) > deltas.spo2) spo2Var += last.spo2 < targets.spo2 ? deltas.spo2 : -deltas.spo2;
        if (Math.abs(last.temp - targets.temp) > deltas.temp) tempVar += last.temp < targets.temp ? deltas.temp : -deltas.temp;
        if (Math.abs((last.bp_systolic || 120) - targets.sys) > deltas.sys) sysVar += (last.bp_systolic || 120) < targets.sys ? deltas.sys : -deltas.sys;
        if (Math.abs((last.bp_diastolic || 80) - targets.dia) > deltas.dia) diaVar += (last.bp_diastolic || 80) < targets.dia ? deltas.dia : -deltas.dia;
        const t = now.getTime() / 1000;
        const getMeander = (scale) => (Math.sin(t / 12) * scale * 0.6) + (Math.sin(t / 4) * scale * 0.3) + (Math.random() * scale * 0.1);
        hrVar += getMeander(6); spo2Var += getMeander(2.5); tempVar += getMeander(0.7); sysVar += getMeander(6); diaVar += getMeander(5);
        const nextHr = Math.round(Math.max(40, Math.min(220, last.hr + hrVar)));
        const nextSpo2 = Math.round(Math.max(60, Math.min(100, last.spo2 + spo2Var)));
        const nextTemp = parseFloat(Math.max(34, Math.min(43, last.temp + tempVar)).toFixed(2));
        const nextSys = Math.round(Math.max(70, Math.min(240, (last.bp_systolic || 120) + sysVar)));
        const nextDia = Math.round(Math.max(40, Math.min(160, (last.bp_diastolic || 80) + diaVar)));
        const newReading = {
          time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
          hr: nextHr, spo2: nextSpo2, temp: nextTemp, bp_systolic: nextSys, bp_diastolic: nextDia,
          status: (nextHr > 110 || nextSpo2 < 92) ? 'warning' : 'stable'
        };
        setCurrentHr(nextHr); setCurrentSpo2(nextSpo2); setCurrentTemp(nextTemp); setCurrentBpSystolic(nextSys); setCurrentBpDiastolic(nextDia);
        const newHistory = [...prev]; if (newHistory.length > 50) newHistory.shift();
        
        // Trend-Based Range Mapping & Damping (Strictly following Trend-to-Risk Mapping)
        setSeverityScore(prevScore => {
          const trendStr = (trendResult?.trend || 'Stable').toLowerCase();
          let target = prevScore; 
          
          if (trendStr === 'improving') { 
            // Range 40 to 70
            target = 40 + (Math.random() * 30);
          } else if (trendStr.includes('deteriorat') || trendStr.includes('worsening')) { 
            // Range 80 to 100
            target = 80 + (Math.random() * 20);
          } else { 
            // Default: Stable (Range 0 to 30)
            target = Math.random() * 30;
          }
          
          const diff = target - prevScore;
          // Faster damping to satisfy "sudden increase or decrease" concerns but feel smooth
          const maxStep = 20; 
          if (Math.abs(diff) <= maxStep) return Math.round(target);
          return Math.round(prevScore + (diff > 0 ? maxStep : -maxStep));
        });

        return [...newHistory, newReading];
      });
    }, 1500); return () => clearInterval(timer);
  }, [dataGenerationMode]);

  // Interactive Analyzer - Live update with ML
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hrNum = Number(inputHr) || 0;
      const spo2Num = Number(inputSpo2) || 0;
      const tempNum = Number(inputTemp) || 0;

      // Update Interactive Trend Chart
      setLiveVitalsHistory(prev => {
        const newHistory = [...prev];
        const lastIdx = newHistory.length - 1;
        newHistory[lastIdx] = { ...newHistory[lastIdx], hr: hrNum, spo2: spo2Num, temp: tempNum, bp_systolic: Number(inputBpSystolic), bp_diastolic: Number(inputBpDiastolic) };
        return newHistory;
      });

      const payload = {
        heart_rate: hrNum,
        spo2: spo2Num,
        temperature: tempNum,
        systolic_bp: Number(inputBpSystolic),
        diastolic_bp: Number(inputBpDiastolic),
        bp_systolic: Number(inputBpSystolic),
        bp_diastolic: Number(inputBpDiastolic)
      };

      // Fetch Disease Fingerprints (Current Classification)
      try {
        const modelUrls = API_BASES.flatMap((base) => [
          `${base}/fingerprint`,
          `${base}/predict/disease`
        ]);
        const data01 = await postJsonWithFallback(modelUrls, payload);

        let predictedCondition = 'Normal';
        let confidence = 0;
        let allProbabilities = {};
        let chartData = [];

        if (Array.isArray(data01.fingerprints) && data01.fingerprints.length > 0) {
          const sortedFingerprints = [...data01.fingerprints].sort((a, b) => (b.probability || 0) - (a.probability || 0));

          allProbabilities = sortedFingerprints.reduce((acc, fp) => {
            if (fp?.disease) acc[fp.disease] = fp.probability || 0;
            return acc;
          }, {});

          chartData = sortedFingerprints.map(fp => ({
            name: fp.disease.replace('_', ' '),
            Probability: parseFloat(((fp.probability || 0) * 100).toFixed(1))
          })).slice(0, 5);

          predictedCondition = sortedFingerprints[0]?.disease || 'Normal';
          confidence = sortedFingerprints[0]?.probability || 0;
        } else if (data01.all_probabilities && typeof data01.all_probabilities === 'object') {
          allProbabilities = data01.all_probabilities;
          const sortedProbabilities = Object.entries(allProbabilities).sort(([, a], [, b]) => b - a);

          chartData = sortedProbabilities.map(([name, prob]) => ({
            name: name.replace('_', ' '),
            Probability: parseFloat((prob * 100).toFixed(1))
          })).slice(0, 5);

          predictedCondition = data01.predicted_condition || sortedProbabilities[0]?.[0] || 'Normal';
          confidence = typeof data01.confidence === 'number' ? data01.confidence : (sortedProbabilities[0]?.[1] || 0);
        }

        if (Object.keys(allProbabilities).length > 0) {
          setMlResult({
            predicted_condition: predictedCondition,
            confidence,
            chartData,
            all_probabilities: allProbabilities
          });

          const maxProb = Math.max(...Object.values(allProbabilities));
          const currentScore = Math.round(maxProb * 100);
          setSeverityScore(currentScore);

          // Prefer dedicated trajectory endpoint; fallback to EWS-based synthetic trajectory.
          try {
            const trajectoryRes = await postJsonWithFallback(
              API_BASES.map((base) => `${base}/predict/trajectory`),
              payload
            );
            if (trajectoryRes.trajectory && Array.isArray(trajectoryRes.trajectory)) {
              console.log("✓ Trajectory data received:", trajectoryRes.trajectory);
              setTrajectoryData(trajectoryRes.trajectory);
            } else {
              throw new Error('Trajectory payload missing');
            }
          } catch (trajErr) {
            console.log("Trajectory endpoint not available, falling back to EWS", trajErr);
            try {
              const data07 = await postJsonWithFallback(
                API_BASES.map((base) => `${base}/ews`),
                payload
              );
              if (data07.ews) {
                const ewsScore = data07.ews.score;
                const simulatedTrajectory = [];
                for (let hour = 0; hour <= 24; hour++) {
                  let riskValue = currentScore;
                  const isAbnormal = ewsScore > 3;
                  if (isAbnormal) {
                    riskValue = Math.min(currentScore + (hour * 2.5), 95);
                    if (hour > 12) riskValue = Math.max(riskValue - (hour - 12) * 1.2, currentScore);
                  } else {
                    riskValue = Math.max(currentScore - (hour * 1.5), Math.max(0, currentScore - 25));
                  }
                  simulatedTrajectory.push({ hour, risk: Math.round(riskValue) });
                }
                setTrajectoryData(simulatedTrajectory);
              }
            } catch (ewsErr) {
              console.log("EWS trajectory fallback active", ewsErr);
            }
          }
        }
      } catch (err) { console.error("Fingerprint API failed", err); }
      try {
        const sequence = vitalsHistory.slice(-16).map(v => ({ heart_rate: v.hr, spo2: v.spo2, temperature: v.temp, respiratory_rate: 16 }));
        if (sequence.length >= 5) {
          const trendData = await postJsonWithFallback(API_BASES.map(b => `${b}/predict/trend`), { sequence });
          setTrendResult(trendData);
        }
      } catch (err) { console.error("Trend Analysis failed", err); }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputHr, inputSpo2, inputTemp, inputBpSystolic, inputBpDiastolic, vitalsHistory, activeTab]);

  useEffect(() => {
    if (trendResult && trendResult.trend) {
      const fetchExplanation = async () => {
        setExplaining(true);
        try {
          const res = await axios.post('http://localhost:5000/api/explain-trend', { trend: trendResult.trend, confidence: trendResult.confidence, vitals: vitalsHistory[vitalsHistory.length - 1] });
          setTrendExplanation(res.data.explanation);
        } catch (err) { setTrendExplanation(`Vitals show a ${trendResult.trend.toLowerCase()} pattern.`); }
        finally { setExplaining(false); }
      }; fetchExplanation();
    }
  }, [trendResult]);

  const getStoredUsername = () => {
    try {
      const stored = localStorage.getItem('vg_user');
      if (!stored) return '';
      const parsed = JSON.parse(stored);
      return parsed?.username || '';
    } catch (_err) {
      return '';
    }
  };

  const refreshAppointmentData = async () => {
    if (!userId) return;

    setAppointmentLoading(true);
    setAppointmentError('');

    try {
      const username = getStoredUsername();

      const [eligibilityRes, doctorsRes, myRes] = await Promise.all([
        axios.get(`${NODE_API_BASE}/appointments/eligibility/${encodeURIComponent(userId)}`, {
          params: { username }
        }),
        axios.get(`${NODE_API_BASE}/appointments/doctors`, {
          params: {
            date: appointmentDate,
            patientId: userId
          }
        }),
        axios.get(`${NODE_API_BASE}/appointments/my`, {
          params: { patientId: userId }
        })
      ]);

      setAppointmentEligibility({
        loading: false,
        discharged: Boolean(eligibilityRes.data?.discharged),
        message: eligibilityRes.data?.message || ''
      });
      setAvailableDoctors(doctorsRes.data?.doctors || []);
      setMyAppointments(myRes.data?.appointments || []);
    } catch (err) {
      setAppointmentEligibility(prev => ({ ...prev, loading: false }));
      setAppointmentError(err?.response?.data?.message || err?.message || 'Failed to load appointment data.');
    } finally {
      setAppointmentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'appointments') {
      refreshAppointmentData();
    }
  }, [activeTab, appointmentDate, userId]);

  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    setAppointmentError('');
    setAppointmentSuccess('');

    try {
      const username = getStoredUsername();
      const response = await axios.post(`${NODE_API_BASE}/appointments/book`, {
        patientId: userId,
        username,
        doctorId: selectedSlot.doctorId,
        start: selectedSlot.start
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Could not book appointment.');
      }

      setAppointmentSuccess('Appointment booked successfully.');
      setSelectedSlot(null);
      await refreshAppointmentData();
    } catch (err) {
      setAppointmentError(err?.response?.data?.message || err?.message || 'Booking failed.');
    }
  };

  // Keep digital twin vitals in sync with What-If sliders, while preserving agent-derived region/condition.
  useEffect(() => {
    setDigitalTwinData(prev => ({
      ...prev,
      vitals: {
        heart_rate: Number(inputHr) || 0,
        spo2: Number(inputSpo2) || 0,
        temperature: Number(inputTemp) || 0,
        systolic_bp: Number(inputBpSystolic) || 0,
        diastolic_bp: Number(inputBpDiastolic) || 0
      }
    }));
  }, [inputHr, inputSpo2, inputTemp, inputBpSystolic, inputBpDiastolic]);

  const handleRunAgentDebateScan = async () => {
    setAgentScanLoading(true);
    setAgentScanError('');

    const hrNum = Number(inputHr) || 0;
    const spo2Num = Number(inputSpo2) || 0;
    const tempNum = Number(inputTemp) || 0;

    const payload = {
      heart_rate: hrNum,
      spo2: spo2Num,
      temperature: tempNum,
      systolic_bp: Number(inputBpSystolic),
      diastolic_bp: Number(inputBpDiastolic),
      bp_systolic: Number(inputBpSystolic),
      bp_diastolic: Number(inputBpDiastolic),
      ecg_irregularity: Number((Math.min(0.95, Math.max(0.05, severityScore / 100))).toFixed(2))
    };

    const vitalsSnapshot = {
      heart_rate: hrNum,
      spo2: spo2Num,
      temperature: tempNum,
      systolic_bp: Number(inputBpSystolic),
      diastolic_bp: Number(inputBpDiastolic)
    };

    const endpoints = [
      'http://localhost:5000/api/analyze-vitals',
      'http://localhost:8000/api/analyze-vitals'
    ];

    let lastError = 'Agent-debate service is currently unavailable.';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const message = await response.text();
          lastError = message || `Request failed on ${endpoint}`;
          continue;
        }

        const result = await response.json();
        setAgentScanResult(result);
        setDigitalTwinData(buildTwinDataFromAgentResult(result, vitalsSnapshot, mlResult));
        setAgentScanLoading(false);
        return;
      } catch (err) {
        lastError = err?.message || `Could not connect to ${endpoint}`;
      }
    }

    setAgentScanError(lastError);
    setAgentScanLoading(false);
  };

  // Send Dataset Label to Backend
  const handleSaveDatapoint = async (label) => {
    try {
      const savePayload = {
        heart_rate: currentHr,
        spo2: currentSpo2,
        temperature: currentTemp,
        bp_systolic: currentBpSystolic,
        bp_diastolic: currentBpDiastolic,
        label: label,
        patient_id: userId,
        timestamp: new Date().toISOString()
      };

      let saveSucceeded = false;
      let saveError = null;
      for (const base of API_BASES) {
        try {
          await axios.post(`${base}/save-datapoint`, savePayload);
          saveSucceeded = true;
          break;
        } catch (err) {
          saveError = err;
        }
      }

      if (!saveSucceeded) {
        throw saveError || new Error('Save datapoint failed');
      }

      alert(`✅ Datapoint saved as: ${label}`);
      setDatasetLabel('');
    } catch (err) {
      console.error("Save datapoint failed", err);
      alert('❌ Failed to save datapoint');
    }
  };

  const healthMetrics = [
    { title: 'Heart Rate', value: currentHr, unit: 'BPM', icon: '❤️', status: currentHr > 100 ? 'critical' : 'good' },
    { title: 'Temperature', value: currentTemp, unit: '°C', icon: '🌡️', status: currentTemp > 38 ? 'warning' : 'good' },
    { title: 'SpO2', value: currentSpo2, unit: '%', icon: '💨', status: currentSpo2 < 94 ? 'critical' : 'normal' },
    { title: 'Blood Pressure', value: `${currentBpSystolic}/${currentBpDiastolic}`, unit: 'mmHg', icon: '📊', status: currentBpSystolic > 140 ? 'warning' : 'normal' },
  ];

  const doctors = [
    { name: 'Dr. Sarah Chen', specialty: 'Cardiologist', date: '21 Aug', time: '10:00 AM' },
    { name: 'Dr. Rajesh Kumar', specialty: 'Neurologist', date: 'Upcoming' },
    { name: 'Dr. Lisa Wong', specialty: 'Physiologist', date: 'Upcoming' },
  ];

  const formatSlotTime = (isoValue) => {
    const dt = new Date(isoValue);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '24px' }}>💊</div>
          <h1 style={{ margin: 0, color: '#7C3AED', fontSize: '1.5rem', fontWeight: 'bold' }}>Patient Dashboard</h1>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flex: 1 }}>
          {['Dashboard', 'Interactive Analyzer', 'Appointments', 'Settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ background: 'none', border: 'none', color: activeTab === tab.toLowerCase() ? '#7C3AED' : '#999', cursor: 'pointer', fontSize: '0.95rem', padding: '0.5rem 0', borderBottom: activeTab === tab.toLowerCase() ? '2px solid #7C3AED' : 'none', transition: 'all 0.3s' }}>{tab}</button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* ==================== MAIN DASHBOARD ==================== */}
        {activeTab === 'dashboard' ? (
          <M1
            healthMetrics={healthMetrics}
            dataGenerationMode={dataGenerationMode}
            setDataGenerationMode={setDataGenerationMode}
            setSpikeStartTime={setSpikeStartTime}
            vitalsHistory={vitalsHistory}
            severityScore={severityScore}
            trendResult={trendResult}
            trendExplanation={trendExplanation}
            explaining={explaining}
            doctors={doctors}
          />
        ) : activeTab === 'interactive analyzer' ? (
          <>
            {/* ==================== INTERACTIVE ANALYZER ==================== */}
            {/* Real-time Modifiers - What-If Engine */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '2px solid #e9d5ff' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> What-If Engine - Adjust Parameters
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '0.95rem' }}>Modify vital parameters in real-time to simulate different scenarios and see how they affect AI diagnosis and risk assessment instantly.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem' }}>
                {/* HR Modifier */}
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.95rem' }}>❤️ Heart Rate (BPM)</label>
                  <input
                    type="range"
                    min="40"
                    max="150"
                    value={inputHr}
                    onChange={e => setInputHr(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', marginBottom: '0.75rem' }}
                  />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', textAlign: 'center' }}>{inputHr}</div>
                </div>

                {/* SpO2 Modifier */}
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.95rem' }}>💨 SpO₂ (%)</label>
                  <input
                    type="range"
                    min="75"
                    max="100"
                    value={inputSpo2}
                    onChange={e => setInputSpo2(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', marginBottom: '0.75rem' }}
                  />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'center' }}>{inputSpo2}</div>
                </div>

                {/* Temp Modifier */}
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.95rem' }}>🌡️ Temperature (°C)</label>
                  <input
                    type="range"
                    min="36"
                    max="40"
                    step="0.1"
                    value={inputTemp}
                    onChange={e => setInputTemp(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', marginBottom: '0.75rem' }}
                  />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>{inputTemp.toFixed(1)}</div>
                </div>

                {/* BP Modifier */}
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.95rem' }}>📊 Blood Pressure (mmHg)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="range"
                      min="80"
                      max="180"
                      value={inputBpSystolic}
                      onChange={e => setInputBpSystolic(Number(e.target.value))}
                      style={{ cursor: 'pointer' }}
                    />
                    <input
                      type="range"
                      min="40"
                      max="120"
                      value={inputBpDiastolic}
                      onChange={e => setInputBpDiastolic(Number(e.target.value))}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', textAlign: 'center' }}>{inputBpSystolic}/{inputBpDiastolic}</div>
                </div>
              </div>
            </div>

            {/* Digital Twin Visualization */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '2px solid #e9d5ff' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧬</span> Interactive Digital Twin
              </h3>
              <DigitalTwin scanData={digitalTwinData} isScanning={agentScanLoading} />
            </div>

            {/* ML Results */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* ML Current Situation */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📊</span> AI Diagnosis
                </h3>
                {mlResult ? (
                  <div>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#7C3AED', lineHeight: 1, marginBottom: '1rem' }}>{mlResult.predicted_condition.replace('_', ' ')}</div>
                    <p style={{ color: '#666', fontSize: '1rem', margin: '0.8rem 0' }}>Confidence: <strong>{(mlResult.confidence * 100).toFixed(1)}%</strong></p>
                    <div style={{ padding: '1.2rem', backgroundColor: '#f1f5f9', borderRadius: '12px', borderLeft: '5px solid #7C3AED' }}>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>{getSituationDescription(mlResult.predicted_condition)}</p>
                    </div>
                  </div>
                ) : <p style={{ color: '#999' }}>Adjusting modifiers to see predictions...</p>}
              </div>

              {/* Disease Probabilities */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🩺</span> Disease Probabilities
                </h3>
                {mlResult && mlResult.chartData ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={mlResult.chartData} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 11, fontWeight: 500 }} />
                      <Tooltip />
                      <Bar dataKey="Probability" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: '#999' }}>Loading predictions...</p>}
              </div>
            </div>

            {/* Projected Health Risks - Model 01 Based */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> Projected Health Risks (Model 01)
              </h3>

              {mlResult ? (
                <div>
                  {/* Top Risk Conditions */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.1rem', fontWeight: '600' }}>Top Risk Conditions</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {Object.entries(mlResult.all_probabilities || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([condition, prob], idx) => {
                          // Simple condition-based color: Normal=Green, Mild=Yellow, Severe=Red
                          const conditionLower = condition.toLowerCase();
                          let riskColor, riskIcon;

                          if (conditionLower.includes('normal') || conditionLower.includes('stable')) {
                            riskColor = '#10b981';
                            riskIcon = '🟢';
                          } else if (conditionLower.includes('fever') || conditionLower.includes('tachycardia')) {
                            // Mild/moderate conditions
                            riskColor = '#f59e0b';
                            riskIcon = '🟡';
                          } else {
                            // Severe conditions: Hypoxia, Bradycardia, Hypertension, etc.
                            riskColor = '#ef4444';
                            riskIcon = '🔴';
                          }

                          return (
                            <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: `2px solid ${riskColor}`, textAlign: 'center' }}>
                              <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '600', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{condition.replace('_', ' ')}</div>
                              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: riskColor, marginBottom: '0.5rem' }}>{(prob * 100).toFixed(1)}%</div>
                              <div style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>{riskIcon}</div>
                              <div style={{ width: '100%', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${prob * 100}%`, backgroundColor: riskColor, transition: 'width 0.3s ease' }}></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Risk Assessment Insight */}
                  <div style={{ padding: '1.5rem', backgroundColor: severityScore > 70 ? '#fee2e2' : severityScore > 40 ? '#fef3c7' : '#ecfdf5', borderRadius: '12px', borderLeft: `5px solid ${severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981'}`, marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: severityScore > 70 ? '#991b1b' : severityScore > 40 ? '#92400e' : '#065f46' }}>
                      <span>{severityScore > 70 ? '⚠️' : severityScore > 40 ? '⏱️' : '✅'}</span> Risk Assessment
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: severityScore > 70 ? '#991b1b' : severityScore > 40 ? '#92400e' : '#065f46' }}>
                      {severityScore > 70
                        ? `🔴 High Risk Detected: ${mlResult.predicted_condition.replace('_', ' ')} is flagged with high confidence (${severityScore}%). Review vitals immediately and consider medical intervention.`
                        : severityScore > 40
                          ? `🟡 Medium Risk Detected: ${mlResult.predicted_condition.replace('_', ' ')} detected with moderate confidence (${severityScore}%). Continue close monitoring and adjustment of care plan.`
                          : `🟢 Low Risk Detected: ${mlResult.predicted_condition.replace('_', ' ')} detected with standard confidence (${severityScore}%). Patient condition appears stable. routine monitoring recommended.`
                      }
                    </p>
                  </div>

                  {/* Vital Signs Analysis */}
                  <div style={{ backgroundColor: '#f9f9f9', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1rem', fontWeight: '600' }}>📋 Vital Signs Analysis</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>Heart Rate</div>
                        <div style={{ color: '#666' }}>{inputHr} BPM {inputHr > 100 ? '⚠️ Elevated' : inputHr < 60 ? '⚠️ Low' : '✓ Normal'}</div>
                      </div>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>SpO₂</div>
                        <div style={{ color: '#666' }}>{inputSpo2}% {inputSpo2 < 94 ? '⚠️ Low' : '✓ Normal'}</div>
                      </div>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>Temperature</div>
                        <div style={{ color: '#666' }}>{inputTemp}°C {inputTemp > 38 ? '⚠️ Fever' : inputTemp < 36 ? '⚠️ Low' : '✓ Normal'}</div>
                      </div>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>Blood Pressure</div>
                        <div style={{ color: '#666' }}>{inputBpSystolic}/{inputBpDiastolic} mmHg {inputBpSystolic > 140 ? '⚠️ High' : inputBpSystolic < 90 ? '⚠️ Low' : '✓ Normal'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Adjusting modifiers to see health risk assessment...</p>
              )}
            </div>

            {/* AI Health Risk History - Area Chart */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '2px solid #e9d5ff' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#7C3AED', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                <span>📊</span> Real-Time Confidence Tracking (Model 01)
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '0.9rem' }}>24-hour risk forecast based on current vital parameters • Updates as you adjust parameters</p>
              {trajectoryData.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={trajectoryData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                      <defs>
                        <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12, fill: '#666' }}
                        label={{ value: 'Hours Ahead', position: 'insideBottomRight', offset: -15, fontSize: 12, fill: '#7C3AED', fontWeight: '600' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#666' }}
                        label={{ value: 'Risk Score (%)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#7C3AED', fontWeight: '600' }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Risk Score']}
                        labelFormatter={(label) => `${label} hours from now`}
                        contentStyle={{
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          border: '2px solid #7C3AED',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{ color: '#7C3AED', fontWeight: '700' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="risk"
                        stroke="#7C3AED"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorTrajectory)"
                        isAnimationActive={false}
                        dot={{ fill: '#7C3AED', r: 5 }}
                        activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#666' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#7C3AED' }}>Current Risk:</span> {trajectoryData[0]?.risk}%
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: '#7C3AED' }}>24-Hour Peak:</span> {Math.max(...trajectoryData.map(d => d.risk))}%
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: '#7C3AED' }}>Final Status:</span> {trajectoryData[trajectoryData.length - 1]?.risk}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📈</div>
                  <p>Adjusting parameters to see 24-hour risk forecast...</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>The graph updates automatically when you modify vital parameters</p>
                </div>
              )}
            </div>

            {/* Phidata Agent-Debate AI Scan - same style as Doctor Dashboard */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖</span> Live AI Multi-Agent Interaction
                </h3>
                <button
                  onClick={handleRunAgentDebateScan}
                  disabled={agentScanLoading}
                  style={{ padding: '0.6rem 1.2rem', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', cursor: agentScanLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {agentScanLoading ? 'Scanning Patient...' : 'Run Phidata Agent Scan ✨'}
                </button>
              </div>

              {/* Current Vital Signs - Always Visible */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ color: '#64748b', margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Current Vital Signs</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>❤️ Heart Rate</div>
                    <div style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{inputHr} BPM</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>💨 SpO₂</div>
                    <div style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{inputSpo2} %</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>🌡️ Temperature</div>
                    <div style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{inputTemp} °C</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>📊 Blood Pressure</div>
                    <div style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{inputBpSystolic}/{inputBpDiastolic} mmHg</div>
                  </div>
                </div>
              </div>

              {agentScanError && (
                <div style={{ padding: '0.9rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {agentScanError}
                </div>
              )}

              {!agentScanResult && !agentScanLoading && !agentScanError && (
                <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>Run scan to view Monitoring, Diagnosis, Debate, Explanation, Action, and Emergency agent outputs.</p>
              )}

              {agentScanResult && (
                <>
                  <div className="ai-debate" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <h3 style={{ color: '#7C3AED', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                      <span>⚖️</span> Debate AI Response
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                      {[
                        { key: 'monitoring', icon: '📈', color: '#38bdf8', label: 'Monitoring Agent', bg: '#eff6ff', text: agentScanResult.debate?.monitoring_view },
                        { key: 'diagnosis', icon: '🩺', color: '#f472b6', label: 'Diagnosis Agent', bg: '#fdf2f8', text: agentScanResult.debate?.diagnosis_view },
                        { key: 'debate', icon: '⚖️', color: '#c084fc', label: 'Debate Coordinator', bg: '#faf5ff', text: `Consensus reached (Disagreement score: ${agentScanResult.disagreement_score}/10)\n${agentScanResult.debate?.consensus || agentScanResult.consensus}` },
                        { key: 'explanation', icon: '🗣️', color: '#fbbf24', label: 'Explanation Agent', bg: '#fefce8', text: agentScanResult.explanation?.voice_summary || agentScanResult.voice_summary },
                        { key: 'actions', icon: '⚡', color: '#22c55e', label: 'Action Agent', bg: '#f0fdf4', text: (agentScanResult.actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') },
                        { key: 'emergency', icon: '🚨', color: '#ef4444', label: 'Emergency Agent', bg: '#fef2f2', text: `Urgency: ${agentScanResult.emergency?.urgency_note}\nDispatch Alert: ${agentScanResult.emergency?.dispatch_alert ? 'YES ⚠️' : 'NO ✓'}` },
                      ].filter(item => item.text).map(item => (
                        <div key={item.key} style={{ background: item.bg, padding: '1rem 1.2rem', borderRadius: '12px', borderLeft: `4px solid ${item.color}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                            <strong style={{ color: item.color, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {item.label}
                            </strong>
                          </div>
                          <p style={{ color: '#374151', margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Disagreement Score: <strong style={{ color: '#c084fc' }}>{agentScanResult.disagreement_score}/10</strong></span>
                      <span>EWS: <strong style={{ color: agentScanResult.ews?.colour || '#22c55e' }}>{agentScanResult.ews?.level?.toUpperCase()}</strong></span>
                      <span>Emergency Override: <strong style={{ color: agentScanResult.emergency?.dispatch_alert ? '#ef4444' : '#22c55e' }}>{agentScanResult.emergency?.dispatch_alert ? 'YES' : 'NO'}</strong></span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : activeTab === 'appointments' ? (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.25rem' }}>📅 Appointments</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.92rem' }}>
                Booking is enabled only after discharge confirmation. Each slot is 20 minutes, and overlapping appointments are blocked automatically.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>Select Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setSelectedSlot(null);
                    setAppointmentError('');
                    setAppointmentSuccess('');
                  }}
                  style={{ padding: '0.55rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
                <button
                  onClick={refreshAppointmentData}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#7C3AED', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Refresh Slots
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', borderRadius: '10px', backgroundColor: appointmentEligibility.discharged ? '#ecfdf5' : '#fef2f2', border: `1px solid ${appointmentEligibility.discharged ? '#86efac' : '#fecaca'}`, color: appointmentEligibility.discharged ? '#166534' : '#991b1b' }}>
              <strong style={{ display: 'block', marginBottom: '0.4rem' }}>
                {appointmentEligibility.discharged ? 'Discharge Status: Eligible for booking' : 'Discharge Status: Booking locked'}
              </strong>
              <span style={{ fontSize: '0.9rem' }}>
                {appointmentEligibility.message || (appointmentEligibility.discharged ? 'You can now select doctor slots.' : 'Please complete discharge before booking appointments.')}
              </span>
            </div>

            {appointmentError && (
              <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.9rem' }}>
                {appointmentError}
              </div>
            )}

            {appointmentSuccess && (
              <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #86efac', color: '#166534', fontSize: '0.9rem' }}>
                {appointmentSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.05rem' }}>Doctor Slot Timing</h4>

                {appointmentLoading ? (
                  <p style={{ color: '#64748b' }}>Loading slots...</p>
                ) : !availableDoctors.length ? (
                  <p style={{ color: '#64748b' }}>No doctors configured yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {availableDoctors.map((doctor) => (
                      <div key={doctor.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                        <div style={{ marginBottom: '0.8rem' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{doctor.name}</div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{doctor.specialty}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem' }}>
                          {doctor.slots.map((slot) => {
                            const isSelected = selectedSlot && selectedSlot.doctorId === doctor.id && selectedSlot.start === slot.start;
                            const isDisabled = !appointmentEligibility.discharged || !slot.available;
                            return (
                              <button
                                key={`${doctor.id}-${slot.start}`}
                                disabled={isDisabled}
                                onClick={() => {
                                  setSelectedSlot({
                                    doctorId: doctor.id,
                                    doctorName: doctor.name,
                                    specialty: doctor.specialty,
                                    start: slot.start,
                                    end: slot.end
                                  });
                                  setAppointmentError('');
                                  setAppointmentSuccess('');
                                }}
                                style={{
                                  borderRadius: '8px',
                                  border: isSelected ? '2px solid #7C3AED' : '1px solid #cbd5e1',
                                  backgroundColor: isSelected ? '#f3e8ff' : slot.available ? '#fff' : '#f1f5f9',
                                  color: slot.available ? '#1e293b' : '#94a3b8',
                                  padding: '0.55rem 0.45rem',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                                }}
                                title={slot.available ? 'Available' : (slot.reason === 'patient-overlap' ? 'Conflicts with your existing appointment' : 'Already booked')}
                              >
                                {formatSlotTime(slot.start)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', color: '#7C3AED', fontSize: '1rem' }}>Selected Slot</h4>
                  {selectedSlot ? (
                    <>
                      <p style={{ margin: '0.2rem 0', color: '#1e293b', fontWeight: 700 }}>{selectedSlot.doctorName}</p>
                      <p style={{ margin: '0.2rem 0', color: '#64748b', fontSize: '0.85rem' }}>{selectedSlot.specialty}</p>
                      <p style={{ margin: '0.2rem 0', color: '#334155', fontSize: '0.85rem' }}>
                        {new Date(selectedSlot.start).toLocaleDateString()} • {formatSlotTime(selectedSlot.start)} - {formatSlotTime(selectedSlot.end)}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Pick an available 20-minute slot.</p>
                  )}

                  <button
                    onClick={handleBookAppointment}
                    disabled={!selectedSlot || !appointmentEligibility.discharged || appointmentLoading}
                    style={{
                      width: '100%',
                      marginTop: '0.9rem',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: (!selectedSlot || !appointmentEligibility.discharged || appointmentLoading) ? '#cbd5e1' : '#7C3AED',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: (!selectedSlot || !appointmentEligibility.discharged || appointmentLoading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Book Appointment
                  </button>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', color: '#7C3AED', fontSize: '1rem' }}>My Appointments</h4>
                  {!myAppointments.length ? (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>No appointments booked yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '320px', overflowY: 'auto' }}>
                      {myAppointments.map((appt) => (
                        <div key={appt.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{appt.doctorName}</div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.25rem' }}>{appt.specialty}</div>
                          <div style={{ color: '#334155', fontSize: '0.8rem' }}>
                            {new Date(appt.start).toLocaleDateString()} • {formatSlotTime(appt.start)} - {formatSlotTime(appt.end)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
            <h2 style={{ color: '#7C3AED' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
            <p style={{ color: '#666' }}>This section is currently under development to bring you a better care experience.</p>
          </div>
        )}
      </main>
    </div>
  );
}

