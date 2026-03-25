import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { HeartPulse, User, Stethoscope, Shield, LogOut, Activity, Plus, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { patients } from '../data/mockVitals';
import DigitalTwin from './DigitalTwin';
import M1 from './m1';

const API_BASES = ['http://localhost:5000/api', 'http://localhost:8000/api'];
const NODE_API_BASE = 'http://localhost:5003';

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function mixRgb(a, b, t) {
  const tt = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * tt),
    Math.round(a[1] + (b[1] - a[1]) * tt),
    Math.round(a[2] + (b[2] - a[2]) * tt),
  ];
}

function rgbToCss(rgb) {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

function ElegantShape({
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "linear-gradient(135deg, rgba(247,167,192,0.48), rgba(255,192,203,0.34), rgba(255,255,255,0.24))",
  style,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -120, rotate: rotate - 12 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.1 },
      }}
      style={{ position: "absolute", ...style }}
    >
      <motion.div
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height, position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: gradient,
            border: "1.5px solid rgba(255,255,255,0.72)",
            boxShadow: "0 34px 90px rgba(247,167,192,0.3)",
            backdropFilter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.56), rgba(255,192,203,0.18) 42%, transparent 70%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

const BorderRotate = ({
  children,
  className = '',
  animationMode = 'auto-rotate',
  animationSpeed = 8,
  gradientColors = { primary: '#fbcfe8', secondary: '#fff1f2', accent: '#f9a8d4' },
  backgroundColor = 'rgba(255, 255, 255, 0.95)',
  borderWidth = 1.5,
  borderRadius = 24,
  style = {},
  ...props
}) => {
  return (
    <div 
      className={`border-rotate-wrapper ${className}`} 
      style={{
        '--border-width': `${borderWidth}px`,
        '--border-radius': `${borderRadius}px`,
        '--animation-duration': `${animationSpeed}s`,
        '--primary': gradientColors.primary,
        '--secondary': gradientColors.secondary,
        '--accent': gradientColors.accent,
        position: 'relative',
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        overflow: 'hidden',
        display: 'flex',
        ...style
      }}
      {...props}
    >
      {/* Rotating Border Layer */}
      <div style={{
        position: 'absolute',
        inset: '-100%',
        background: `conic-gradient(from 0deg, var(--primary), var(--secondary), var(--accent), var(--secondary), var(--primary))`,
        animation: `rotate-border var(--animation-duration) linear infinite`,
        zIndex: 0
      }} />
      <div style={{ 
        position: 'relative',
        background: backgroundColor, 
        borderRadius: `calc(${borderRadius}px - ${borderWidth}px)`,
        height: '100%',
        width: '100%',
        backdropFilter: 'blur(12px)',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>
    </div>
  );
};

function MetalButton({
  children,
  className,
  accentRgb = [244, 114, 182],
  variant = 'primary',
  active = false,
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const baseColor = `rgb(${accentRgb.join(',')})`;
  const hi = mixRgb(accentRgb, [255, 255, 255], 0.35);
  const baseBg = variant === 'primary' 
    ? `linear-gradient(135deg, rgba(${rgbToCss(hi)}, 1), rgba(${rgbToCss(accentRgb)}, 1))`
    : 'rgba(255, 255, 255, 0.7)';

  return (
    <motion.button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98, translateY: 0 }}
      className={cn("metal-btn", className)}
      style={{
        position: 'relative',
        padding: '12px 24px',
        borderRadius: '14px',
        border: variant === 'outline' ? `1px solid rgba(${accentRgb.join(',')}, 0.3)` : 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontWeight: '700',
        color: '#0f172a',
        boxShadow: hovered 
          ? `0 10px 25px rgba(${accentRgb.join(',')}, 0.2)` 
          : `0 4px 12px rgba(0,0,0,0.05)`,
        background: baseBg,
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
        ...props.style
      }}
      {...props}
    >
      {/* Dynamic Bubble Gradient Layer */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2.5, opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(${accentRgb.join(',')}, 0.4) 50%, transparent 100%)`,
              left: '50%',
              top: '50%',
              marginLeft: '-60px',
              marginTop: '-60px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
      </span>
    </motion.button>
  );
}

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
  
  // Report Analysis State
  const [reportImage, setReportImage] = useState(null);
  const [reportFileName, setReportFileName] = useState('');
  const [reportResult, setReportResult] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Local Helper: Linear Risk Score (Refined for Continuous Variation with User Weights)
  const calculateLinearRisk = (v) => {
    if (!v) return 0;

    // Clinical Baselines (Normal vs Severe)
    const n = { hr: 70, spo2: 98, temp: 37, sys: 120 }; 
    const s = { hr: 130, spo2: 85, temp: 40, sys: 160 };

    // Calculate Progress for each vital (0 to 1+)
    const hrP = Math.max(0, (v.hr - n.hr) / (s.hr - n.hr));
    const spo2P = Math.max(0, (n.spo2 - v.spo2) / (n.spo2 - s.spo2));
    const tempP = Math.max(0, (v.temp - n.temp) / (s.temp - n.temp));
    const sysP = Math.max(0, ((v.bp_systolic || 120) - n.sys) / (s.sys - n.sys));

    // Increase weights for life-critical indicators (SpO2 and Temp)
    const weights = { hr: 0.20, spo2: 0.45, temp: 0.25, sys: 0.10 };
    
    // Raw weighted progress
    const rawProgress = (hrP * weights.hr) + (spo2P * weights.spo2) + (tempP * weights.temp) + (sysP * weights.sys);
    
    // Use an aggressive scaling to ensure severe values reach 90-100% quickly
    const score = Math.round(rawProgress * 100);
    
    // Safety check: If SpO2 is below 88%, it's an automatic high risk regardless of others
    const finalScore = v.spo2 < 88 ? Math.max(score, 85 + (88 - v.spo2) * 2) : score;
    
    // Subtle floor for visibility
    if (finalScore === 0 && (hrP > 0.05 || spo2P > 0.05 || tempP > 0.05 || sysP > 0.05)) return 3;
    
    return Math.min(100, Math.max(0, finalScore));
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

        // Update Severity Score using real-time Linear Risk Calculation
        setSeverityScore(calculateLinearRisk(newReading));

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
          // PREVENT CONFLICT: severityScore is now exclusively driven by calculateLinearRisk in the 1500ms loop.

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
    setAppointmentSuccess('');
    setSelectedSlot(null);
    setAvailableDoctors([]); // Force UI reset for fresh data

    try {
      const username = getStoredUsername();
      const timestamp = Date.now(); // Cache busting
      // Fetch eligibility and available slots

      const [eligibilityRes, doctorsRes, myRes] = await Promise.all([
        axios.get(`${NODE_API_BASE}/appointments/eligibility/${encodeURIComponent(userId)}`, {
          params: { username, _t: timestamp }
        }),
        axios.get(`${NODE_API_BASE}/appointments/doctors`, {
          params: {
            date: appointmentDate,
            patientId: userId,
            _t: timestamp
          }
        }),
        axios.get(`${NODE_API_BASE}/appointments/my`, {
          params: { patientId: userId, _t: timestamp }
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

  const handleReportUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setReportFileName(file.name);
    setReportResult(null);
    setReportError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      // Extract only the base64 string without the prefix
      const base64String = reader.result.split(',')[1];
      setReportImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRunReportAnalysis = async () => {
    if (!reportImage) {
      setReportError('Please upload a medical report image first.');
      return;
    }

    setReportLoading(true);
    setReportError('');
    setReportResult(null);

    const payload = {
      heart_rate: Number(inputHr) || 0,
      spo2: Number(inputSpo2) || 0,
      temperature: Number(inputTemp) || 0,
      systolic_bp: Number(inputBpSystolic),
      diastolic_bp: Number(inputBpDiastolic),
      ecg_irregularity: Number((Math.min(0.95, Math.max(0.05, severityScore / 100))).toFixed(2)),
      report_image: reportImage
    };

    try {
      const result = await postJsonWithFallback(
        API_BASES.map(base => `${base}/analyze-vitals`),
        payload
      );
      
      if (result.comparison) {
        setReportResult(result.comparison);
      } else {
        throw new Error('Analysis completed but comparison data is missing.');
      }
    } catch (err) {
      setReportError(err.message || 'Report analysis failed.');
    } finally {
      setReportLoading(false);
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
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: "linear-gradient(135deg, #fff5f7 0%, #fff0f3 34%, #ffe4e9 62%, #fff5f7 100%)", color: '#1e293b', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .metal-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(var(--accent, 247, 167, 192), 0.45);
          background: var(--bg);
          color: var(--text, #ffffff);
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 200ms ease;
          box-shadow: 0 10px 20px rgba(247, 167, 192, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
          overflow: hidden;
          padding: 0.6rem 1.2rem;
        }
        .metal-btn__inner {
          position: absolute;
          inset: 1px;
          border-radius: 13px;
          background: radial-gradient(circle at 25% 18%, rgba(255,255,255,0.4), transparent 44%), linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0));
          pointer-events: none;
        }
        .metal-btn__shine {
          position: absolute;
          inset: -120% -60%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: rotate(18deg) translateX(-40%);
          opacity: 0;
          transition: opacity 240ms ease, transform 650ms ease;
          pointer-events: none;
        }
        .metal-btn:hover .metal-btn__shine {
          opacity: 1;
          transform: rotate(18deg) translateX(36%);
        }
        .metal-btn__content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .premium-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          border: 1px solid rgba(247, 167, 192, 0.2);
          box-shadow: 0 10px 30px rgba(131, 24, 67, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .premium-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(131, 24, 67, 0.1);
        }
        @keyframes rotate-border {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .border-rotate-wrapper {
          display: flex;
          overflow: hidden;
        }
        @keyframes border-glow-pulse {
          0% { box-shadow: 0 0 5px rgba(244, 114, 182, 0.2); }
          50% { box-shadow: 0 0 15px rgba(244, 114, 182, 0.4); }
          100% { box-shadow: 0 0 5px rgba(244, 114, 182, 0.2); }
        }
        .border-rotate-wrapper {
          animation: border-glow-pulse 4s ease-in-out infinite;
        }
        
        /* Premium Custom Scrollbars */
        * {
          scrollbar-width: thin;
          scrollbar-color: #f472b6 transparent;
        }

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 245, 247, 0.5);
          border-radius: 20px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #fbcfe8 0%, #f472b6 100%);
          border-radius: 20px;
          border: 3px solid rgba(255, 245, 247, 0.8);
          box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f472b6 0%, #db2777 100%);
          cursor: pointer;
        }
      `}</style>

      {/* High-Fidelity Geometry Background Layer */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <ElegantShape
          delay={0.2}
          width={600}
          height={140}
          rotate={12}
          gradient="linear-gradient(135deg, rgba(247,167,192,0.4), rgba(255,192,203,0.2), rgba(255,255,255,0.1))"
          style={{ left: "-5%", top: "10%" }}
        />
        <ElegantShape
          delay={0.4}
          width={400}
          height={100}
          rotate={-15}
          gradient="linear-gradient(135deg, rgba(236,72,153,0.2), rgba(255,255,255,0.1))"
          style={{ right: "5%", top: "15%" }}
        />
        <ElegantShape
          delay={0.6}
          width={500}
          height={120}
          rotate={-8}
          gradient="linear-gradient(135deg, rgba(219,39,119,0.15), rgba(255,192,203,0.1))"
          style={{ left: "10%", bottom: "15%" }}
        />
      </div>

      <header style={{ position: "relative", zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 2.5rem', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(247,167,192,0.2)', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #fbcfe8, #ffe4e9)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(251,207,232,0.3)' }}>
            <HeartPulse color="#e11d48" size={24} />
          </div>
          <h1 style={{ margin: 0, color: '#334155', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em' }}>VitalsGuard <span style={{ color: '#f472b6', fontWeight: '400' }}>Patient</span></h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flex: 1 }}>
          {['Dashboard', 'Interactive Analyzer', 'Report Analysis', 'Appointments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              style={{
                background: activeTab === tab.toLowerCase() ? '#4f46e5' : 'transparent',
                border: 'none',
                color: activeTab === tab.toLowerCase() ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '800',
                padding: '0.5rem 1.2rem',
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === tab.toLowerCase() ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
        <MetalButton 
          onClick={onLogout} 
          accentRgb={[225, 29, 72]}
          style={{ height: '40px', borderRadius: '10px', color: '#0f172a' }}
        >
          <LogOut size={16} /> Logout
        </MetalButton>
      </header>

      <main style={{ position: "relative", zIndex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* ==================== MAIN DASHBOARD ==================== */}
        {activeTab === 'dashboard' ? (
          <>
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
          </>
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
                  <div className="ai-debate" style={{ background: 'rgba(255, 255, 255, 0.4)', borderRadius: '24px', padding: '2rem', border: '1px solid #ffe4e9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ color: '#1e293b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: '900' }}>
                      <span style={{ fontSize: '1.5rem' }}>⚖️</span> Clinical Debate Intelligence
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {[
                        { key: 'monitoring', icon: '📡', color: '#0ea5e9', label: 'Vitals Monitor', bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '#bae6fd', text: agentScanResult.debate?.monitoring_view },
                        { key: 'diagnosis', icon: '🔬', color: '#db2777', label: 'Diagnostic Lab', bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', border: '#fbcfe8', text: agentScanResult.debate?.diagnosis_view },
                        { key: 'debate', icon: '🤝', color: '#7c3aed', label: 'Consensus Coordinator', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '#ddd6fe', text: `Agreement reached (Disagreement score: ${agentScanResult.disagreement_score}/10)\n${agentScanResult.debate?.consensus || agentScanResult.consensus}` },
                        { key: 'explanation', icon: '💬', color: '#d97706', label: 'Clinical Liaison', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fde68a', text: agentScanResult.explanation?.voice_summary || agentScanResult.voice_summary },
                        { key: 'actions', icon: '🎯', color: '#059669', label: 'Action Protocol', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#bbf7d0', text: (agentScanResult.actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') },
                        { key: 'emergency', icon: '🚨', color: '#dc2626', label: 'Emergency Override', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '#fecaca', text: `Severity Assessment: ${agentScanResult.emergency?.urgency_note}\nImmediate Dispatch: ${agentScanResult.emergency?.dispatch_alert ? 'REQUIRED 🔔' : 'NOT REQUIRED ✅'}` },
                      ].filter(item => item.text).map(item => (
                        <div key={item.key} style={{ background: item.bg, padding: '1.5rem', borderRadius: '20px', border: `1px solid ${item.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                            <strong style={{ color: item.color, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '900' }}>
                              {item.label}
                            </strong>
                          </div>
                          <p style={{ color: '#0f172a', margin: 0, fontSize: '0.98rem', lineHeight: 1.7, whiteSpace: 'pre-line', fontWeight: '500' }}>
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ffe4e9', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700' }}>Disagreement Level: <strong style={{ color: '#7c3aed' }}>{agentScanResult.disagreement_score}/10</strong></span>
                      <span style={{ fontWeight: '700' }}>EWS Signature: <strong style={{ color: agentScanResult.ews?.colour || '#22c55e' }}>{agentScanResult.ews?.level?.toUpperCase()}</strong></span>
                      <span style={{ fontWeight: '700' }}>Emergency Alert: <strong style={{ color: agentScanResult.emergency?.dispatch_alert ? '#ef4444' : '#059669' }}>{agentScanResult.emergency?.dispatch_alert ? 'CRITICAL' : 'STABLE'}</strong></span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : activeTab === 'report analysis' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Left: Upload Section */}
              <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📄</span> Upload Medical Report
                </h3>
                <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Upload high-resolution report images for AI comparison.</p>
                
                <div style={{ 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '16px', 
                  padding: '2rem', 
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleReportUpload({ target: { files: [file] } });
                }}
                onClick={() => document.getElementById('report-upload-input').click()}
                >
                  <input id="report-upload-input" type="file" accept="image/*" onChange={handleReportUpload} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📤</div>
                  <div style={{ fontWeight: '700', color: '#475569', fontSize: '0.95rem' }}>
                    {reportFileName ? reportFileName : 'Click to Upload Report'}
                  </div>
                </div>

                {reportImage && (
                  <div style={{ marginTop: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', marginBottom: '1rem' }}>
                      <img src={`data:image/jpeg;base64,${reportImage}`} alt="Report Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => { setReportImage(null); setReportFileName(''); setReportResult(null); }}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Clear
                      </button>
                      <button 
                        onClick={handleRunReportAnalysis}
                        disabled={reportLoading}
                        style={{ flex: 2, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#7C3AED', color: 'white', fontWeight: '700', cursor: reportLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                      >
                        {reportLoading ? 'Analyzing...' : 'Run Cross-Analysis ✨'}
                      </button>
                    </div>
                  </div>
                )}
                {reportError && <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', fontWeight: '600' }}>⚠️ {reportError}</div>}
              </div>

              {/* Right: AI Analysis Summary (from Sensors) */}
              <div className="premium-card" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖</span> AI Analysis Summary
                </h3>
                {agentScanResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '20px', border: '1px solid #bcf1cc', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.05)' }}>
                      <div style={{ fontWeight: '900', color: '#166534', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>🥗 Consensus Analysis</div>
                      <p style={{ margin: 0, color: '#0f172a', fontSize: '1rem', lineHeight: 1.6, fontWeight: '500' }}>{agentScanResult.debate?.consensus || agentScanResult.consensus}</p>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '20px', border: '1px solid #fde68a', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.05)' }}>
                      <div style={{ fontWeight: '900', color: '#92400e', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>🩺 Clinical Diagnosis</div>
                      <p style={{ margin: 0, color: '#0f172a', fontSize: '1rem', lineHeight: 1.6, fontWeight: '500' }}>{agentScanResult.debate?.diagnosis_view}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                    <p>Run a Phidata Agent Scan in the 'Interactive Analyzer' tab first to see the sensor-based analysis summary here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Insight Correlation Results */}
            {reportResult ? (
            <BorderRotate 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ border: '2px solid #be185d' }}
            >
              <div className="premium-card" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#334155', fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🧠</span> Insight Correlation
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2.5rem', alignItems: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)', padding: '2.5rem', borderRadius: '32px', color: 'white', textAlign: 'center', boxShadow: '0 15px 35px rgba(219, 39, 119, 0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '950', textTransform: 'uppercase', opacity: 1, marginBottom: '0.8rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.9)' }}>Correlation Score</div>
                    <div style={{ fontSize: '4.5rem', fontWeight: '950', lineHeight: 1, textShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{reportResult.correlation_score}%</div>
                  </div>
                  <div>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '1.5rem', borderRadius: '24px', border: '1px solid #ffe4e9', marginBottom: '1.5rem' }}>
                      <p style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem', fontWeight: '600', lineHeight: 1.7 }}>
                        {reportResult.summary}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      {reportResult.insights && reportResult.insights.map((insight, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '0.7rem 1.2rem', borderRadius: '16px', fontSize: '0.85rem', color: '#334155', fontWeight: '800', border: '1px solid #ffe4e9', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem' }}>🔬</span> {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </BorderRotate>
            ) : (
              <div className="premium-card" style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🧠</div>
                <p style={{ color: '#94a3b8', fontWeight: '600' }}>Correlation results will appear here after analysis.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'appointments' ? (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #ffe4e9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.25rem', fontWeight: '900' }}>📅 Appointments Scheduler</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '0.92rem', fontWeight: '500' }}>
                Booking is enabled only after discharge confirmation. Each slot is 20 minutes, and overlapping appointments are blocked automatically.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <label style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.9rem' }}>Select Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => {
                      setAppointmentDate(e.target.value);
                      setSelectedSlot(null);
                      setAppointmentError('');
                      setAppointmentSuccess('');
                    }}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ffe4e9', fontSize: '0.9rem', color: '#000000', backgroundColor: '#fff5f7', fontWeight: '800' }}
                  />
                </div>
                <MetalButton
                  onClick={refreshAppointmentData}
                  style={{ height: '42px', padding: '0 1.5rem', backgroundColor: '#fbcfe8', color: '#000000', fontWeight: '900' }}
                >
                  Refresh Slots
                </MetalButton>
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>
            <BorderRotate 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ marginBottom: '2.5rem' }}
            >
              <div style={{ padding: '2rem' }}>
                <h4 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '900' }}>Doctor Slot Timing</h4>

                {appointmentLoading ? (
                  <p style={{ color: '#64748b' }}>Loading slots...</p>
                ) : !availableDoctors.length ? (
                  <p style={{ color: '#64748b' }}>No doctors configured yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {availableDoctors.map((doctor) => (
                      <div key={doctor.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                        <div style={{ marginBottom: '0.8rem' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{doctor.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>{doctor.specialty}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem' }}>
                          {doctor.slots.map((slot) => {
                            const isSelected = selectedSlot && selectedSlot.doctorId === doctor.id && selectedSlot.start === slot.start;
                            const isDisabled = !appointmentEligibility.discharged || !slot.available;
                            return (
                              <MetalButton
                                key={`${doctor.id}-${slot.start}`}
                                disabled={isDisabled}
                                active={isSelected}
                                variant={isSelected ? "primary" : "outline"}
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
                                  fontSize: '0.85rem',
                                  height: '36px',
                                  padding: '0 0.5rem',
                                  opacity: isDisabled ? 0.6 : 1,
                                  color: isSelected ? '#4f46e5' : (isDisabled ? '#94a3b8' : '#000000'), 
                                  fontWeight: isSelected ? '950' : '700', 
                                  backgroundColor: isSelected ? '#eef2ff' : (!slot.available ? '#f1f5f9' : (isDisabled ? '#f8fafc' : 'white')), 
                                  border: isSelected ? '2px solid #4f46e5' : (!slot.available ? '1px solid #cbd5e1' : (isDisabled ? '1px solid #e2e8f0' : '1px solid #ffe4e9')),
                                  boxShadow: isSelected ? '0 0 15px rgba(79, 70, 229, 0.15)' : 'none',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  filter: !slot.available ? 'grayscale(100%) brightness(0.95)' : 'none'
                                }}
                                title={slot.available ? 'Available' : 'Already booked'}
                              >
                                {formatSlotTime(slot.start)}
                              </MetalButton>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </BorderRotate>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="premium-card" style={{ padding: '1.5rem', background: '#fff' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.1rem', fontWeight: '900' }}>Selected Slot</h4>
                  {selectedSlot ? (
                    <div className="premium-card" style={{ padding: '1rem', background: 'rgba(247,167,192,0.05)', borderRadius: '16px', borderStyle: 'dashed' }}>
                      <p style={{ margin: '0', color: '#334155', fontWeight: '900', fontSize: '1rem' }}>{selectedSlot.doctorName}</p>
                      <p style={{ margin: '0.2rem 0', color: '#334155', fontSize: '0.85rem', fontWeight: '600' }}>{selectedSlot.specialty}</p>
                      <p style={{ margin: '0.4rem 0 0', color: '#444', fontSize: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.4rem' }}>
                        📅 {new Date(selectedSlot.start).toLocaleDateString()} • {formatSlotTime(selectedSlot.start)}
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', border: '2px dashed #ffe4e9', borderRadius: '16px', textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#334155', fontSize: '0.88rem', fontWeight: '500' }}>Pick an available 20-minute slot.</p>
                    </div>
                  )}

                  <MetalButton
                    className="metal-btn--block"
                    disabled={!selectedSlot || !appointmentEligibility.discharged || appointmentLoading}
                    onClick={handleBookAppointment}
                    accentRgb={[190, 24, 93]}
                    style={{ 
                      marginTop: '1.5rem', 
                      height: '48px', 
                      backgroundColor: '#be185d', 
                      color: '#ffffff', 
                      fontWeight: '900' 
                    }}
                  >
                    Confirm Booking
                  </MetalButton>
                </div>

                <div className="premium-card" style={{ padding: '1.5rem', background: '#fff' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: '900' }}>My Appointments</h4>
                  {!myAppointments.length ? (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No active bookings found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {myAppointments.map((appt) => (
                        <div key={appt.id} style={{ border: '1px solid #ffe4e9', borderRadius: '10px', padding: '0.85rem', background: '#fff5f7' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{appt.doctorName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>
                            📅 {new Date(appt.start).toLocaleDateString()} • {formatSlotTime(appt.start)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* New: Available Doctor List Container */}
                <div className="premium-card" style={{ padding: '1.5rem', background: '#fff' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👨‍⚕️</span> Available Specialists
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {availableDoctors.slice(0, 4).map(doctor => (
                      <div key={doctor.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fbcfe8', display: 'grid', placeItems: 'center', color: '#be185d', fontWeight: '900', fontSize: '0.8rem' }}>
                          {doctor.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>{doctor.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{doctor.specialty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="premium-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 15px rgba(131,24,67,0.1))' }}>🏗️</div>
            <h2 style={{ color: '#334155', fontWeight: '900' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
            <p style={{ color: '#334155', fontSize: '1.1rem' }}>This section is currently under development to bring you a better care experience.</p>
          </div>
        )}
      </main>
    </div>
  );
}

