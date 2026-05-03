import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import HealthCard from './HealthCard';
import CriticalOverlay from './CriticalOverlay';
import { Header } from './Header';
import { Footer } from './Footer';
import { Button, ShinyButton } from './ui/button';
import { AlertTriangle, Sparkles, UserMinus, Activity, Thermometer, Droplets, BarChart3, Building2, Scale, MessageSquare, CheckCircle2 } from 'lucide-react';
import { patients as initialPatients } from '../data/mockVitals';
import axios from 'axios';

const API_BASE = 'http://localhost:5003';
const AI_API_BASE = 'http://localhost:8000/api';

function ElegantShape({
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "linear-gradient(135deg, rgba(121,184,255,0.48), rgba(205,232,255,0.34), rgba(255,255,255,0.24))",
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
                        boxShadow: "0 34px 90px rgba(121,184,255,0.3)",
                        backdropFilter: "blur(10px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        background:
                            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.56), rgba(210,232,255,0.18) 42%, transparent 70%)",
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

function CustomModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(15, 35, 55, 0.25)', backdropFilter: 'blur(8px)' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{ background: 'white', padding: '2.5rem', borderRadius: '30px', maxWidth: '450px', width: '90%', border: '1px solid rgba(121, 184, 255, 0.3)', boxShadow: '0 30px 60px rgba(15, 45, 88, 0.15)' }}
                >
                    <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(121, 184, 255, 0.15)', display: 'grid', placeItems: 'center', marginBottom: '1.5rem' }}>
                        <UserMinus size={30} color="#2f77d6" />
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#173b67', fontSize: '1.5rem', fontWeight: '900' }}>{title}</h3>
                    <p style={{ margin: '0 0 2rem 0', color: '#5f7fa6', fontSize: '1rem', lineHeight: '1.6' }}>{message}</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            style={{ flex: 1, height: '52px', borderRadius: '16px', border: '1px solid #d9e8fb', fontWeight: '800', color: '#5f7fa6' }}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: '800', boxShadow: '0 12px 24px rgba(37, 99, 235, 0.25)' }}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function Notification({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            style={{
                position: 'fixed',
                bottom: '40px',
                left: '50%',
                zIndex: 2000,
                background: type === 'success' ? '#ecfdf5' : '#fff7ed',
                border: `1.5px solid ${type === 'success' ? '#10b981' : '#f59e0b'}`,
                padding: '1rem 2rem',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}
        >
            {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-orange-500" />}
            <span style={{ color: type === 'success' ? '#065f46' : '#9a3412', fontWeight: '700', fontSize: '0.95rem' }}>{message}</span>
        </motion.div>
    );
}

export default function DoctorDashboard({ onLogout }) {
    const [patientsList, setPatientsList] = useState(initialPatients);
    const [activePatientId, setActivePatientId] = useState(initialPatients[0]?.id);
    const [mode, setMode] = useState('normal');
    const [analyzing, setAnalyzing] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [activeAlerts, setActiveAlerts] = useState({}); // { [patientId]: alertId }
    const [customRequirement, setCustomRequirement] = useState("");
    const [dischargeModal, setDischargeModal] = useState({ isOpen: false, patientId: null, patientName: "" });
    const [connectionStatus, setConnectionStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
    const [lastScanTime, setLastScanTime] = useState(null);
    const [notification, setNotification] = useState(null);
  
    const handleCloseNotification = React.useCallback(() => {
        setNotification(null);
    }, []);

    // Connection Check for Command Center
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const res = await axios.get(`${API_BASE}/health`);
                if (res.data.status === 'ok') setConnectionStatus('online');
                else setConnectionStatus('offline');
            } catch (e) {
                setConnectionStatus('offline');
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 10000);
        return () => clearInterval(interval);
    }, []);

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
                const res = await axios.get(`${API_BASE}/alerts`);
                const serverActiveAlerts = res.data.alerts || [];
                const serverActiveIds = serverActiveAlerts.map(a => a.id);

                setActiveAlerts(prev => {
                    const next = { ...prev };
                    let changed = false;
                    for (const [pId, aId] of Object.entries(next)) {
                        if (aId && !serverActiveIds.includes(aId)) {
                            delete next[pId];
                            changed = true;
                            // Notify specifically for which patient was responded
                            const pName = patientsList.find(p => p.id === pId)?.name || "Patient";
                            setNotification({ message: `✅ Emergency Response Confirmed for ${pName}. Admin has acknowledged the alert.`, type: "success" });
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
        // Reset analysis when switching patients to keep UI clean
    }

    function handleDischargeRequest(patientId, e) {
        if (e?.stopPropagation) e.stopPropagation();
        const patient = patientsList.find(p => p.id === patientId);
        setDischargeModal({
            isOpen: true,
            patientId,
            patientName: patient?.name || "this patient"
        });
    }

    function confirmDischarge() {
        const { patientId } = dischargeModal;
        setPatientsList(prev => {
            const newList = prev.filter(p => p.id !== patientId);
            if (activePatientId === patientId) {
                setActivePatientId(newList[0]?.id);
            }
            return newList;
        });
        setScanResult(null);
        setDischargeModal({ isOpen: false, patientId: null, patientName: "" });
        setNotification({ message: "Patient discharged successfully.", type: "success" });
    }

    const latest = activePatient?.vitals[activePatient.vitals.length - 1] || { hr: 0, spo2: 0, temp: 0, bp: 0, status: 'stable' };

    async function runDoctorAnalysis() {
        if (!activePatient) return;
        setAnalyzing(true);
        setScanResult(null);
        try {
            const res = await axios.post(`${AI_API_BASE}/analyze-vitals`, {
                heart_rate: latest.hr,
                spo2: latest.spo2,
                temperature: latest.temp,
                blood_pressure: latest.bp,
                ecg_irregularity: (activePatient.id === 'p2' ? 0.72 : 0.0)
            });
            setScanResult(res.data);
        } catch (error) {
            console.error("Backend error:", error);
            setNotification({ message: "Failed to connect to AI Backend.", type: "warning" });
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
            const res = await axios.post(`${API_BASE}/alerts`, {
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
                setNotification({ message: `🚨 Alert Transmitted for ${activePatient.name}!`, type: "success" });
            }
        } catch (error) {
            console.error("Failed to send alert:", error);
            setNotification({ message: "❌ Network Error: Could not connect to Command Center.", type: "warning" });
        }
    }

    if (!activePatient && patientsList.length === 0) {
        return (
            <div className="dashboard normal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <h1 style={{ color: '#2f77d6' }}>No Active Patients</h1>
                <p style={{ color: '#64748b' }}>All patients have been discharged.</p>
                <button onClick={onLogout} style={{ marginTop: '20px', padding: '10px 20px', background: '#2f77d6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
            </div>
        );
    }

    return (
        <div className={`dashboard ${mode}`} style={{ minHeight: '100vh', maxWidth: 'none', margin: 0, padding: 0, position: 'relative', overflowX: 'hidden', background: "linear-gradient(135deg, #cfe5ff 0%, #e7f3ff 34%, #eef7ff 62%, #f9fbff 100%)", color: '#173b67' }}>
            {/* High-Fidelity Geometry Background Layer */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(circle at top left, rgba(121,184,255,0.56), transparent 34%), radial-gradient(circle at left center, rgba(170,213,255,0.4), transparent 42%), radial-gradient(circle at center center, rgba(166,210,255,0.22), transparent 46%), radial-gradient(circle at top right, rgba(162,207,255,0.22), transparent 34%), radial-gradient(circle at bottom left, rgba(121,184,255,0.24), transparent 32%), radial-gradient(circle at bottom right, rgba(247,167,192,0.2), transparent 26%), radial-gradient(circle at center right, rgba(134,215,195,0.14), transparent 24%)",
                    }}
                />
                <ElegantShape
                    delay={0.2}
                    width={620}
                    height={138}
                    rotate={12}
                    gradient="linear-gradient(135deg, rgba(121,184,255,0.56), rgba(194,226,255,0.38), rgba(255,255,255,0.24))"
                    style={{ left: "-6%", top: "12%" }}
                />
                <ElegantShape
                    delay={0.35}
                    width={360}
                    height={92}
                    rotate={-18}
                    gradient="linear-gradient(135deg, rgba(247,167,192,0.36), rgba(255,255,255,0.3))"
                    style={{ right: "2%", top: "16%" }}
                />
                <ElegantShape
                    delay={0.5}
                    width={420}
                    height={108}
                    rotate={-10}
                    gradient="linear-gradient(135deg, rgba(134,215,195,0.34), rgba(214,241,255,0.24), rgba(255,255,255,0.24))"
                    style={{ left: "8%", bottom: "16%" }}
                />
                <ElegantShape
                    delay={0.65}
                    width={240}
                    height={70}
                    rotate={20}
                    gradient="linear-gradient(135deg, rgba(255,255,255,0.38), rgba(121,184,255,0.38), rgba(195,226,255,0.24))"
                    style={{ right: "12%", bottom: "12%" }}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 10 }}>
                <Header
                    links={[
                        { label: 'Overview', href: '/doctor' },
                        { label: 'Research', href: '/doctor/research' },
                        { label: 'Policy', href: '/doctor/policy' },
                    ]}
                />

                <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0.65rem 1.5rem 0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #79b8ff, #d2e9ff)', boxShadow: '0 8px 16px rgba(121,184,255,0.16)' }}>
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, color: '#1c4372', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Doctor <span style={{ color: '#2f77d6' }}>Command Center</span></h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        backgroundColor: connectionStatus === 'online' ? '#22c55e' : (connectionStatus === 'checking' ? '#f59e0b' : '#ef4444'),
                                        boxShadow: connectionStatus === 'online' ? '0 0 8px #22c55e' : 'none'
                                    }} />
                                    <p style={{ margin: 0, color: '#5f7fa6', fontSize: '12px', fontWeight: 600 }}>
                                        {connectionStatus === 'online' ? 'Connected to Command Center' : (connectionStatus === 'checking' ? 'Connecting...' : 'Command Center Offline')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={onLogout}
                            variant="outline"
                            className="h-9 px-5 rounded-full border-blue-300 bg-white/80 text-blue-600 hover:bg-blue-50 shadow-sm"
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                <section className="doctor-top-row" style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1.5rem 1.5rem' }}>
                    <div className="patient-list premium-card" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid #cbd5e1', borderRadius: '22px', boxShadow: '0 10px 30px rgba(23,59,103,0.06)', height: 'calc(100vh - 170px)', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ color: '#2f77d6', marginBottom: '1rem', fontSize: '1.05rem', fontWeight: '800' }}>In-Patient Assignments</h2>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '6px', paddingBottom: '110px', scrollBehavior: 'smooth', scrollbarGutter: 'stable' }}>
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
                                            padding: '0.85rem',
                                            borderRadius: '12px',
                                            marginBottom: '0.55rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            border: p.id === activePatientId ? '2px solid #2f77d6' : '1.5px solid #cbd5e1',
                                            backgroundColor: p.id === activePatientId ? '#eef7ff' : '#fff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{p.name}</div>
                                            <Button
                                                onClick={(e) => handleDischargeRequest(p.id, e)}
                                                variant="outline"
                                                size="sm"
                                                className="text-[8px] h-6 px-2 border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-100 whitespace-nowrap"
                                                style={{ marginLeft: 'auto', borderRadius: '8px' }}
                                            >
                                                <UserMinus className="w-2.5 h-2.5 mr-1" />
                                                Discharge
                                            </Button>
                                        </div>
                                        <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                            <span>Age {p.age}</span>
                                            <span>•</span>
                                            <span
                                                style={{
                                                    fontSize: '9px',
                                                    textTransform: 'uppercase',
                                                    fontWeight: 800,
                                                    letterSpacing: '0.05em',
                                                    padding: '2px 8px',
                                                    borderRadius: '999px',
                                                    background: p.vitals[p.vitals.length - 1].status === 'critical' ? '#fee2e2' : p.vitals[p.vitals.length - 1].status === 'warning' ? '#fff7ed' : '#ecfdf5',
                                                    color: p.vitals[p.vitals.length - 1].status === 'critical' ? '#b91c1c' : p.vitals[p.vitals.length - 1].status === 'warning' ? '#b45309' : '#166534',
                                                }}
                                            >
                                                {p.vitals[p.vitals.length - 1].status}
                                            </span>
                                        </small>
                                    </li>
                                ))}
                            <li aria-hidden="true" style={{ height: '90px', pointerEvents: 'none' }} />
                        </ul>
                    </div>
  
                    <div className="patient-summary" style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid #cbd5e1', borderRadius: '30px', boxShadow: '0 15px 35px rgba(15, 45, 88, 0.08)', padding: '2rem', height: 'calc(100vh - 170px)', minHeight: 520, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>{activePatient.name} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>• Real-Time Monitoring</span></h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Button
                                    onClick={runDoctorAnalysis}
                                    disabled={analyzing}
                                    variant="outline"
                                    className="h-10 px-5 border-blue-300 text-blue-600 hover:bg-blue-50"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {analyzing ? 'Scanning Clinical Data...' : 'Run Phidata Agent Scan ✨'}
                                </Button>
                                <Button
                                    onClick={() => handleDischargeRequest(activePatient.id)}
                                    variant="outline"
                                    className="h-10 px-5 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
                                >
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Discharge Patient
                                </Button>
                            </div>
                        </div>

                        <div className="health-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <HealthCard title="Heart Rate" value={latest.hr} unit="BPM" severity={latest.status} icon={<Activity className="w-10 h-10 text-red-500" />} />
                            <HealthCard title="Temperature" value={latest.temp} unit="°C" severity={latest.status} icon={<Thermometer className="w-10 h-10 text-orange-400" />} />
                            <HealthCard title="SpO2" value={latest.spo2} unit="%" severity={latest.status} icon={<Droplets className="w-10 h-10 text-blue-400" />} />
                            <HealthCard title="Blood Pressure" value={latest.bp} unit="mmHg" severity={latest.status} icon={<BarChart3 className="w-10 h-10 text-emerald-500" />} />
                        </div>

                        <div className="chart-area premium-card" style={{ padding: '1.5rem', marginTop: '1.5rem', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity className="w-4 h-4 text-blue-500" /> Live Vitals Monitor
                            </h4>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={activePatient.vitals}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend iconType="circle" />
                                    <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2.5} name="Heart Rate (BPM)" dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={2.5} name="SpO2 (%)" dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2.5} name="Temperature (°C)" dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="bp" stroke="#10a89a" strokeWidth={2.5} name="BP Systolic (mmHg)" dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {scanResult && (
                            <div className="ai-debate premium-card" style={{ background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: '24px', padding: '1.5rem', marginTop: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                <h3 style={{ color: '#2f77d6', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: '800' }}>
                                    <Scale className="w-5 h-5" /> Multi-Agent Clinical Consensus
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                                    {[
                                        { key: 'monitoring', icon: <Activity className="w-5 h-5" />, color: '#0ea5e9', label: 'Monitoring Agent', bg: '#f0f9ff', text: scanResult.debate?.monitoring_view },
                                        { key: 'diagnosis', icon: <Thermometer className="w-5 h-5" />, color: '#db2777', label: 'Diagnosis Agent', bg: '#fdf2f8', text: scanResult.debate?.diagnosis_view },
                                        { key: 'debate', icon: <Scale className="w-5 h-5" />, color: '#1d4ed8', label: 'Debate Coordinator', bg: '#eff6ff', text: `Consensus reached (Disagreement score: ${scanResult.disagreement_score}/10)\n${scanResult.debate?.consensus || scanResult.consensus}` },
                                        { key: 'explanation', icon: <MessageSquare className="w-5 h-5" />, color: '#d97706', label: 'Explanation Agent', bg: '#fffbeb', text: scanResult.explanation?.voice_summary || scanResult.voice_summary },
                                        { key: 'actions', icon: <Sparkles className="w-5 h-5" />, color: '#16a34a', label: 'Action Agent', bg: '#f0fdf4', text: (scanResult.actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') },
                                        { key: 'emergency', icon: <AlertTriangle className="w-5 h-5" />, color: '#dc2626', label: 'Emergency Agent', bg: '#fef2f2', text: `Urgency: ${scanResult.emergency?.urgency_note}\nDispatch Alert: ${scanResult.emergency?.dispatch_alert ? 'YES' : 'NO'}` },
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
                                    <span>Disagreement: <strong style={{ color: '#1d4ed8' }}>{scanResult.disagreement_score}/10</strong></span>
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
                                        border: '2px solid #cbd5e1',
                                        marginBottom: '0.75rem',
                                        fontSize: '15px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        background: activeAlerts[activePatient.id] ? '#f8fafc' : 'rgba(255,255,255,0.9)',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#79b8ff"}
                                    onBlur={(e) => e.target.style.borderColor = "rgba(121, 184, 255, 0.3)"}
                                    disabled={!!activeAlerts[activePatient.id]}
                                />
                                <Button
                                    onClick={handleEmergencyAlert}
                                    disabled={!!activeAlerts[activePatient.id]}
                                    variant="outline"
                                    className={`w-full h-11 text-[11px] uppercase tracking-[0.08em] font-black border-2 transition-all ${
                                        activeAlerts[activePatient.id] 
                                        ? 'border-blue-100 bg-blue-50/50 text-blue-400' 
                                        : 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300'
                                    }`}
                                >
                                    <AlertTriangle className={`w-4 h-4 mr-2 ${activeAlerts[activePatient.id] ? 'text-blue-300' : 'text-red-500'}`} />
                                    {activeAlerts[activePatient.id] ? (
                                        <>ADMIN RESPONSE PENDING...</>
                                    ) : (
                                        <>Trigger Clinical Dispatch</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer
                    fluid
                    links={[
                        { label: 'Home', href: '/' },
                        { label: 'Doctor Dashboard', href: '/doctor' },
                        { label: 'Research', href: '/doctor/research' },
                        { label: 'Policy', href: '/doctor/policy' },
                    ]}
                />
            </div>
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1); }
                    }

                    .patient-list ul::-webkit-scrollbar {
                        width: 8px;
                    }

                    .patient-list ul::-webkit-scrollbar-track {
                        background: rgba(121,184,255,0.12);
                        border-radius: 999px;
                    }

                    .patient-list ul::-webkit-scrollbar-thumb {
                        background: rgba(47,119,214,0.35);
                        border-radius: 999px;
                    }

                    .patient-list ul::-webkit-scrollbar-thumb:hover {
                        background: rgba(47,119,214,0.54);
                    }
                `}
            </style>
            {/* Modals & Notifications */}
            <CustomModal
                isOpen={dischargeModal.isOpen}
                onClose={() => setDischargeModal({ isOpen: false, patientId: null, patientName: "" })}
                onConfirm={confirmDischarge}
                title="Discharge Patient?"
                message={`Are you sure you want to discharge ${dischargeModal.patientName}? This will remove them from the active monitoring list and conclude their current clinical session.`}
                confirmText="Confirm Discharge"
            />

            <AnimatePresence>
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onClose={handleCloseNotification}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}