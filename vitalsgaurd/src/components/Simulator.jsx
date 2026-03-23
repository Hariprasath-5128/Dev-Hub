import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Simulator() {
  const [hr, setHr] = useState(75);
  const [spo2, setSpo2] = useState(98);
  const navigate = useNavigate();

  function calculateRisks() {
    const risks = [];
    if (hr > 90) {
      risks.push({ time: '2 hours', risk: 'Increased cardiac stress', level: 'warning' });
      risks.push({ time: '6 hours', risk: 'Possible arrhythmia onset', level: 'critical' });
    } else if (hr > 80) {
      risks.push({ time: '2 hours', risk: 'Mild stress elevation', level: 'stable' });
      risks.push({ time: '6 hours', risk: 'Monitor for escalation', level: 'warning' });
    } else {
      risks.push({ time: '2 hours', risk: 'Stable condition', level: 'stable' });
      risks.push({ time: '6 hours', risk: 'Low risk profile', level: 'stable' });
    }

    if (spo2 < 95) {
      risks.push({ time: '2 hours', risk: 'Hypoxemia risk', level: 'warning' });
      risks.push({ time: '6 hours', risk: 'Respiratory distress possible', level: 'critical' });
    } else if (spo2 < 97) {
      risks.push({ time: '2 hours', risk: 'Mild oxygen desaturation', level: 'warning' });
      risks.push({ time: '6 hours', risk: 'Monitor oxygen levels', level: 'stable' });
    }

    return risks;
  }

  const risks = calculateRisks();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', padding: '20px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#7C3AED', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>🎮 Interactive Health Risk Simulator</h1>
        <button onClick={() => navigate(-1)} style={{ backgroundColor: '#7C3AED', color: 'white', padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          ← Back to Dashboard
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Controls Section */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#7C3AED', marginTop: 0 }}>⚙️ Adjust Parameters</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Heart Rate Control */}
            <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <label style={{ display: 'block', marginBottom: '1rem', color: '#333', fontWeight: '600', fontSize: '1rem' }}>❤️ Heart Rate (BPM)</label>
              <input
                type="range"
                min="50"
                max="120"
                value={hr}
                onChange={e => setHr(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', marginBottom: '1rem' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button onClick={() => setHr(Math.max(50, hr - 5))} style={{ padding: '0.6rem', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#7C3AED' }}>
                  - 5
                </button>
                <button onClick={() => setHr(Math.min(120, hr + 5))} style={{ padding: '0.6rem', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#7C3AED' }}>
                  + 5
                </button>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7C3AED', marginTop: '1rem', textAlign: 'center' }}>{hr} BPM</div>
            </div>

            {/* SpO2 Control */}
            <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <label style={{ display: 'block', marginBottom: '1rem', color: '#333', fontWeight: '600', fontSize: '1rem' }}>💨 SpO₂ (%)</label>
              <input
                type="range"
                min="85"
                max="100"
                value={spo2}
                onChange={e => setSpo2(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', marginBottom: '1rem' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button onClick={() => setSpo2(Math.max(85, spo2 - 2))} style={{ padding: '0.6rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#3B82F6' }}>
                  - 2
                </button>
                <button onClick={() => setSpo2(Math.min(100, spo2 + 2))} style={{ padding: '0.6rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#3B82F6' }}>
                  + 2
                </button>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3B82F6', marginTop: '1rem', textAlign: 'center' }}>{spo2}%</div>
            </div>
          </div>
        </div>

        {/* Risk Projections */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#7C3AED', marginTop: 0 }}>📈 Projected Health Risks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {risks.map((risk, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.5rem',
                  borderLeft: `4px solid ${risk.level === 'critical' ? '#DC2626' : risk.level === 'warning' ? '#F97316' : '#10b981'}`,
                  background: risk.level === 'critical' ? '#fef2f2' : risk.level === 'warning' ? '#fffbeb' : '#f0fdf4',
                  borderRadius: '8px',
                  border: `1px solid ${risk.level === 'critical' ? '#fecaca' : risk.level === 'warning' ? '#fed7aa' : '#bbf7d0'}`,
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>{risk.time}</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>{risk.risk}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#7C3AED', marginTop: 0 }}>🤖 AI Analysis</h3>
          <div style={{ background: '#ede9fe', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #7C3AED' }}>
            <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>
              Based on current parameters, the system predicts <strong>{risks.length > 0 ? risks[0].risk.toLowerCase() : 'stable condition'}</strong> with <strong>{hr > 90 || spo2 < 95 ? 'moderate' : 'low'}</strong> confidence. 
              {hr > 100 && ' ⚠️ Heart rate is elevated - recommend monitoring.'}
              {spo2 < 94 && ' ⚠️ Oxygen saturation is low - recommend intervention.'}
              {hr <= 90 && spo2 >= 95 && ' ✓ All parameters within normal range.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
