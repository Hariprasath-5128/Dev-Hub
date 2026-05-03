import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function M1({
  healthMetrics = [],
  dataGenerationMode = 'normal',
  setDataGenerationMode = () => {},
  setSpikeStartTime = () => {},
  vitalsHistory = [],
  severityScore = 0,
  trendResult = null,
  trendExplanation = '',
  explaining = false,
  doctors = [],
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {healthMetrics.map((metric, idx) => {
          const mainColor = metric.title.includes('HEART') ? '#e11d48' : 
                          metric.title.includes('TEMP') ? '#d97706' :
                          metric.title.includes('SPO2') ? '#2563eb' : '#0d9488';
          return (
            <div key={idx} className="premium-card" style={{ padding: '2rem', borderLeft: metric.status === 'critical' ? '6px solid #ef4444' : metric.status === 'warning' ? '6px solid #f59e0b' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{metric.icon}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{metric.title}</div>
              <div style={{ fontSize: '3.5rem', fontWeight: '950', color: mainColor, marginBottom: '0.5rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>{metric.value}</div>
              <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>{metric.unit}</div>
            </div>
          );
        })}
      </div>

      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: '900' }}>📈 Live Vitals Monitor</h3>
          <div style={{ display: 'flex', background: 'rgba(247,167,192,0.1)', padding: '6px', borderRadius: '12px', gap: '6px', border: '1px solid rgba(247,167,192,0.2)' }}>
            <button
              onClick={() => {
                setDataGenerationMode('normal');
                setSpikeStartTime(null);
              }}
              style={{ padding: '0.5rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', backgroundColor: dataGenerationMode === 'normal' ? '#10b981' : 'transparent', color: dataGenerationMode === 'normal' ? 'white' : '#831843', transition: 'all 0.2s' }}
            >
              Normal Baseline
            </button>
            <button
              onClick={() => {
                setDataGenerationMode('spike');
                setSpikeStartTime(Date.now());
              }}
              style={{ padding: '0.5rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', backgroundColor: dataGenerationMode === 'spike' ? '#ef4444' : 'transparent', color: dataGenerationMode === 'spike' ? 'white' : '#831843', transition: 'all 0.2s' }}
            >
              Trigger Spike
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={vitalsHistory}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: 'Live Timeline', position: 'insideBottom', offset: -5, fontSize: 11 }} />
            <YAxis yAxisId="left" orientation="left" domain={[40, 220]} tick={{ fontSize: 10 }} label={{ value: 'BPM / mmHg', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[30, 105]} tick={{ fontSize: 10 }} label={{ value: '% / °C', angle: 90, position: 'insideRight', offset: 10, fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={3} dot={false} name="Heart Rate (BPM)" />
            <Line yAxisId="right" type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={3} dot={false} name="SpO2 (%)" />
            <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={3} dot={false} name="Temperature (°C)" />
            <Line yAxisId="left" type="monotone" dataKey="bp_systolic" stroke="#10b981" strokeWidth={3} dot={false} name="BP Systolic (mmHg)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="premium-card" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: severityScore > 70 ? '6px solid #ef4444' : 'none', background: severityScore > 70 ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(254,226,226,0.6) 100%)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}><span>🛡️</span> Real-time Clinical Risk Assessment</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#475569', fontSize: '0.95rem', fontWeight: '500' }}>Cross-validated analyzer monitoring multiple vital streams for emergency patterns.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Emergency Risk Level</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '2.8rem', fontWeight: '950', color: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>{severityScore}%</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white', background: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981', padding: '4px 14px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{severityScore > 70 ? 'CRITICAL' : severityScore > 40 ? 'ELEVATED' : 'NORMAL'}</span>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', marginTop: '1.5rem', overflow: 'hidden' }}>
          <div style={{ width: `${severityScore}%`, height: '100%', background: severityScore > 70 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : severityScore > 40 ? '#f59e0b' : '#10b981', transition: 'width 1.5s ease-in-out', boxShadow: '0 0 8px rgba(0,0,0,0.1)' }} />
        </div>
      </div>

      <div className="premium-card" style={{ padding: '1.5rem 2.5rem', marginBottom: '2rem', borderLeft: `8px solid ${trendResult?.trend === 'Deteriorating' ? '#ef4444' : trendResult?.trend === 'Improving' ? '#10b981' : '#be185d'}`, display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ width: '65px', height: '65px', borderRadius: '20px', background: trendResult?.trend === 'Deteriorating' ? '#fee2e2' : trendResult?.trend === 'Improving' ? '#ecfdf5' : 'rgba(255,228,233,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', boxShadow: '0 8px 15px rgba(0,0,0,0.05)' }}>{trendResult?.trend === 'Deteriorating' ? '📉' : trendResult?.trend === 'Improving' ? '📈' : '➡️'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>AI Trend Prediction Monitor (Model 03)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: trendResult?.trend?.toLowerCase() === 'deteriorating' ? '#ef4444' : trendResult?.trend?.toLowerCase() === 'improving' ? '#10b981' : '#1e293b' }}>{trendResult?.trend ? `Patient trajectory is ${trendResult.trend.toLowerCase()}` : 'Analyzing clinical sequence...'}</div>
          {trendExplanation && (
            <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '10px', padding: '12px 18px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #7C3AED', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', marginBottom: '4px' }}>REASONING OBSERVATION</div>
              {explaining ? '📡 Generating clinical brief...' : trendExplanation}
            </div>
          )}
        </div>
        {trendResult && (
          <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800' }}>AI CONFIDENCE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#7C3AED' }}>{(trendResult.confidence * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#7C3AED', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>👨‍⚕️</span> Care Team & Active Consultations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {doctors.map((doctor, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{doctor.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{doctor.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doctor.specialty}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#7C3AED', fontWeight: '700' }}>{doctor.date}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}