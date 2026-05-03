import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000/api';

const getRiskColor = (condition) => {
  const c = condition.toLowerCase();
  if (c.includes('normal') || c.includes('stable')) return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
  if (c.includes('mild') || c.includes('monitor')) return { bg: '#fffbeb', border: '#fef3c7', text: '#92400e' };
  if (c.includes('fever') || c.includes('risk')) return { bg: '#fff7ed', border: '#ffedd5', text: '#9a3412' };
  return { bg: '#fef2f2', border: '#fee2e2', text: '#991b1b' };
};

export default function Simulator() {
  const navigate = useNavigate();
  const [hr, setHr] = useState(75);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.6);
  const [respRate, setRespRate] = useState(16);
  const [sysBp, setSysBp] = useState(120);

  const [mlResult, setMlResult] = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const response = await fetch(`${API_BASE}/ews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heart_rate: hr, spo2, temperature: temp, respiratory_rate: respRate, systolic_bp: sysBp })
        });
        const data = await response.json();
        if (data.ews) {
          const score = data.ews.score;
          const level = data.ews.level;
          // Generate a simulated trajectory based on the EWS
          const simulatedResult = {
            overall_trajectory: level === 'stable' ? 'improving' : 'deteriorating',
            '2h': { condition: level === 'stable' ? 'Stable' : 'Slight Risk' },
            '6h': { condition: level === 'stable' ? 'Normal' : 'Medical Review' },
            '12h': { condition: level === 'stable' ? 'Baseline' : 'Early Warning' },
            '24h': { condition: level === 'stable' ? 'Recovery' : 'Clinical Watch' }
          };
          setMlResult(simulatedResult);
        }
      } catch (err) { console.error("Simulator ML Fetch Failed", err); }
    };
    const delay = setTimeout(fetchPrediction, 300);
    return () => clearTimeout(delay);
  }, [hr, spo2, temp, respRate, sysBp]);

  const AdjustmentRow = ({ label, value, unit, setVal, step, icon }) => (
    <div style={{ marginBottom: '2rem', padding: '1.2rem', background: '#f8fafc', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.95rem' }}>{label}</span>
      </div>
      <input
        type="range"
        min={label.includes('HR') ? 40 : label.includes('SpO2') ? 70 : 35}
        max={label.includes('HR') ? 200 : label.includes('SpO2') ? 100 : 42}
        step={step}
        value={value}
        onChange={(e) => setVal(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#7C3AED', height: '6px', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
        <button onClick={() => setVal(v => Math.max(0, v - step * 5))} style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>- {step * 5} {unit}</button>
        <button onClick={() => setVal(v => v + step * 5)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>+ {step * 5} {unit}</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1.8rem', fontWeight: '800', color: '#6366f1' }}>{value} <span style={{ fontSize: '1rem' }}>{unit}</span></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', padding: '2rem', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#4338ca', margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Vitals Simulator</h1>
        <button onClick={() => navigate(-1)} style={{ padding: '0.7rem 1.4rem', border: 'none', background: '#fff', color: '#4338ca', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>← Dashboard</button>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        {/* Left Column: Interactive Controls */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎮</span>
            <h2 style={{ margin: 0, color: '#4338ca', fontSize: '1.4rem' }}>Interactive Health Simulator</h2>
          </div>

          <AdjustmentRow label="Heart Rate" value={hr} unit="BPM" setVal={setHr} step={5} icon="❤️" />
          <AdjustmentRow label="SpO₂ Level" value={spo2} unit="%" setVal={setSpo2} step={1} icon="💨" />
          <AdjustmentRow label="Temperature" value={temp} unit="°C" setVal={setTemp} step={0.2} icon="🌡️" />

          <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>🫁 Respiration</div>
              <input type="number" value={respRate} onChange={e => setRespRate(Number(e.target.value))} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', color: '#4338ca' }} />
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>📊 Blood Pressure (Sys)</div>
              <input type="number" value={sysBp} onChange={e => setSysBp(Number(e.target.value))} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', color: '#4338ca' }} />
            </div>
          </div>
        </div>

        {/* Right Column: Projections */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📈</span>
            <h2 style={{ margin: 0, color: '#4338ca', fontSize: '1.4rem' }}>Projected Health Risks</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1 }}>
            {mlResult ? ['2h', '6h', '12h', '24h'].map(time => {
              const condition = mlResult[time].condition.replace('_', ' ');
              const style = getRiskColor(condition);
              return (
                <div key={time} style={{ background: style.bg, border: `1px solid ${style.border}`, padding: '1.2rem 1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{time.replace('h', ' hours')}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: style.text }}>{condition}</div>
                </div>
              );
            }) : <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Calculating future risks...</p>}
          </div>

          {mlResult && (
            <div style={{ marginTop: '2.5rem', background: '#f5f3ff', borderLeft: '6px solid #4338ca', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '800', color: '#4338ca', fontSize: '0.9rem' }}>AI Insight:</span>
              </div>
              <p style={{ margin: 0, color: '#1e1b4b', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: '500' }}>
                Based on the current trajectory, the patient's condition is likely to remain <strong>{mlResult.overall_trajectory}</strong>.
                Observe {mlResult['2h'].condition.toLowerCase()} trends closely over the next few hours.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}