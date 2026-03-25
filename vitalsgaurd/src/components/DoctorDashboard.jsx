import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import HealthCard from './HealthCard';
import CriticalOverlay from './CriticalOverlay';
import { patients as initialPatients } from '../data/mockVitals';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export default function DoctorDashboard({ onLogout }) {
    const [patientsList, setPatientsList] = useState(initialPatients);
    const [activePatientId, setActivePatientId] = useState(initialPatients[0]?.id);
    const [mode, setMode] = useState('normal');
    const [analyzing, setAnalyzing] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [activeAlerts, setActiveAlerts] = useState({}); // { [patientId]: alertId }
    const [customRequirement, setCustomRequirement] = useState("");

    const activePatient = patientsList.find(p => p.id === activePatientId) || patientsList[0];

    // Real-time Vitals Simulation for ALL patients
    useEffect(() => {
        const interval = setInterval(() => {
            setPatientsList(prevList => prevList.map(patient => {
                const lastVital = patient.vitals[patient.vitals.length - 1];
                const now = new Date();
                const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                
                // Random variation logic
                const hrVar = (Math.random() * 4 - 2);
                const spo2Var = (Math.random() * 2 - 1);
                const tempVar = (Math.random() * 0.2 - 0.1);
                const bpVar = (Math.random() * 6 - 3);
                
                const newHr = Math.round(Math.max(60, Math.min(160, lastVital.hr + hrVar)));
                const newSpo2 = Math.round(Math.max(85, Math.min(100, lastVital.spo2 + spo2Var)));
                const newTemp = parseFloat(Math.max(36, Math.min(41, lastVital.temp + tempVar)).toFixed(1));
                const newBp = Math.round(Math.max(90, Math.min(180, lastVital.bp + bpVar)));
                
                const newStatus = (newHr > 110 || newSpo2 < 92 || newBp > 150) ? 'critical' : (newHr > 95 || newSpo2 < 95 || newBp > 135) ? 'warning' : 'stable';

                const newVitals = [...patient.vitals, { time: timeStr, hr: newHr, spo2: newSpo2, temp: newTemp, bp: newBp, status: newStatus }];
                if (newVitals.length > 20) newVitals.shift();

                return { ...patient, vitals: newVitals };
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Polling for Alert Resolution (check if our active alerts are still on the server)
    useEffect(() => {
        const activeIds = Object.values(activeAlerts).filter(id => !!id);
        if (activeIds.length === 0) return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await axios.get('http://localhost:5003/alerts');
                const serverActiveAlerts = res.data.alerts || [];
                const serverActiveIds = serverActiveAlerts.map(a => a.id);
                
                setActiveAlerts(prev => {
                    const next = { ...prev };
                    let changed = false;
                    for (const [pId, aId] of Object.entries(next)) {
                        if (aId && !serverActiveIds.includes(aId)) {
                            delete next[pId];
                            changed = true;
                            // Optionally notify specifically for which patient was responded
                            const pName = patientsList.find(p => p.id === pId)?.name || "Patient";
                            alert(`✅ Emergency Response Confirmed for ${pName}. Admin has acknowledged the alert.`);
                        }
                    }
                    return changed ? next : prev;
                });
            } catch (error) {
                console.error("Alert polling failed:", error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [activeAlerts, patientsList]);

    function examineVitals(patientId) {
        setActivePatientId(patientId);
        setScanResult(null);
    }

    function handleDischarge(patientId, e) {
        e.stopPropagation(); // Prevent selecting the patient when clicking discharge
        if (window.confirm("Are you sure you want to discharge this patient? This will remove them from the active monitoring list.")) {
            setPatientsList(prev => {
                const newList = prev.filter(p => p.id !== patientId);
                if (activePatientId === patientId) {
                    setActivePatientId(newList[0]?.id);
                }
                return newList;
            });
            setScanResult(null);
        }
    }

    const latest = activePatient?.vitals[activePatient.vitals.length - 1] || { hr: 0, spo2: 0, temp: 0, bp: 0, status: 'stable' };

    async function runDoctorAnalysis() {
        if (!activePatient) return;
        setAnalyzing(true);
        setScanResult(null);
        try {
            const res = await axios.post(`${API_BASE}/analyze-vitals`, {
                heart_rate: latest.hr,
                spo2: latest.spo2,
                temperature: latest.temp,
                blood_pressure: latest.bp,
                ecg_irregularity: (activePatient.id === 'p2' ? 0.72 : 0.0)
            });
            setScanResult(res.data);
        } catch (error) {
            console.error("Backend error:", error);
            alert("Failed to connect to AI Backend.");
        } finally {
            setAnalyzing(false);
        }
    }

    async function handleEmergencyAlert() {
        if (!activePatient) return;
        if (activeAlerts[activePatient.id]) return;
        
        const alertType = scanResult?.emergency?.dispatch_alert ? "AI-Triggered Emergency" : "Manual Emergency Override";
        const urgency = scanResult?.emergency?.urgency_note || "CRITICAL";
        
        // Calculate Infrastructure Requirements based on real-time vitals
        const requirements = ["ICU Bed"];
        if (latest.spo2 < 92) requirements.push("High-Flow O2");
        if (latest.spo2 < 88) requirements.push("Ventilator");
        if (latest.hr > 120 || latest.hr < 50) requirements.push("Cardiac Monitor");
        if (latest.temp > 39.5) requirements.push("Cooling Unit");
        
        // Merge with custom doctor requirement
        const finalRequirements = [...requirements];
        if (customRequirement.trim()) {
            finalRequirements.push(`Doc Note: ${customRequirement.trim()}`);
        }

        try {
            const res = await axios.post('http://localhost:5003/alerts', {
                doctorName: "Dr. Sarah Chen", 
                location: `Bed ${activePatient.id.toUpperCase()}`,
                alertType: alertType,
                urgency: urgency.toLowerCase().includes('high') || urgency.toLowerCase().includes('critical') ? 'critical' : 'high',
                patientId: activePatientId,
                patientName: activePatient.name,
                requirements: finalRequirements
            });
            
            if (res.data.success) {
                setActiveAlerts(prev => ({ ...prev, [activePatient.id]: res.data.alert.id }));
                setCustomRequirement(""); // Reset input
                alert(`🚨 Alert Transmitted for ${activePatient.name}!`);
            }
        } catch (error) {
            console.error("Failed to send alert:", error);
            alert("❌ Network Error: Could not connect to Command Center.");
        }
    }

    if (!activePatient && patientsList.length === 0) {
        return (
            <div className="dashboard normal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <h1 style={{ color: '#7C3AED' }}>No Active Patients</h1>
                <p style={{ color: '#64748b' }}>All patients have been discharged.</p>
                <button onClick={onLogout} style={{ marginTop: '20px', padding: '10px 20px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
            </div>
        );
    }

    return (
        <div className={`dashboard ${mode}`}>
            <header className="premium-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '24px' }}>🏥</div>
                    <h1 style={{ margin: 0, color: '#7C3AED', fontSize: '1.5rem', fontWeight: 'bold' }}>Doctor Command Center</h1>
                </div>
                    <button className="nav-pill logout" onClick={onLogout}>Logout</button>
            </header>

            <section className="doctor-top-row">
                <div className="patient-list premium-card">
                    <h2 style={{ color: '#7C3AED', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '800' }}>In-Patient Assignments</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {[...patientsList]
                            .sort((a, b) => {
                                const statusPriority = { critical: 0, warning: 1, stable: 2 };
                                const aStatus = a.vitals[a.vitals.length - 1].status;
                                const bStatus = b.vitals[b.vitals.length - 1].status;
                                return statusPriority[aStatus] - statusPriority[bStatus];
                            })
                            .map((p) => (
                                <li 
                                    key={p.id} 
                                    className={`patient-item ${p.id === activePatientId ? 'active' : ''}`} 
                                onClick={() => examineVitals(p.id)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    marginBottom: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: p.id === activePatientId ? '2px solid #7C3AED' : '1px solid #e2e8f0',
                                    backgroundColor: p.id === activePatientId ? '#f5f3ff' : '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{p.name}</div>
                                    <small style={{ color: '#64748b' }}>Age {p.age} • <span style={{ color: p.vitals[p.vitals.length-1].status === 'critical' ? '#ef4444' : '#22c55e' }}>{p.vitals[p.vitals.length-1].status}</span></small>
                                </div>
                                <button 
                                    onClick={(e) => handleDischarge(p.id, e)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '0.7rem',
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Discharge
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="patient-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>{activePatient.name} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>• Real-Time Monitoring</span></h2>
                        </div>
                        <button
                            onClick={runDoctorAnalysis}
                            disabled={analyzing}
                            className="premium-btn primary"
                            style={{ padding: '0.7rem 1.5rem', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '10px', cursor: analyzing ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)' }}
                        >
                            {analyzing ? 'Scanning Clinical Data...' : 'Run Phidata Agent Scan ✨'}
                        </button>
                    </div>

                    <div className="health-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <HealthCard title="Heart Rate" value={latest.hr} unit=" BPM" severity={latest.status} icon="❤️" />
                        <HealthCard title="SpO2" value={latest.spo2} unit=" %" severity={latest.status} icon="🩸" />
                        <HealthCard title="Temperature" value={latest.temp} unit=" °C" severity={latest.status} icon="🌡️" />
                        <HealthCard title="Blood Pressure" value={latest.bp} unit=" mmHg" severity={latest.status} icon="📊" />
                    </div>

                    <div className="chart-area premium-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📈 Vitals Trend Trajectory</h4>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={activePatient.vitals}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" tick={{fontSize: 10}} />
                                <YAxis tick={{fontSize: 10}} />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={3} name="Heart Rate" dot={false} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={3} name="SpO2" dot={false} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={3} name="Temp" dot={false} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="bp" stroke="#8b5cf6" strokeWidth={3} name="BP (mmHg)" dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {scanResult && (
                        <div className="ai-debate premium-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ color: '#7C3AED', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: '800' }}>
                                <span>⚖️</span> Multi-Agent Clinical Consensus
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                                {[
                                    { key: 'monitoring', icon: '📈', color: '#0ea5e9', label: 'Monitoring Agent', bg: '#f0f9ff', text: scanResult.debate?.monitoring_view },
                                    { key: 'diagnosis', icon: '🩺', color: '#db2777', label: 'Diagnosis Agent', bg: '#fdf2f8', text: scanResult.debate?.diagnosis_view },
                                    { key: 'debate', icon: '⚖️', color: '#9333ea', label: 'Debate Coordinator', bg: '#faf5ff', text: `Consensus reached (Disagreement score: ${scanResult.disagreement_score}/10)\n${scanResult.debate?.consensus || scanResult.consensus}` },
                                    { key: 'explanation', icon: '🗣️', color: '#d97706', label: 'Explanation Agent', bg: '#fffbeb', text: scanResult.explanation?.voice_summary || scanResult.voice_summary },
                                    { key: 'actions', icon: '⚡', color: '#16a34a', label: 'Action Agent', bg: '#f0fdf4', text: (scanResult.actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') },
                                    { key: 'emergency', icon: '🚨', color: '#dc2626', label: 'Emergency Agent', bg: '#fef2f2', text: `Urgency: ${scanResult.emergency?.urgency_note}\nDispatch Alert: ${scanResult.emergency?.dispatch_alert ? 'YES ⚠️' : 'NO ✓'}` },
                                ].filter(item => item.text).map(item => (
                                    <div key={item.key} style={{ background: item.bg, padding: '1.25rem', borderRadius: '14px', borderLeft: `5px solid ${item.color}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                                            <strong style={{ color: item.color, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {item.label}
                                            </strong>
                                        </div>
                                        <p style={{ color: '#334155', margin: 0, fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                                <span>Disagreement: <strong style={{ color: '#9333ea' }}>{scanResult.disagreement_score}/10</strong></span>
                                <span>Clinical EWS: <strong style={{ color: scanResult.ews?.colour || '#16a34a' }}>{scanResult.ews?.level?.toUpperCase()}</strong></span>
                                <span>Emergency Dispatch: <strong style={{ color: scanResult.emergency?.dispatch_alert ? '#dc2626' : '#16a34a' }}>{scanResult.emergency?.dispatch_alert ? 'YES' : 'NO'}</strong></span>
                            </div>
                        </div>
                    )}

                    <div className="action-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input 
                                type="text"
                                placeholder="Specify Clinical Needs (e.g. Cardiologist, Blood)..."
                                value={customRequirement}
                                onChange={(e) => setCustomRequirement(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    marginBottom: '0.5rem',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    background: activeAlerts[activePatient.id] ? '#f8fafc' : 'white'
                                }}
                                disabled={!!activeAlerts[activePatient.id]}
                            />
                            <button 
                                className="premium-btn emergency" 
                                onClick={handleEmergencyAlert}
                                disabled={!!activeAlerts[activePatient.id]}
                                style={{ 
                                    width: '100%', 
                                    padding: '1rem', 
                                    background: activeAlerts[activePatient.id] ? '#475569' : '#dc2626', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    fontWeight: '800', 
                                    cursor: activeAlerts[activePatient.id] ? 'not-allowed' : 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                {activeAlerts[activePatient.id] ? (
                                    <>
                                        <span style={{ animation: 'pulse 1.5s infinite' }}>⏳</span>
                                        ADMIN RESPONSE PENDING...
                                    </>
                                ) : (
                                    <>🚨 Trigger Clinical Dispatch</>
                                )}
                            </button>
                        </div>
                        <button 
                            onClick={(e) => handleDischarge(activePatient.id, e)}
                            style={{ 
                                padding: '1rem 2rem', 
                                background: '#fff', 
                                color: '#64748b', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '10px', 
                                fontWeight: '700', 
                                cursor: 'pointer' 
                            }}
                        >
                            Discharge Patient
                        </button>
                    </div>
                </div>
            </section>
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                `}
            </style>
        </div>
    );
}