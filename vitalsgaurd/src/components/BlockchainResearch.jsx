'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { patients as initialPatients } from '../data/mockVitals';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Header } from './Header';
import { Footer } from './Footer';
import { ShinyButton } from './ui/button';
import { Database, Shield, Cpu, ArrowUpRight, History, Activity, LogOut, ArrowLeft, RotateCcw, ShieldCheck, Lock, Globe, FileText, CheckCircle2 } from 'lucide-react';

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

const initialTransactions = [
  { id: 1, hash: '0x7d8a...f2e1', group: 'Mayo Clinic AI', type: 'Synthetic', date: '2026-03-24 09:15', status: 'verified' },
  { id: 2, hash: '0x3c1b...a9d4', group: 'Oxford Health Lab', type: 'Anonymized', date: '2026-03-24 10:02', status: 'verified' },
  { id: 3, hash: '0x9e4f...c1b2', group: 'Global Cardio Registry', type: 'Synthetic', date: '2026-03-24 10:38', status: 'pending' },
];

export default function BlockchainResearch() {
  const navigate = useNavigate();
  const [researchPatients, setResearchPatients] = useState(initialPatients);
  const [selectedPatient, setSelectedPatient] = useState(initialPatients[0]);
  const [syntheticStatus, setSyntheticStatus] = useState('idle'); // idle, generating, ready
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [lastTxHash, setLastTxHash] = useState('');

  const handleGenerateSynthetic = () => {
    setSyntheticStatus('generating');
    setTimeout(() => {
      setSyntheticStatus('ready');
    }, 2500);
  };

  const handlePushToLedger = (type) => {
    const newTx = {
      id: Date.now(),
      hash: '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6),
      group: 'University Research Group',
      type: type,
      date: new Date().toLocaleString(),
      status: 'pending'
    };
    
    // Remove the current patient from the list after push
    const remainingPatients = researchPatients.filter(p => p.id !== selectedPatient.id);
    
    setTransactions([newTx, ...transactions]);
    
    setTimeout(() => {
      setTransactions(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, status: 'verified' } : tx));
      setResearchPatients(remainingPatients);
      if (remainingPatients.length > 0) {
        setSelectedPatient(remainingPatients[0]);
      }
      setSyntheticStatus('idle');
      setLastTxHash(newTx.hash);
      setShowVaultModal(true);
    }, 2000);
  };

  const syntheticData = selectedPatient?.vitals.map(v => ({
    ...v,
    hr: Math.round(v.hr + (Math.random() * 4 - 2)),
    spo2: Math.min(100, Math.round(v.spo2 + (Math.random() * 2 - 1))),
  })) || [];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 34%, #ecfdf5 62%, #f0fdf4 100%)', color: '#0f2d58', fontFamily: "'Inter', sans-serif" }}>
      
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

        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', width: 'fit-content' }}>
                <Database style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.1em', color: '#3b82f6', textTransform: 'uppercase' }}>Research Node VG-8821</span>
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#0f2d58', margin: '0' }}>Blockchain <span style={{ color: '#10b981' }}>Research</span></h1>
              <p style={{ fontSize: '1rem', color: '#475569', maxWidth: '500px', margin: '0', lineHeight: '1.5', fontWeight: '500' }}>Direct access to the institutional synthesis engine and immutable clinical ledger.</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              style={{ display: 'flex', gap: '1rem' }}
            >
              <ShinyButton
                variant="blue"
                onClick={() => navigate('/admin')}
                icon={<ArrowLeft className="w-4 h-4" />}
                className="h-10 px-6"
              >
                Back
              </ShinyButton>
            </motion.div>
          </div>

          {/* Blockchain KPI Row Integration */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {[
              { title: 'Data Anonymization', metric: '247', unit: 'Records', icon: <Lock className="text-blue-500" />, status: 'Active' },
              { title: 'Blockchain Commits', metric: '1,294', unit: 'Tx', icon: <Database className="text-blue-500" />, status: 'Synced' },
              { title: 'Research Access', metric: '12', unit: 'Pending', icon: <Globe className="text-blue-500" />, status: 'Review' },
              { title: 'Export Audits', metric: '89', unit: 'Logged', icon: <FileText className="text-blue-500" />, status: 'Compliant' },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  padding: '1.5rem',
                  borderRadius: '24px',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  boxShadow: '0 10px 30px rgba(16, 185, 129, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    {card.icon}
                  </div>
                  <div style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.08)', color: '#1e40af', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {card.status}
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0', fontSize: '0.8rem', fontWeight: 'bold', color: '#5a7a9e' }}>{card.title}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f2d58' }}>{card.metric}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#5a7a9e' }}>{card.unit}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '2rem', marginBottom: '2rem' }}>
            {/* AI Synthetic Generator Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '900', color: '#0f2d58', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    AI Synthetic Generator
                  </h3>
                  <p style={{ margin: '0', fontSize: '0.85rem', color: '#5a7a9e', fontWeight: '500' }}>Anonymize records via deep synthesis</p>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Model-09 Ready
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#5a7a9e', marginBottom: '0.5rem', display: 'block' }}>Reference Source Patient</label>
                {researchPatients.length > 0 ? (
                  <select 
                    value={selectedPatient?.id}
                    onChange={(e) => setSelectedPatient(researchPatients.find(p => p.id === e.target.value))}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      background: 'white',
                      color: '#1e293b',
                      fontWeight: '800',
                      fontSize: '0.95rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
                    }}
                  >
                    {researchPatients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                  </select>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '14px', border: '1px dashed #10b981', color: '#10b981', textAlign: 'center', fontWeight: 'bold' }}>
                    Queue Fully Processed
                  </div>
                )}
              </div>

              <div style={{
                aspectRatio: '1.8/1',
                borderRadius: '20px',
                border: '2px dashed rgba(16, 185, 129, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(16, 185, 129, 0.03)',
                padding: '2rem',
                textAlign: 'center'
              }}>
              <AnimatePresence mode="wait">
                {syntheticStatus === 'idle' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}>
                      <Activity style={{ width: '32px', height: '32px', color: '#10b981' }} />
                    </div>
                    {researchPatients.length > 0 ? (
                      <>
                        <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#5a7a9e', margin: '0' }}>Ready for statistical synthesis</p>
                        <ShinyButton
                          variant="green"
                          onClick={handleGenerateSynthetic}
                          icon={<Cpu className="w-4 h-4" />}
                        >
                          Initiate Synthesis
                        </ShinyButton>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981', margin: '0' }}>All patients successfully on-boarded</p>
                    )}
                  </motion.div>
                )}
                {syntheticStatus === 'generating' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="spinning-loader" style={{ width: '56px', height: '56px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase', animation: 'pulse 2s ease-in-out infinite' }}>Synthesizing Alpha Stream...</p>
                  </motion.div>
                )}
                {syntheticStatus === 'ready' && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      <Shield style={{ width: '32px', height: '32px', color: '#10b981' }} />
                    </div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0' }}>Synthesis Verified [98.4% Fidelity]</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                      <button 
                        onClick={() => setSyntheticStatus('idle')}
                        style={{ background: 'transparent', border: 'none', color: '#334155', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                      >
                        <RotateCcw style={{ width: '16px', height: '16px' }} />
                        Reset
                      </button>
                      <ShinyButton
                        variant="green"
                        onClick={() => handlePushToLedger('Secure Vault Sync')}
                        icon={<ShieldCheck className="w-4 h-4" />}
                      >
                        Push to Ledger
                      </ShinyButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>

            {/* Clinical Signal Simulation Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.05)',
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '900', color: '#0f2d58', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  Clinical Signal Simulation
                </h3>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#5a7a9e', fontWeight: '500' }}>{syntheticStatus === 'ready' ? "Synthesized Trace Overlay" : "Real-time Patient Vitals"}</p>
              </div>

              <div style={{
                height: '280px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.1)',
                padding: '1rem'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedPatient?.vitals || []}>
                    <defs>
                      <linearGradient id="originalHr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="syntheticHr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#10b981" opacity={0.1} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)', color: '#0f2d58' }} />
                    
                    {/* Original Patient Stream */}
                    <Area 
                      type="monotone" 
                      dataKey="hr" 
                      stroke="#10b981" 
                      fill="url(#originalHr)" 
                      strokeWidth={3} 
                      name="Original Trace"
                      animationDuration={1500}
                    />

                    {/* Synthetic Trace Overlay */}
                    {syntheticStatus === 'ready' && (
                      <Area 
                        type="monotone" 
                        data={syntheticData}
                        dataKey="hr" 
                        stroke="#2dd4bf" 
                        fill="url(#syntheticHr)" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                        name="Synthetic Fidelity"
                        animationDuration={1500}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <p style={{ fontSize: '0.7rem', color: '#5a7a9e', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Data Stream</p>
                  <p style={{ fontWeight: 'bold', color: '#0f2d58', margin: '0' }}>{syntheticStatus === 'ready' ? "AI Synthetic" : "Normal Patient"}</p>
                </div>
                <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <p style={{ fontSize: '0.7rem', color: '#5a7a9e', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Verified</p>
                  <p style={{ fontWeight: 'bold', color: '#10b981', margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                    100% Secure
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Immutable Research Ledger */}
          <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.05)',
              }}
            >
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#0f2d58' }}>Immutable Research Ledger</h3>
                <p style={{ margin: '0', fontSize: '0.9rem', color: '#5a7a9e', fontWeight: '500' }}>Audit node: VG-8821 Active Certification</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: '16px', background: 'white', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0f2d58' }}>MAINNET-01 SYNCED</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 45, 88, 0.02)', borderBottom: '1px solid rgba(15, 45, 88, 0.05)' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Log Hash</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Research Group</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {transactions.map((tx, idx) => (
                      <motion.tr 
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.1 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: '1px solid rgba(15, 45, 88, 0.05)', background: idx % 2 === 0 ? 'rgba(15, 45, 88, 0.01)' : 'transparent' }}
                      >
                        <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6' }}>{tx.hash}</td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f2d58' }}>{tx.group}</td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#5a7a9e' }}>{tx.date}</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'white' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.status === 'verified' ? "#10b981" : "#f59e0b" }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: tx.status === 'verified' ? "#10b981" : "#f59e0b", textTransform: 'uppercase' }}>{tx.status}</span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(15, 45, 88, 0.05)', background: 'rgba(15, 45, 88, 0.01)' }}>
               <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <History className="w-4 h-4" />
                LOAD COMPLETE AUDIT HISTORY
              </button>
            </div>
          </motion.div>

          {/* Custom Success Modal */}
          <AnimatePresence>
            {showVaultModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
                onClick={() => setShowVaultModal(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={e => e.stopPropagation()}
                  style={{ 
                    background: 'white', 
                    padding: '2.5rem', 
                    borderRadius: '32px', 
                    maxWidth: '480px', 
                    width: '90%', 
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem auto' }}>
                    <ShieldCheck style={{ width: '40px', height: '40px', color: '#3b82f6' }} />
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.75rem 0' }}>Commitment Successful</h2>
                  <p style={{ fontSize: '1rem', color: '#475569', marginBottom: '2rem', lineHeight: '1.5' }}>
                    Clinical data has been securely committed and stored in the **Tier-4 Institutional Research Vault**.
                  </p>
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Immutable Transaction Hash</p>
                    <code style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 'bold', wordBreak: 'break-all', fontFamily: 'monospace' }}>{lastTxHash}</code>
                  </div>
                  <button 
                    onClick={() => setShowVaultModal(false)}
                    style={{ 
                      width: '100%', 
                      padding: '1.25rem', 
                      borderRadius: '16px', 
                      background: '#0f2d58', 
                      color: 'white', 
                      fontSize: '1rem', 
                      fontWeight: '800', 
                      border: 'none', 
                      cursor: 'pointer',
                      boxShadow: '0 10px 20px rgba(15,45,88,0.2)'
                    }}
                  >
                    CLOSE AUDIT
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
