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
        {healthMetrics.map((metric, idx) => (
          <div key={idx} style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: metric.status === 'critical' ? '4px solid #ef4444' : metric.status === 'warning' ? '4px solid #f59e0b' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{metric.icon}</div>
            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' }}>{metric.title}</div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: metric.status === 'critical' ? '#ef4444' : '#7C3AED', marginBottom: '0.5rem' }}>{metric.value}</div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{metric.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#7C3AED', fontSize: '1.3rem' }}>📈 Live Vitals Monitor</h3>
          <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', gap: '4px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => {
                setDataGenerationMode('normal');
                setSpikeStartTime(null);
              }}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', backgroundColor: dataGenerationMode === 'normal' ? '#10b981' : 'transparent', color: dataGenerationMode === 'normal' ? 'white' : '#64748b' }}
            >
              Normal Baseline
            </button>
            <button
              onClick={() => {
                setDataGenerationMode('spike');
                setSpikeStartTime(Date.now());
              }}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', backgroundColor: dataGenerationMode === 'spike' ? '#ef4444' : 'transparent', color: dataGenerationMode === 'spike' ? 'white' : '#64748b' }}
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

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '2rem', border: `1px solid ${severityScore > 70 ? '#fecaca' : '#e2e8f0'}`, background: severityScore > 70 ? 'linear-gradient(180deg, #fff 0%, #fff1f2 100%)' : '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span>🛡️</span> Real-time Clinical Risk Assessment</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Cross-validated analyzer monitoring multiple vital streams for emergency patterns.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Emergency Risk Level</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981' }}>{severityScore}%</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: severityScore > 70 ? '#ef4444' : severityScore > 40 ? '#f59e0b' : '#10b981', background: severityScore > 70 ? '#fee2e2' : severityScore > 40 ? '#fffbeb' : '#f0fdf4', padding: '4px 12px', borderRadius: '20px' }}>{severityScore > 70 ? 'CRITICAL' : severityScore > 40 ? 'ELEVATED' : 'NORMAL'}</span>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', marginTop: '1.5rem', overflow: 'hidden' }}>
          <div style={{ width: `${severityScore}%`, height: '100%', background: severityScore > 70 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : severityScore > 40 ? '#f59e0b' : '#10b981', transition: 'width 1.5s ease-in-out', boxShadow: '0 0 8px rgba(0,0,0,0.1)' }} />
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem 2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '2rem', borderLeft: `6px solid ${trendResult?.trend === 'Deteriorating' ? '#ef4444' : trendResult?.trend === 'Improving' ? '#10b981' : '#7C3AED'}`, display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: trendResult?.trend === 'Deteriorating' ? '#fee2e2' : trendResult?.trend === 'Improving' ? '#ecfdf5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>{trendResult?.trend === 'Deteriorating' ? '📉' : trendResult?.trend === 'Improving' ? '📈' : '➡️'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>AI Trend Prediction Monitor (Model 03)</div>
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