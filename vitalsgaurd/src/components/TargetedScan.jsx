import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DigitalTwin from './DigitalTwin';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export default function TargetedScan() {
  const [hr, setHr] = useState(75);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.6);

  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const navigate = useNavigate();

  async function handleAnalyze() {
    setAnalyzing(true);
    setScanResult(null);
    setError(null);
    try {
      const storedUser = localStorage.getItem('vg_user');
      const userId = storedUser ? JSON.parse(storedUser).userId : null;

      // Hitting the Node Auth Server. The node server proxies the request to Python
      // and securely logs the result into the 'medical_reports' Supabase table.
      const response = await axios.post('http://localhost:5003/store-report', {
        userId,
        scanType: 'Targeted Scan',
        heartRate: hr,
        spo2: spo2,
        temperature: temp,
      });

      if (response.data.success) {
        setScanResult(response.data.data);
      } else {
        throw new Error(response.data.message || 'Analysis proxy failed');
      }

    } catch (err) {
      console.error(err);
      setError('Health analysis system is currently unavailable.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#e2e8f0', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <header style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #334155', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>🧬</span>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#38bdf8' }}>Targeted AI Diagnostics</h1>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>← Back to Dashboard</button>
      </header>

      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
        {/* Sidebar Controls */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#38bdf8', fontSize: '1.1rem', marginTop: 0, marginBottom: '1.5rem' }}>⚙️ Scan Parameters</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Heart Rate: <strong>{hr} BPM</strong></label>
                <input type="range" min="40" max="180" value={hr} onChange={e => setHr(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>SpO₂ Level: <strong>{spo2} %</strong></label>
                <input type="range" min="80" max="100" value={spo2} onChange={e => setSpo2(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Body Temp: <strong>{temp} °C</strong></label>
                <input type="range" min="35" max="41" step="0.1" value={temp} onChange={e => setTemp(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{ width: '100%', padding: '1rem', marginTop: '1rem', background: analyzing ? '#475569' : '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: analyzing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
              >
                {analyzing ? '⚡ ANALYZING...' : '🚀 RUN TARGETED SCAN'}
              </button>
            </div>
          </div>

          {scanResult && (
            <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #38bdf8', boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)' }}>
              <h3 style={{ color: '#38bdf8', fontSize: '1rem', marginTop: 0 }}>AI Clinical Report</h3>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', margin: '0.8rem 0', textTransform: 'uppercase' }}>
                {scanResult.ui_label || scanResult.condition}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {scanResult.voice_summary || scanResult.consensus}
              </p>
              <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.8rem', color: '#38bdf8', textAlign: 'center' }}>
                AI Confidence: <strong>{scanResult.lstm_result?.confidence ? Math.round(scanResult.lstm_result.confidence * 100) : scanResult.confidence || 'N/A'}%</strong>
              </div>
            </div>
          )}
        </aside>

        {/* Visualization Area */}
        <section style={{ position: 'relative', background: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minHeight: '600px' }}>
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
            <div style={{ color: '#38bdf8', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.8rem', marginBottom: '4px' }}>LIVE SCANNING</div>
            <div style={{ width: '40px', height: '2px', background: '#38bdf8', animation: 'pulse 2s infinite' }}></div>
          </div>

          <DigitalTwin scanData={scanResult} isScanning={analyzing} />

          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }}>
              <div style={{ color: '#ef4444', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>⚠️</span>
                <p>{error}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; width: 40px; }
          50% { opacity: 0.3; width: 60px; }
          100% { opacity: 1; width: 40px; }
        }
      `}</style>
    </div>
  );
}