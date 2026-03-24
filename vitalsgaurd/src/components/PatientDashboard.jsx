import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { patients } from '../data/mockVitals';
import DigitalTwin from './DigitalTwin';
import CommonSettingsPage from './CommonSettingsPage';
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
    } catch (err) { lastError = err?.message || `Could not connect to ${url}`; }
  }
  throw new Error(lastError);
}

function deriveRegionFromVitals(vitalsSnapshot) {
  const hr = Number(vitalsSnapshot?.heart_rate) || 0;
  const spo2 = Number(vitalsSnapshot?.spo2) || 0;
  const temp = Number(vitalsSnapshot?.temperature) || 0;
  const sys = Number(vitalsSnapshot?.systolic_bp) || 0;
  const hrAbnormal = hr < 50 || hr > 130;
  const spo2Abnormal = spo2 < 92;
  const tempAbnormal = temp < 35.5 || temp > 39;
  const bpAbnormal = sys < 80 || sys > 160;
  if (spo2Abnormal && !tempAbnormal && !bpAbnormal) return 'lungs';
  if (tempAbnormal && !spo2Abnormal && !hrAbnormal) return 'body';
  if (hrAbnormal || bpAbnormal) return 'heart';
  if (spo2Abnormal) return 'lungs';
  if (tempAbnormal) return 'body';
  return 'heart';
}

function deriveRegionFromAgentAnswer(agentResult, fallbackCondition = '', vitalsSnapshot = {}) {
  if (Array.isArray(agentResult?.affected_regions) && agentResult.affected_regions.length > 0) {
    const region = agentResult.affected_regions[0];
    if (['heart', 'lungs', 'body', 'brain'].includes(region)) return region;
  }
  const combinedText = [
    agentResult?.condition, agentResult?.ui_label, agentResult?.consensus, agentResult?.voice_summary,
    agentResult?.debate?.monitoring_view, agentResult?.debate?.diagnosis_view,
    agentResult?.debate?.consensus, agentResult?.explanation?.voice_summary,
    agentResult?.emergency?.urgency_note, ...(agentResult?.actions || [])
  ].filter(Boolean).join(' ').toLowerCase();
  const baseline = (fallbackCondition || '').toLowerCase();
  const text = `${combinedText} ${baseline}`;
  if (text.includes('brain') || text.includes('neuro') || text.includes('seizure') || text.includes('stroke') || text.includes('cns')) return 'brain';
  if (text.includes('lung') || text.includes('pulmonary') || text.includes('respiratory') || text.includes('hypox') || text.includes('spo2') || text.includes('oxygen') || text.includes('breath')) return 'lungs';
  if (text.includes('fever') || text.includes('sepsis') || text.includes('temperature') || text.includes('systemic') || text.includes('thermal') || text.includes('infection')) return 'body';
  if (text.includes('heart') || text.includes('cardiac') || text.includes('tachy') || text.includes('brady') || text.includes('cardia') || text.includes('arrhythm') || text.includes('cardiovascular') || text.includes('hypertension') || text.includes('hypotension')) return 'heart';
  return deriveRegionFromVitals(vitalsSnapshot);
}

function buildTwinDataFromAgentResult(agentResult, vitalsSnapshot, mlResult) {
  const fallbackCondition = mlResult?.predicted_condition || 'normal';
  const region = deriveRegionFromAgentAnswer(agentResult, fallbackCondition, vitalsSnapshot);
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

export default function PatientDashboard({ userId, onLogout }) {
  const fallbackVitals = [{ time: '00:00', hr: 75, spo2: 98, temp: 36.8, bp_systolic: 120, bp_diastolic: 80, status: 'stable' }];
  const patient = patients.find((p) => p.id === userId) || patients[0];
  const safeInitialVitals = Array.isArray(patient.vitals) && patient.vitals.length > 0 ? patient.vitals : fallbackVitals;

  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // Vitals State for Auto-Update (LOCAL SIM logic)
  const [vitalsHistory, setVitalsHistory] = useState(safeInitialVitals);
  const [liveVitalsHistory, setLiveVitalsHistory] = useState(safeInitialVitals);
  const originalLatest = safeInitialVitals[safeInitialVitals.length - 1];

  // Main Dashboard Readings
  const [currentHr, setCurrentHr] = useState(originalLatest.hr);
  const [currentSpo2, setCurrentSpo2] = useState(originalLatest.spo2);
  const [currentTemp, setCurrentTemp] = useState(originalLatest.temp);
  const [currentBpSystolic, setCurrentBpSystolic] = useState(120);
  const [currentBpDiastolic, setCurrentBpDiastolic] = useState(80);

  // Interactive Analyzer Modifiers
  const [inputHr, setInputHr] = useState(originalLatest.hr);
  const [inputSpo2, setInputSpo2] = useState(originalLatest.spo2);
  const [inputTemp, setInputTemp] = useState(originalLatest.temp);
  const [inputBpSystolic, setInputBpSystolic] = useState(120);
  const [inputBpDiastolic, setInputBpDiastolic] = useState(80);

  // Simulation Mode
  const [dataGenerationMode, setDataGenerationMode] = useState('normal');
  const [spikeStartTime, setSpikeStartTime] = useState(null);

  const [trendResult, setTrendResult] = useState(null);
  const [trendExplanation, setTrendExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  // Agent Result & Digital Twin
  const [mlResult, setMlResult] = useState(null);
  const [severityScore, setSeverityScore] = useState(0);
  const [agentScanLoading, setAgentScanLoading] = useState(false);
  const [reportScanLoading, setReportScanLoading] = useState(false);
  const [agentScanError, setAgentScanError] = useState('');
  const [agentScanResult, setAgentScanResult] = useState(null);
  const [digitalTwinData, setDigitalTwinData] = useState({
    condition: '', affected_regions: ['none'],
    vitals: { heart_rate: originalLatest.hr, spo2: originalLatest.spo2, temperature: originalLatest.temp, systolic_bp: 120, diastolic_bp: 80 }
  });

  // Uploaded Report State (Preserved Original Feature)
  const [uploadedReportPreview, setUploadedReportPreview] = useState(null);
  const [uploadedReportBase64, setUploadedReportBase64] = useState(null);

  // Keep digital twin in sync with interactive sliders
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

  // Appointment State
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [appointmentEligibility, setAppointmentEligibility] = useState({ loading: false, discharged: false, message: '' });
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState('');

  // Local Helper: Linear Risk Score
  const calculateLinearRisk = (v) => {
    if (!v) return 0;
    const n = { hr: 75, spo2: 96, temp: 37, sys: 120 }; const s = { hr: 150, spo2: 75, temp: 42, sys: 165 };
    const hrP = Math.max(0, (v.hr - n.hr) / (s.hr - n.hr));
    const spo2P = Math.max(0, (n.spo2 - v.spo2) / (n.spo2 - s.spo2));
    const tempP = Math.max(0, (v.temp - n.temp) / (s.temp - n.temp));
    const sysP = Math.max(0, ((v.bp_systolic || 120) - n.sys) / (s.sys - n.sys));
    const weights = { hr: 0.15, spo2: 0.30, temp: 0.40, sys: 0.15 };
    const weightedProgress = (hrP * weights.hr) + (spo2P * weights.spo2) + (tempP * weights.temp) + (sysP * weights.sys);
    return Math.min(100, Math.max(0, Math.round(weightedProgress * 100)));
  };

  // ++++++++++++++++++++ LOCAL SIMULATION EFFECT ++++++++++++++++++++
  useEffect(() => {
    const timer = setInterval(() => {
      setVitalsHistory(prev => {
        const last = prev[prev.length - 1] || originalLatest; const now = new Date();
        const targets = dataGenerationMode === 'spike' ? { hr: 150, spo2: 75, temp: 42.0, sys: 165, dia: 125 } : { hr: 75, spo2: 96, temp: 37.0, sys: 120, dia: 80 };
        const deltas = { hr: 3.5, spo2: 2.2, temp: 0.35, sys: 3.0, dia: 3.0 };
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
        setSeverityScore(calculateLinearRisk(newReading)); return [...newHistory, newReading];
      });
    }, 1500); return () => clearInterval(timer);
  }, [dataGenerationMode]);

  // ++++++++++++++++++++ ML & TREND ANALYSIS EFFECT ++++++++++++++++++++
  useEffect(() => {
    const timer = setTimeout(async () => {
      const isLive = activeTab === 'dashboard';
      const last = vitalsHistory[vitalsHistory.length - 1];
      const payload = {
        heart_rate: isLive ? (last?.hr || 0) : Number(inputHr), spo2: isLive ? (last?.spo2 || 0) : Number(inputSpo2),
        temperature: isLive ? (last?.temp || 0) : Number(inputTemp), systolic_bp: isLive ? (last?.bp_systolic || 120) : Number(inputBpSystolic),
        diastolic_bp: isLive ? (last?.bp_diastolic || 80) : Number(inputBpDiastolic)
      };
      setLiveVitalsHistory(prev => {
        const newHistory = [...prev]; const lastIdx = newHistory.length - 1;
        newHistory[lastIdx] = { ...newHistory[lastIdx], hr: Number(inputHr), spo2: Number(inputSpo2), temp: Number(inputTemp), bp_systolic: Number(inputBpSystolic), bp_diastolic: Number(inputBpDiastolic) };
        return newHistory;
      });
      try {
        const data01 = await postJsonWithFallback(API_BASES.map(b => `${b}/predict/disease`), payload);
        if (data01.all_probabilities) {
          const sorted = Object.entries(data01.all_probabilities).sort(([, a], [, b]) => b - a);
          setMlResult({
            predicted_condition: data01.predicted_condition || sorted[0][0], confidence: data01.confidence || sorted[0][1],
            chartData: sorted.map(([name, prob]) => ({ name: name.replace('_', ' '), Probability: (prob * 100).toFixed(1) })).slice(0, 5),
            all_probabilities: data01.all_probabilities
          });
        }
      } catch (err) { console.error("ML Prediction failed", err); }
      try {
        const sequence = vitalsHistory.slice(-16).map(v => ({ heart_rate: v.hr, spo2: v.spo2, temperature: v.temp, respiratory_rate: 16 }));
        if (sequence.length >= 5) {
          const trendData = await postJsonWithFallback(API_BASES.map(b => `${b}/predict/trend`), { sequence });
          setTrendResult(trendData);
        }
      } catch (err) { console.error("Trend Analysis failed", err); }
    }, 400); return () => clearTimeout(timer);
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

  const handleRunAgentDebateScan = async (isReportMode = false) => {
    if (isReportMode) setReportScanLoading(true);
    else setAgentScanLoading(true);
    setAgentScanError('');

    const hrNum = Number(inputHr) || 0; const spo2Num = Number(inputSpo2) || 0; const tempNum = Number(inputTemp) || 0;
    const payload = {
      heart_rate: hrNum, spo2: spo2Num, temperature: tempNum, systolic_bp: Number(inputBpSystolic), diastolic_bp: Number(inputBpDiastolic),
      bp_systolic: Number(inputBpSystolic), bp_diastolic: Number(inputBpDiastolic),
      ecg_irregularity: Number((Math.min(0.95, Math.max(0.05, severityScore / 100))).toFixed(2)),
      report_image: isReportMode ? uploadedReportBase64 : null // Only send image if specifically requested in report mode
    };
    const vitalsSnapshot = { heart_rate: hrNum, spo2: spo2Num, temperature: tempNum, systolic_bp: Number(inputBpSystolic), diastolic_bp: Number(inputBpDiastolic) };
    try {
      const result = await postJsonWithFallback(API_BASES.map(b => `${b}/analyze-vitals`), payload);
      setAgentScanResult(result);
      setDigitalTwinData(buildTwinDataFromAgentResult(result, vitalsSnapshot, mlResult));
    } catch (err) { setAgentScanError(err.message); }
    finally {
      if (isReportMode) setReportScanLoading(false);
      else setAgentScanLoading(false);
    }
  };

  const getStoredUsername = () => { try { const stored = localStorage.getItem('vg_user'); return stored ? JSON.parse(stored)?.username : ''; } catch { return ''; } };

  const refreshAppointmentData = async () => {
    if (!userId) return; setAppointmentLoading(true); setAppointmentError('');
    try {
      const username = getStoredUsername();
      const [eligRes, docsRes, myRes] = await Promise.all([
        axios.get(`${NODE_API_BASE}/appointments/eligibility/${encodeURIComponent(userId)}`, { params: { username } }),
        axios.get(`${NODE_API_BASE}/appointments/doctors`, { params: { date: appointmentDate, patientId: userId } }),
        axios.get(`${NODE_API_BASE}/appointments/my`, { params: { patientId: userId } })
      ]);
      setAppointmentEligibility({ loading: false, discharged: Boolean(eligRes.data?.discharged), message: eligRes.data?.message || '' });
      setAvailableDoctors(docsRes.data?.doctors || []); setMyAppointments(myRes.data?.appointments || []);
    } catch (err) { setAppointmentError('Failed to load appointment data.'); }
    finally { setAppointmentLoading(false); }
  };

  useEffect(() => { if (activeTab === 'appointments') refreshAppointmentData(); }, [activeTab, appointmentDate, userId]);

  const handleBookAppointment = async () => {
    if (!selectedSlot) return; setAppointmentError(''); setAppointmentSuccess('');
    try {
      const res = await axios.post(`${NODE_API_BASE}/appointments/book`, { patientId: userId, username: getStoredUsername(), doctorId: selectedSlot.doctorId, start: selectedSlot.start });
      if (!res.data?.success) throw new Error(res.data?.message || 'Booking failed.');
      setAppointmentSuccess('Appointment booked successfully.'); setSelectedSlot(null); await refreshAppointmentData();
    } catch (err) { setAppointmentError(err.message); }
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

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ fontSize: '24px' }}>💊</div><h1 style={{ margin: 0, color: '#7C3AED', fontSize: '1.5rem', fontWeight: 'bold' }}>Patient Dashboard</h1></div>
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flex: 1 }}>
          {['Dashboard', 'Interactive Analyzer', 'Report Analysis', 'Appointments', 'Settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ background: 'none', border: 'none', color: activeTab === tab.toLowerCase() ? '#7C3AED' : '#999', cursor: 'pointer', fontSize: '0.95rem', padding: '0.5rem 0', borderBottom: activeTab === tab.toLowerCase() ? '2px solid #7C3AED' : 'none', transition: 'all 0.3s' }}>{tab}</button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'dashboard' ? (
          <M1
            healthMetrics={healthMetrics} dataGenerationMode={dataGenerationMode} setDataGenerationMode={setDataGenerationMode}
            setSpikeStartTime={setSpikeStartTime} vitalsHistory={vitalsHistory} severityScore={severityScore}
            trendResult={trendResult} trendExplanation={trendExplanation} explaining={explaining} doctors={doctors}
          />
        ) : activeTab === 'interactive analyzer' ? (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '2px solid #e9d5ff' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🎯</span> What-If Engine - Adjust Parameters</h3>
              <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '0.95rem' }}>Modify vital parameters in real-time to simulate scenarios and see instant AI assessment.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem' }}>
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.9rem' }}>❤️ Heart Rate (BPM)</label>
                  <input type="range" min="40" max="150" value={inputHr} onChange={e => setInputHr(Number(e.target.value))} style={{ width: '100%', accentColor: '#ef4444' }} />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', textAlign: 'center' }}>{inputHr}</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.9rem' }}>✨ SpO₂ (%)</label>
                  <input type="range" min="75" max="100" value={inputSpo2} onChange={e => setInputSpo2(Number(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'center' }}>{inputSpo2}</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.9rem' }}>🌡️ Temperature (°C)</label>
                  <input type="range" min="36" max="40" step="0.1" value={inputTemp} onChange={e => setInputTemp(Number(e.target.value))} style={{ width: '100%', accentColor: '#f59e0b' }} />
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>{inputTemp}</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '700', fontSize: '0.9rem' }}>📊 Blood Pressure (mmHg)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="range" min="80" max="180" value={inputBpSystolic} onChange={e => setInputBpSystolic(Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
                    <input type="range" min="50" max="120" value={inputBpDiastolic} onChange={e => setInputBpDiastolic(Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', textAlign: 'center' }}>{inputBpSystolic}/{inputBpDiastolic}</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '2px solid #e9d5ff' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🧬</span> Interactive Digital Twin</h3>
              <DigitalTwin scanData={digitalTwinData} isScanning={agentScanLoading} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e9d5ff' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem' }}>🩺 AI Diagnosis</h3>
                {mlResult ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: '900', color: '#7C3AED' }}>{mlResult.predicted_condition}</div>
                    <div style={{ fontSize: '1rem', color: '#64748b' }}>Confidence: {(mlResult.confidence * 100).toFixed(1)}%</div>
                  </div>
                ) : <p style={{ color: '#999', textAlign: 'center' }}>Analyzing parameters...</p>}
              </div>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e9d5ff' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem' }}>🩺 Disease Probabilities</h3>
                {mlResult ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart layout="vertical" data={mlResult.chartData}>
                      <XAxis type="number" hide /> <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip /> <Bar dataKey="Probability" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: '#999', textAlign: 'center' }}>Waiting for data...</p>}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#7C3AED', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}><span>📊</span> Real-Time Risk Tracking (Model 01)</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Visualizing the statistical intersection of vital anomalies over time.</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={liveVitalsHistory}>
                  <defs><linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /> <XAxis dataKey="time" hide /> <YAxis domain={[0, 100]} />
                  <Tooltip /> <Area type="monotone" dataKey="hr" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRisk)" name="Risk Profile Index" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🤖</span> Live AI Multi-Agent Scan</h3>
                <button 
                  onClick={() => handleRunAgentDebateScan(false)} 
                  disabled={agentScanLoading} 
                  style={{ 
                    padding: '0.6rem 1.2rem', 
                    backgroundColor: agentScanLoading ? '#94a3b8' : '#7C3AED', 
                    color: 'white', border: 'none', borderRadius: '8px', 
                    cursor: agentScanLoading ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold', minWidth: '200px', transition: 'all 0.3s' 
                  }}
                >
                  {agentScanLoading ? '🔄 Scanning Live Vitals...' : 'Run Phidata Agent Scan ✨'}
                </button>
              </div>
              {agentScanError && <div style={{ padding: '0.9rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '1rem' }}>{agentScanError}</div>}
              {agentScanResult && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {[
                      { key: 'monitoring', icon: '📈', color: '#38bdf8', label: 'Monitor', text: agentScanResult.debate?.monitoring_view },
                      { key: 'diagnosis', icon: '🩺', color: '#f472b6', label: 'Diagnosis', text: agentScanResult.debate?.diagnosis_view },
                      { key: 'debate', icon: '⚖️', color: '#c084fc', label: 'Consensus', text: agentScanResult.debate?.consensus || agentScanResult.consensus },
                      { key: 'emergency', icon: '🚨', color: '#ef4444', label: 'Emergency', text: agentScanResult.emergency?.urgency_note }
                    ].filter(i => i.text).map(i => (
                      <div key={i.key} style={{ background: 'white', padding: '1rem', borderRadius: '12px', borderLeft: `4px solid ${i.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}><strong>{i.icon} {i.label}</strong></div>
                        <p style={{ color: '#374151', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{i.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'report analysis' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📄</span> Upload Medical Report</h3>
                <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Upload high-resolution report images for AI comparison.</p>
                <div style={{ padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => document.getElementById('report-input').click()}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📤</div>
                  <strong>Click to Upload Report</strong>
                  <input id="report-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]; setUploadedReportPreview(URL.createObjectURL(file));
                      const reader = new FileReader(); reader.onloadend = () => setUploadedReportBase64(reader.result.replace(/^data:image\/[a-z]+;base64,/, ""));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                {uploadedReportPreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={uploadedReportPreview} alt="Report Preview" style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    <button 
                      onClick={() => handleRunAgentDebateScan(true)}
                      disabled={reportScanLoading}
                      style={{ 
                        width: '100%', marginTop: '1rem', padding: '1rem', 
                        backgroundColor: '#7C3AED', color: 'white', border: 'none', 
                        borderRadius: '8px', cursor: reportScanLoading ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' 
                      }}
                    >
                      {reportScanLoading ? '🔄 AI Analyzing Report...' : '🔍 Analyze & Compare Report'}
                    </button>
                    {agentScanError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>{agentScanError}</p>}
                  </div>
                )}
              </div>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>⚖️</span> AI Analysis Summary</h3>
                {agentScanResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {[
                      { key: 'monitoring', icon: '📈', color: '#38bdf8', label: 'Monitor', text: agentScanResult.debate?.monitoring_view },
                      { key: 'diagnosis', icon: '🩺', color: '#f472b6', label: 'Diagnosis', text: agentScanResult.debate?.diagnosis_view },
                      { key: 'consensus', icon: '⚖️', color: '#c084fc', label: 'Consensus', text: agentScanResult.debate?.consensus || agentScanResult.consensus },
                      { key: 'emergency', icon: '🚨', color: '#ef4444', label: 'Emergency', text: agentScanResult.emergency?.urgency_note }
                    ].filter(i => i.text).map(i => (
                      <div key={i.key} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', borderLeft: `4px solid ${i.color}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem', color: i.color, fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          <span>{i.icon}</span> {i.label}
                        </div>
                        <p style={{ color: '#1e293b', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{i.text}</p>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: '#999', textAlign: 'center', marginTop: '4rem' }}>No AI Analysis yet. {uploadedReportPreview ? 'Click "Analyze & Compare Report" above.' : 'Upload a report to begin.'}</p>}
              </div>
            </div>
            {agentScanResult?.report_analyzed && agentScanResult.comparison && (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #7C3AED' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🧠</span> Insight Correlation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', borderRadius: '12px', color: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.9 }}>Match Score</div>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{agentScanResult.comparison.correlation_score}%</div>
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#1e293b' }}>{agentScanResult.comparison.summary}</div>
                </div>
              </div>
            )}
            {!agentScanResult?.report_analyzed && uploadedReportPreview && !reportScanLoading && (
               <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                 <p style={{ color: '#64748b', margin: 0 }}>Report uploaded but not yet cross-referenced with AI vitals. Click <strong>Analyze & Compare</strong> to generate correlation score.</p>
               </div>
            )}
          </>
        ) : activeTab === 'appointments' ? (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.25rem' }}>📅 Appointments</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <button onClick={refreshAppointmentData} style={{ padding: '0.6rem 1.2rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Refresh</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h4 style={{ color: '#7C3AED' }}>Available Doctors</h4>
                {availableDoctors.map(doc => (
                  <div key={doc.id} style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{doc.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{doc.specialty}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {doc.slots.map(s => (
                        <button key={s.start} disabled={!s.available} onClick={() => setSelectedSlot({ ...s, doctorId: doc.id, doctorName: doc.name })} style={{ padding: '4px 8px', fontSize: '0.7rem', background: s.available ? '#f3f4f6' : '#eee', border: 'none', borderRadius: '4px' }}>
                          {new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h4 style={{ color: '#7C3AED' }}>Booking Confirmation</h4>
                {selectedSlot ? (
                  <div>
                    <p>Booking with <strong>{selectedSlot.doctorName}</strong></p>
                    <p>{new Date(selectedSlot.start).toLocaleString()}</p>
                    <button onClick={handleBookAppointment} style={{ width: '100%', padding: '0.8rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', marginTop: '1rem' }}>Confirm Booking</button>
                  </div>
                ) : <p style={{ color: '#999' }}>Select a slot...</p>}
                {appointmentSuccess && <p style={{ color: '#10b981', marginTop: '1rem' }}>{appointmentSuccess}</p>}
                {appointmentError && <p style={{ color: '#ef4444', marginTop: '1rem' }}>{appointmentError}</p>}
              </div>
            </div>
          </>
        ) : activeTab === 'settings' ? (
          <CommonSettingsPage role="patient" onBack={() => setActiveTab('dashboard')} />
        ) : null}
      </main>
    </div>
  );
}
