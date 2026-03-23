import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { patients } from '../data/mockVitals';

const API_BASE = 'http://localhost:5000/api';

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

  // ML Results & Severity Score
  const [mlResult, setMlResult] = useState(null);
  const [severityScore, setSeverityScore] = useState(0);
  const [projectedRisks, setProjectedRisks] = useState({ 2: null, 6: null, 12: null, 24: null });
  const [riskHistoryData, setRiskHistoryData] = useState([]);

  // Auto-update main dashboard with current vitals
  useEffect(() => {
    const randomVariation = () => ({
      hr: currentHr + Math.floor(Math.random() * 3 - 1),
      spo2: currentSpo2 + Math.floor(Math.random() * 1 - 0.5),
      temp: parseFloat((currentTemp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
      bp_systolic: currentBpSystolic + Math.floor(Math.random() * 2 - 1),
      bp_diastolic: currentBpDiastolic + Math.floor(Math.random() * 2 - 1),
    });

    const timer = setInterval(() => {
      setVitalsHistory(prev => {
        const newHistory = [...prev];
        const lastIdx = newHistory.length - 1;
        const variation = randomVariation();
        newHistory[lastIdx] = { ...newHistory[lastIdx], ...variation };
        return newHistory;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [currentHr, currentSpo2, currentTemp, currentBpSystolic, currentBpDiastolic]);

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

      // Fetch Model 01 (Current Classification)
      try {
        const res01 = await fetch(`${API_BASE}/predict/disease`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heart_rate: hrNum, spo2: spo2Num, temperature: tempNum, bp_systolic: Number(inputBpSystolic), bp_diastolic: Number(inputBpDiastolic) })
        });
        const data01 = await res01.json();
        if (data01.all_probabilities) {
          const chartData = Object.entries(data01.all_probabilities)
            .map(([name, prob]) => ({ name: name.replace('_', ' '), Probability: parseFloat((prob * 100).toFixed(1)) }))
            .sort((a, b) => b.Probability - a.Probability).slice(0, 5);
          setMlResult({ ...data01, chartData });
          const maxProb = Math.max(...Object.values(data01.all_probabilities));
          const currentScore = Math.round(maxProb * 100);
          setSeverityScore(currentScore);

          // Fetch Model 07 (Trajectory Prediction) for 24-hour risk projection
          try {
            const res07 = await fetch(`${API_BASE}/predict/trajectory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ heart_rate: hrNum, spo2: spo2Num, temperature: tempNum, bp_systolic: Number(inputBpSystolic), bp_diastolic: Number(inputBpDiastolic) })
            });
            const data07 = await res07.json();
            if (data07.trajectory) {
              setRiskHistoryData(data07.trajectory);
              const projections = {};
              [2, 6, 12, 24].forEach(h => {
                const point = data07.trajectory.find(d => d.hour === h);
                projections[h] = point ? Math.round(point.risk) : currentScore;
              });
              setProjectedRisks(projections);
            } else {
              throw new Error('No trajectory data');
            }
          } catch (err) {
            console.log("Model 07 not available, using fallback trajectory", err);
            // Fallback: simulate trajectory based on vital abnormalities
            const isAbnormal = hrNum > 100 || spo2Num < 94 || tempNum > 38 || inputBpSystolic > 140;
            const trajectoryData = [];
            for (let hour = 0; hour <= 24; hour++) {
              let riskValue = currentScore;
              if (isAbnormal) {
                // Risk increases initially, then plateaus
                riskValue = Math.min(currentScore + (hour * 2.5), 95);
                if (hour > 12) riskValue = Math.max(riskValue - (hour - 12) * 1.2, currentScore);
              } else {
                // Risk decreases gradually
                riskValue = Math.max(currentScore - (hour * 1.5), Math.max(0, currentScore - 25));
              }
              riskValue = Math.max(0, Math.min(100, riskValue));
              trajectoryData.push({ hour, risk: Math.round(riskValue) });
            }
            setRiskHistoryData(trajectoryData);
            const projections = {};
            [2, 6, 12, 24].forEach(h => {
              const point = trajectoryData.find(d => d.hour === h);
              projections[h] = point ? point.risk : currentScore;
            });
            setProjectedRisks(projections);
          }
        }
      } catch (err) { console.error("Model 01 failed", err); }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputHr, inputSpo2, inputTemp, inputBpSystolic, inputBpDiastolic]);

  // Send Dataset Label to Backend
  const handleSaveDatapoint = async (label) => {
    try {
      await axios.post(`${API_BASE}/save-datapoint`, {
        heart_rate: currentHr,
        spo2: currentSpo2,
        temperature: currentTemp,
        bp_systolic: currentBpSystolic,
        bp_diastolic: currentBpDiastolic,
        label: label,
        patient_id: userId,
        timestamp: new Date().toISOString()
      });
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
          <>
            {/* Live Vital Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {healthMetrics.map((metric, idx) => (
                <div key={idx} style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: metric.status === 'critical' ? '4px solid #ef4444' : metric.status === 'warning' ? '4px solid #f59e0b' : 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{metric.icon}</div>
                  <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' }}>{metric.title}</div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: metric.status === 'critical' ? '#ef4444' : '#7C3AED', marginBottom: '0.5rem' }}>{metric.value}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>{metric.unit}</div>
                </div>
              ))}
            </div>

            {/* Live Vitals Graph with Real-time Updates */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.3rem' }}>📈 Live Vitals Monitor</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={vitalsHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Heart Rate (BPM)" />
                  <Line yAxisId="left" type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="SpO2 (%)" />
                  <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Temperature (°C)" />
                  <Line yAxisId="right" type="monotone" dataKey="bp_systolic" stroke="#10b981" strokeWidth={2.5} dot={false} name="BP Systolic (mmHg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Severity Score - Main Dashboard */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem', border: `3px solid ${severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981'}` }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Risk Assessment
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ fontSize: '5rem', fontWeight: 'bold', color: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981' }}>{severityScore}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ width: '100%', height: '16px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', width: `${severityScore}%`, backgroundColor: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981', transition: 'width 0.3s ease' }}></div>
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', fontWeight: '600', color: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981' }}>
                    {severityScore > 70 ? '🔴 High Risk' : severityScore > 40 ? '🟡 Medium Risk' : '🟢 Low Risk'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dataset Generation & Care Team - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Dataset Generation Section - Compact */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px dashed #7C3AED' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔬</span> Generate Dataset
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.85rem' }}>
                  Label current vitals for model training
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                  <select 
                    value={datasetLabel}
                    onChange={(e) => setDatasetLabel(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.75rem' }}
                  >
                    <option value="">Select label...</option>
                    <option value="normal">✅ Normal</option>
                    <option value="spike">⚠️ Spike</option>
                  </select>
                  <button 
                    onClick={() => handleSaveDatapoint(datasetLabel)}
                    disabled={!datasetLabel}
                    style={{ padding: '0.6rem 1rem', backgroundColor: datasetLabel ? '#7C3AED' : '#d1d5db', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: datasetLabel ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                  >
                    💾 Save
                  </button>
                </div>
              </div>

              {/* Care Team - Half Size */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👨‍⚕️</span> Care Team
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {doctors.slice(0, 2).map((doctor, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>{doctor.name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.specialty}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#7C3AED', fontWeight: '600', whiteSpace: 'nowrap' }}>{doctor.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

            {/* AI Health Risk History - Area Chart */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊</span> AI Health Risk History (Model 07 Trajectory)
              </h3>
              {riskHistoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={riskHistoryData}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" label={{ value: 'Hours', position: 'insideBottomRight', offset: -10 }} />
                    <YAxis label={{ value: 'Risk Score (0-100)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => `${value}%`}
                      labelFormatter={(label) => `Hour ${label}`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="risk" 
                      stroke="#7C3AED" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRisk)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Loading risk trajectory...</p>
              )}
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

            {/* Projected Health Risks */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#7C3AED', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Projected Health Risks (Model 07)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[2, 6, 12, 24].map(hours => {
                  const riskScore = projectedRisks[hours];
                  const riskColor = riskScore > 70 ? '#ef4444' : riskScore > 40 ? '#f59e0b' : '#10b981';
                  const riskStatus = riskScore > 70 ? 'High Risk' : riskScore > 40 ? 'Medium Risk' : 'Low Risk';
                  const riskIcon = riskScore > 70 ? '🔴' : riskScore > 40 ? '🟡' : '🟢';
                  
                  return (
                    <div key={hours} style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: `2px solid ${riskColor}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>{hours} {hours === 1 ? 'hour' : 'hours'}</div>
                      {riskScore !== null ? (
                        <div>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: riskColor, marginBottom: '0.5rem' }}>
                            {riskScore}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: riskColor, marginBottom: '0.5rem' }}>
                            {riskIcon} {riskStatus}
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${riskScore}%`, backgroundColor: riskColor, transition: 'width 0.3s ease' }}></div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#999', fontSize: '0.9rem' }}>Calculating...</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Insight */}
              <div style={{ padding: '1.5rem', backgroundColor: '#ede9fe', borderRadius: '12px', borderLeft: '5px solid #7C3AED', marginTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#7C3AED', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡</span> AI Insight:
                </h4>
                <p style={{ margin: 0, color: '#5b21b6', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {severityScore > 70 
                    ? `Based on the current trajectory with elevated vitals, the patient's condition is likely to worsen. Close observation and intervention recommended.`
                    : severityScore > 40
                    ? `Based on the current trajectory, the patient's condition is likely to stabilize. Monitor closely over the next few hours for any changes.`
                    : `Based on the current trajectory, the patient's condition is likely to remain stable. Observe no significant risk trends closely over the next few hours.`
                  }
                </p>
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

