'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { patients } from '../data/mockVitals';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { Footer } from './Footer';
import { LogOut, Activity, Plus, ArrowRight, Shield, HeartPulse, Zap } from 'lucide-react';
import { Button, ShinyButton } from './ui/button';

function ElegantShape({
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "linear-gradient(135deg, rgba(16,185,129,0.48), rgba(167,243,208,0.34), rgba(255,255,255,0.24))",
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
            boxShadow: "0 34px 90px rgba(16,185,129,0.3)",
            backdropFilter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.56), rgba(209,250,229,0.18) 42%, transparent 70%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

const defaultGradientColors = {
  primary: '#10b981',
  secondary: '#34d399',
  accent: '#f7a7c0',
};

const BorderRotate = ({
  children,
  className = '',
  animationMode = 'auto-rotate',
  animationSpeed = 6,
  gradientColors = defaultGradientColors,
  backgroundColor = 'rgba(255, 255, 255, 0.92)',
  borderWidth = 2,
  borderRadius = 20,
  style = {},
  ...props
}) => {
  const getAnimationClass = () => {
    switch (animationMode) {
      case 'auto-rotate':
        return 'gradient-border-auto';
      case 'rotate-on-hover':
        return 'gradient-border-hover';
      case 'stop-rotate-on-hover':
        return 'gradient-border-stop-hover';
      default:
        return '';
    }
  };

  const combinedStyle = {
    '--border-width': `${borderWidth}px`,
    '--border-radius': `${borderRadius}px`,
    '--animation-duration': `${animationSpeed}s`,
    '--primary': gradientColors.primary,
    '--secondary': gradientColors.secondary,
    '--accent': gradientColors.accent,
    '--bg-color': backgroundColor,
    border: `${borderWidth}px solid transparent`,
    borderRadius: `${borderRadius}px`,
    backgroundImage: `
      linear-gradient(${backgroundColor}, ${backgroundColor}),
      conic-gradient(${gradientColors.primary}, ${gradientColors.secondary}, ${gradientColors.accent}, ${gradientColors.secondary}, ${gradientColors.primary})
    `,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'padding-box, border-box',
    ...style,
  };

  return (
    <div
      className={`gradient-border-component ${getAnimationClass()} ${className}`}
      style={combinedStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [infra, setInfra] = useState({
    voltage: 231,
    load: 62,
    powerSource: 'Main Grid',
    o2Pressure: 84,
    n2oLevel: 12.5,
    medAir: 46
  });

  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [acknowledgingIds, setAcknowledgingIds] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setInfra(prev => ({
        voltage: Math.round(230 + (Math.random() * 4 - 2)),
        load: Math.round(60 + (Math.random() * 6 - 3)),
        powerSource: Math.random() > 0.99 ? 'Backup Gen' : 'Main Grid',
        o2Pressure: Math.round(85 + (Math.random() * 6 - 3)),
        n2oLevel: parseFloat((12 + Math.random()).toFixed(1)),
        medAir: Math.round(45 + (Math.random() * 4 - 2))
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Emergency Alerts from Node Backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('http://localhost:5003/alerts');
        const data = await res.json();
        if (data.success) {
          // Check for new alerts to show toast
          if (emergencyCalls.length > 0 && data.alerts.length > emergencyCalls.length) {
            const lastAlert = data.alerts[data.alerts.length - 1];
            setToast({ message: `NEW EMERGENCY: ${lastAlert.alert} for ${lastAlert.patientName}`, type: 'error' });
            setTimeout(() => setToast(null), 6000);
          }
          setEmergencyCalls(data.alerts);
          setConnectionStatus('online');
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
        setConnectionStatus('offline');
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [emergencyCalls.length]);

  const handleRespondToAlert = async (alertId) => {
    // Optimistic UI update for the "ACK" state
    setAcknowledgingIds(prev => [...prev, alertId]);
    
    try {
      const res = await fetch(`http://localhost:5003/alerts/${alertId}/respond`, {
        method: 'PATCH'
      });
      const data = await res.json();
      
      if (data.success) {
        // Wait a bit to show the "ACK" state before removing
        setTimeout(() => {
          setEmergencyCalls(prev => prev.filter(c => c.id !== alertId));
          setAcknowledgingIds(prev => prev.filter(id => id !== alertId));
        }, 1200);
      } else {
        setAcknowledgingIds(prev => prev.filter(id => id !== alertId));
        alert("Failed to respond to alert.");
      }
    } catch (err) {
      console.error("Respond error:", err);
      setAcknowledgingIds(prev => prev.filter(id => id !== alertId));
      alert("Network error while responding.");
    }
  };

  const counts = patients.reduce(
    (acc, patient) => {
      acc[patient.vitals[patient.vitals.length - 1].status] += 1;
      return acc;
    },
    { stable: 0, warning: 0, critical: 0 }
  );

  const chartData = [
    { name: 'Stable', value: counts.stable },
    { name: 'Warning', value: counts.warning },
    { name: 'Critical', value: counts.critical + emergencyCalls.length }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 34%, #ecfdf5 62%, #f0fdf4 100%)", color: '#0f2d58', fontFamily: "'Inter', sans-serif" }}>
      
      {/* High-Fidelity Geometry Background Layer */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(16,185,129,0.36), transparent 34%), radial-gradient(circle at left center, rgba(52,211,153,0.22), transparent 42%), radial-gradient(circle at center center, rgba(16,185,129,0.12), transparent 46%), radial-gradient(circle at top right, rgba(52,211,153,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(16,185,129,0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(134,215,195,0.12), transparent 26%)",
          }}
        />
        <ElegantShape
          delay={0.2}
          width={620}
          height={138}
          rotate={12}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.42), rgba(167,243,208,0.28), rgba(255,255,255,0.2))"
          style={{ left: "-6%", top: "12%" }}
        />
        <ElegantShape
          delay={0.35}
          width={360}
          height={92}
          rotate={-18}
          gradient="linear-gradient(135deg, rgba(20,184,166,0.32), rgba(255,255,255,0.26))"
          style={{ right: "2%", top: "16%" }}
        />
        <ElegantShape
          delay={0.5}
          width={420}
          height={108}
          rotate={-10}
          gradient="linear-gradient(135deg, rgba(5,150,105,0.28), rgba(209,250,229,0.18), rgba(255,255,255,0.2))"
          style={{ left: "8%", bottom: "16%" }}
        />
        <ElegantShape
          delay={0.65}
          width={240}
          height={70}
          rotate={20}
          gradient="linear-gradient(135deg, rgba(255,255,255,0.28), rgba(16,185,129,0.32), rgba(167,243,208,0.18))"
          style={{ right: "12%", bottom: "12%" }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <Header 
          links={[
            { label: 'Overview', href: '/admin' },
            { label: 'Research', href: '/admin/research' },
            { label: 'Policy', href: '/admin/policy' },
          ]}
        />

        <div className="max-w-[1600px] mx-auto px-8 pt-6">
          <motion.div 
            className="flex justify-between items-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: "circOut" }}
          >
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #10b981, #d1fae5)",
                  boxShadow: "0 10px 20px rgba(16,185,129,0.15)",
                }}
              >
                <HeartPulse color="#065f46" size={24} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">VitalsGuard <span className="text-emerald-600">Command</span></h1>
            </div>
            <motion.div 
              className="flex gap-4 items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 systems-live">
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: connectionStatus === 'online' ? '#22c55e' : (connectionStatus === 'checking' ? '#f59e0b' : '#ef4444'),
                    boxShadow: connectionStatus === 'online' ? '0 0 10px #22c55e' : 'none'
                  }} />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {connectionStatus === 'online' ? 'Connected' : (connectionStatus === 'checking' ? 'Connecting...' : 'Offline')}
                  </span>
                </div>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="h-10 px-6 rounded-full border-blue-200 bg-white text-blue-600 hover:bg-blue-50 shadow-sm font-bold flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <main style={{ padding: '0 2rem 2rem', maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* Upper Grid: KPIs & Doctor Emergencies */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Patient Overview KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[
                { label: 'TOTAL PATIENTS', value: patients.length, detail: 'Across all wards', color: '#10b981' },
                { label: 'ACTIVE WARNINGS', value: counts.warning, detail: 'Moderately unstable', color: '#f59e0b' },
                { label: 'CRITICAL ALERTS', value: counts.critical + emergencyCalls.length, detail: 'Immediate action req.', color: '#ef4444' }
              ].map((kpi, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  style={{ background: 'rgba(255,255,255,0.88)', padding: '1.5rem', borderRadius: '24px', border: '1.5px solid #cbd5e1', boxShadow: '0 10px 30px rgba(15,45,88,0.05)' }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', fontWeight: '800' }}>
                    {kpi.label}
                  </div>
                  <motion.div 
                    style={{ fontSize: '3rem', fontWeight: '900', color: kpi.color }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 + 0.2 }}
                  >
                    {kpi.value}
                  </motion.div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>{kpi.detail}</div>
                </motion.div>
              ))}
              
              {/* Status Dist. Chart */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.88)', padding: '1.5rem', borderRadius: '24px', border: '1.5px solid #cbd5e1', boxShadow: '0 10px 30px rgba(15,45,88,0.05)' }}
              >
                 <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>PATIENT STATUS DISTRIBUTION</h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ flex: 1, height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie dataKey="value" data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1 }}>
                      {chartData.map((entry, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span style={{ color: COLORS[idx], fontWeight: 'bold' }}>{entry.name}</span>
                          <span style={{ color: '#475569' }}>{entry.value} Patients</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </motion.div>
            </div>

            {/* Dr. Emergency Dispatch */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              style={{ height: '100%' }}
            >
              <BorderRotate
                animationMode="rotate-on-hover"
                borderRadius={34}
                style={{ padding: '2px', height: '100%' }}
                gradientColors={{ primary: '#10b981', secondary: '#34d399', accent: '#f7a7c0' }}
              >
                <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', padding: '2rem', borderRadius: '32px', border: '1.5px solid #cbd5e1', boxShadow: '0 20px 40px rgba(16,185,129,0.05)', height: 'calc(100% - 4px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity className="w-5 h-5 text-red-500" /> DOCTOR EMERGENCY DISPATCH
                  </h3>
                  <motion.div 
                    style={{ background: 'rgba(254, 226, 226, 0.4)', color: '#dc2626', padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', border: '1.5px solid rgba(220, 38, 38, 0.25)', letterSpacing: '0.05em' }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {emergencyCalls.length} ACTIVE EMERGENCY
                  </motion.div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <AnimatePresence>
                    {emergencyCalls.map((call, idx) => (
                      <motion.div 
                        key={call.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ 
                          opacity: 1, 
                          x: 0,
                          backgroundColor: acknowledgingIds.includes(call.id) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 250, 252, 0.8)',
                        }}
                        viewport={{ once: true, amount: 0.2 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        whileHover={{ scale: 1.01 }}
                        className="grid grid-cols-[1fr_auto] items-center p-4 rounded-2xl border transition-all"
                        style={{ 
                          borderLeft: `6px solid ${call.urgency === 'critical' ? '#ef4444' : '#f59e0b'}`,
                          borderColor: acknowledgingIds.includes(call.id) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.1)',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold text-[#1e293b] text-base leading-tight truncate">
                              {call.doctor} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '0.8rem' }}>for</span> {call.patientName}
                            </div>
                            <div className="text-xs text-slate-500 font-medium my-0.5">
                              {call.location} • <span style={{ color: call.urgency === 'critical' ? '#ef4444' : '#f59e0b', fontWeight: '800' }}>{call.alert}</span>
                            </div>
                            {call.requirements && call.requirements.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {call.requirements.map((req, rIdx) => (
                                  <span key={rIdx} style={{ fontSize: '10px', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%' }} /> {req}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            className={`scale-90 h-8 px-3 text-[10px] uppercase font-black transition-all ${
                              acknowledgingIds.includes(call.id) 
                              ? 'border-blue-200 bg-blue-50/50 text-blue-600' 
                              : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                            onClick={() => handleRespondToAlert(call.id)}
                            disabled={acknowledgingIds.includes(call.id)}
                          >
                            {acknowledgingIds.includes(call.id) ? 'ACKNOWLEDGED' : 'RESPOND NOW'}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                </div>
              </BorderRotate>
            </motion.div>
          </div>


          {/* Infrastructure Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <BorderRotate
              animationMode="rotate-on-hover"
              borderRadius={30}
              style={{ padding: '2px' }}
              gradientColors={{ primary: '#3b82f6', secondary: '#60a5fa', accent: '#0f2d58' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: '28px', padding: '2rem', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.2rem', fontWeight: '900', color: '#0f2d58', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'grid', placeItems: 'center' }}>
                  <Zap className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                </div> 
                INFRASTRUCTURE MONITORING
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Electrical Card */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1.5px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                     <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.8rem' }}>ELECTRICAL</span>
                     <span style={{ color: '#0f2d58', fontSize: '0.7rem', fontWeight: 'bold' }}>{infra.powerSource}</span>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>{infra.voltage}V</div>
                         <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>LINE</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>{infra.load}%</div>
                         <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>LOAD</div>
                      </div>
                   </div>
                </motion.div>

                {/* Medical Gas Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1.5px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                >
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                     <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.8rem' }}>MEDICAL GAS</span>
                     <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold' }}>STABLE</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                     <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{infra.o2Pressure}</div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>O2</div>
                     </div>
                     <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{infra.n2oLevel}</div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>N2O</div>
                     </div>
                   </div>
                </motion.div>

                {/* AI suggestion */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1.5px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                >
                   <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f2d58', fontSize: '0.9rem', fontWeight: 'bold' }}>AI RESOURCE SUGGESTION</h4>
                   <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                     Optimize O2 reserve by 5% for expected Ward C peak.
                   </p>
                </motion.div>

              </div>
              </div>
            </BorderRotate>
          </motion.div>
        </main>
        <Footer />
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                background: '#ef4444',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
                zIndex: 1000,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '2px solid rgba(255,255,255,0.2)'
              }}
            >
              <span>{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>
        {`
          @keyframes gradient-rotate {
            0% { box-shadow: 0 30px 55px rgba(16, 185, 129, 0.05); }
            50% { box-shadow: 0 40px 70px rgba(16, 185, 129, 0.15); }
            100% { box-shadow: 0 30px 55px rgba(16, 185, 129, 0.05); }
          }
          .gradient-border-component {
            position: relative;
            border-radius: var(--border-radius, 20px);
            overflow: hidden;
          }
          .gradient-border-component.gradient-border-auto {
            animation: gradient-rotate var(--animation-duration) linear infinite;
          }
          .gradient-border-component.gradient-border-hover:hover {
            animation: gradient-rotate var(--animation-duration) linear infinite;
          }
          .systems-live {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
          }
        `}
      </style>
    </div>
  );
}
