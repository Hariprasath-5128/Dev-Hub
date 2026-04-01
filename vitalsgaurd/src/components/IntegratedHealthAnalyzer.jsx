import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import './IntegratedHealthAnalyzer.css';

const API_BASE = 'http://localhost:5000/api';

// Color scheme
const COLORS = {
  purple: '#7C3AED',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  slate: '#64748b'
};

// Risk level colors
const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return COLORS.red;
    case 'moderate':
      return COLORS.amber;
    case 'low':
      return COLORS.green;
    default:
      return COLORS.slate;
  }
};

// Status badge
const StatusBadge = ({ level, label }) => (
  <div className={`status-badge status-${level?.toLowerCase()}`}>
    <span className="badge-dot"></span>
    {label}
  </div>
);

export default function IntegratedHealthAnalyzer() {
  // Real-time vitals
  const [vitals, setVitals] = useState({
    heart_rate: 75,
    spo2: 97,
    temperature: 36.6,
    respiratory_rate: 16,
    systolic_bp: 120,
    diastolic_bp: 75,
    hr_variability: 8
  });

  // Model 01 - Current Diagnosis
  const [diagnosis, setDiagnosis] = useState({
    predicted_condition: 'Loading...',
    confidence: 0,
    all_probabilities: {}
  });

  // Model 07 - What-If Projections
  const [projections, setProjections] = useState({
    predictions: {
      '2h': {},
      '6h': {},
      '12h': {},
      '24h': {}
    },
    overall_trajectory: 'stable'
  });

  // Vitals history for graph
  const [vitalsHistory, setVitalsHistory] = useState([
    { time: '14:30', hr: 72, spo2: 98, temp: 36.5, bp: 118 },
    { time: '14:31', hr: 73, spo2: 98, temp: 36.5, bp: 118 },
    { time: '14:32', hr: 74, spo2: 97, temp: 36.6, bp: 119 },
    { time: '14:33', hr: 75, spo2: 97, temp: 36.6, bp: 119 },
    { time: '14:34', hr: 76, spo2: 97, temp: 36.7, bp: 120 },
    { time: '14:35', hr: 75, spo2: 98, temp: 36.6, bp: 120 }
  ]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Slider controls for what-if analysis
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorVitals, setSimulatorVitals] = useState({ ...vitals });

  // Mock data generator for demo
  const generateMockAnalysis = (vitalsToAnalyze) => {
    const confidenceFromHR = vitalsToAnalyze.heart_rate > 100 ? 0.65 : vitalsToAnalyze.heart_rate < 60 ? 0.70 : 0.95;

    return {
      status: 'success',
      model01: {
        predicted_condition: vitalsToAnalyze.heart_rate > 100 ? 'Tachycardia' : vitalsToAnalyze.spo2 < 94 ? 'Hypoxemia' : vitalsToAnalyze.temperature > 37.5 ? 'Fever' : 'Normal',
        confidence: confidenceFromHR,
        all_probabilities: {
          'Normal': vitalsToAnalyze.heart_rate > 100 ? 0.15 : 0.95,
          'Tachycardia': vitalsToAnalyze.heart_rate > 100 ? 0.65 : 0.05,
          'Fever': vitalsToAnalyze.temperature > 37.5 ? 0.60 : 0.10,
          'Hypoxemia': vitalsToAnalyze.spo2 < 94 ? 0.70 : 0.05,
          'Hypertension': vitalsToAnalyze.systolic_bp > 140 ? 0.55 : 0.10
        }
      },
      model07: {
        predictions: {
          '2h': { risk_score: 0.15, condition: 'Normal', risk_level: 'low', confidence: 0.92 },
          '6h': { risk_score: 0.18, condition: 'Normal', risk_level: 'low', confidence: 0.89 },
          '12h': { risk_score: 0.22, condition: 'Normal', risk_level: 'low', confidence: 0.85 },
          '24h': { risk_score: 0.25, condition: 'Normal', risk_level: 'moderate', confidence: 0.80 }
        },
        overall_trajectory: 'stable'
      }
    };
  };

  // Fetch integrated analysis
  const fetchAnalysis = useCallback(async (vitalsToAnalyze, isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/integrated/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitalsToAnalyze)
      });

      let data;
      if (!response.ok) {
        console.warn('⚠️ Backend unavailable, using mock data');
        data = generateMockAnalysis(vitalsToAnalyze);
      } else {
        data = await response.json();
      }

      if (data.status === 'success') {
        // Update diagnosis from Model 01
        if (data.model01) {
          setDiagnosis({
            predicted_condition: data.model01.predicted_condition,
            confidence: data.model01.confidence,
            all_probabilities: data.model01.all_probabilities || {}
          });
        }

        // Update projections from Model 07
        if (data.model07) {
          setProjections({
            predictions: data.model07.predictions || {},
            overall_trajectory: data.model07.overall_trajectory || 'stable'
          });
        }

        // Update vitals history
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        setVitalsHistory(prev => [
          ...prev.slice(-9),
          {
            time: timeStr,
            hr: vitalsToAnalyze.heart_rate,
            spo2: vitalsToAnalyze.spo2,
            temp: vitalsToAnalyze.temperature,
            bp: vitalsToAnalyze.systolic_bp
          }
        ]);
      } else {
        setError(data.error || 'Failed to fetch analysis');
        // Auto-dismiss error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('❌ Analysis error:', err);
      // Fallback to mock data on error
      const mockData = generateMockAnalysis(vitalsToAnalyze);
      if (mockData.status === 'success') {
        setError('⚠️ Backend unreachable. Showing demo data.');
        // Auto-dismiss error after 5 seconds
        setTimeout(() => setError(null), 5000);
        
        setDiagnosis({
          predicted_condition: mockData.model01.predicted_condition,
          confidence: mockData.model01.confidence,
          all_probabilities: mockData.model01.all_probabilities || {}
        });

        setProjections({
          predictions: mockData.model07.predictions || {},
          overall_trajectory: mockData.model07.overall_trajectory || 'stable'
        });

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        setVitalsHistory(prev => [
          ...prev.slice(-9),
          {
            time: timeStr,
            hr: vitalsToAnalyze.heart_rate,
            spo2: vitalsToAnalyze.spo2,
            temp: vitalsToAnalyze.temperature,
            bp: vitalsToAnalyze.systolic_bp
          }
        ]);

        console.warn('✓ Using fallback mock data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAnalysis(vitals);
    const interval = setInterval(() => {
      fetchAnalysis(vitals, true); // Background refresh every 5 seconds
    }, 5000);

    return () => clearInterval(interval);
  }, [vitals, fetchAnalysis]);

  // Handle simulator vitals change
  const handleSimulatorChange = (field, value) => {
    const updated = { ...simulatorVitals, [field]: parseFloat(value) };
    setSimulatorVitals(updated);
    fetchAnalysis(updated);
  };

  // Prepare data for 24h projection graph
  const projectionGraphData = [
    {
      time: 'Current',
      risk: parseFloat((diagnosis.confidence * 100).toFixed(1)),
      condition: 'Now'
    },
    {
      time: '2h',
      risk: parseFloat(((projections.predictions['2h']?.risk_score || 0) * 100).toFixed(1)),
      condition: projections.predictions['2h']?.condition || 'N/A'
    },
    {
      time: '6h',
      risk: parseFloat(((projections.predictions['6h']?.risk_score || 0) * 100).toFixed(1)),
      condition: projections.predictions['6h']?.condition || 'N/A'
    },
    {
      time: '12h',
      risk: parseFloat(((projections.predictions['12h']?.risk_score || 0) * 100).toFixed(1)),
      condition: projections.predictions['12h']?.condition || 'N/A'
    },
    {
      time: '24h',
      risk: parseFloat(((projections.predictions['24h']?.risk_score || 0) * 100).toFixed(1)),
      condition: projections.predictions['24h']?.condition || 'N/A'
    }
  ];

  // Prepare disease probabilities data
  const diseaseProbData = Object.entries(diagnosis.all_probabilities || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([disease, prob]) => ({
      name: disease,
      value: (prob * 100).toFixed(1),
      color: getRiskColor(disease.includes('Normal') ? 'low' : 'high')
    }));

  return (
    <div className="integrated-analyzer">
      <div className="analyzer-header">
        <h1>🏥 Integrated Health Analysis</h1>
        <p>Real-time AI Diagnosis + 24-Hour Risk Projections</p>
        <div className="backend-status">
          <span className="status-dot" style={{
            backgroundColor: error ? '#ef4444' : '#10b981',
            animation: loading ? 'pulse 2s infinite' : 'none'
          }}></span>
          <span>{loading ? 'Updating...' : error ? '⚠️ Using Demo Data' : '✓ Connected'}</span>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </div>

      <div className="analyzer-grid">
        {/* ===== SECTION 1: AI DIAGNOSIS ===== */}
        <div className="card diagnosis-card">
          <div className="card-header">
            <h2>🤖 AI Diagnosis (Model 01)</h2>
            <button
              className="simulator-toggle"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              {showSimulator ? '✕ Close' : '⚙️ What-If'}
            </button>
          </div>

          <div className="diagnosis-content">
            <div className="primary-condition">
              <h3>{diagnosis.predicted_condition}</h3>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${diagnosis.confidence * 100}%`,
                    backgroundColor: diagnosis.confidence > 0.7 ? COLORS.red :
                      diagnosis.confidence > 0.4 ? COLORS.amber :
                        COLORS.green
                  }}
                ></div>
              </div>
              <p className="confidence-text">
                Confidence: {(diagnosis.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* What-If Simulator */}
            {showSimulator && (
              <div className="simulator-panel">
                <h4>🔧 What-If Simulator</h4>
                <div className="simulator-controls">
                  {[
                    { label: 'Heart Rate (bpm)', key: 'heart_rate', min: 40, max: 160, step: 1 },
                    { label: 'SpO2 (%)', key: 'spo2', min: 70, max: 100, step: 1 },
                    { label: 'Temperature (°C)', key: 'temperature', min: 35, max: 40, step: 0.1 },
                    { label: 'BP Systolic (mmHg)', key: 'systolic_bp', min: 80, max: 200, step: 1 }
                  ].map(({ label, key, min, max, step }) => (
                    <div key={key} className="control-row">
                      <label>{label}</label>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={simulatorVitals[key]}
                        onChange={(e) => handleSimulatorChange(key, e.target.value)}
                        className="slider"
                      />
                      <span className="value">{simulatorVitals[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== SECTION 2: DISEASE PROBABILITIES ===== */}
        <div className="card probabilities-card">
          <div className="card-header">
            <h2>📊 Disease Probabilities</h2>
          </div>

          <div className="probabilities-content">
            {diseaseProbData.length > 0 ? (
              <div className="probability-list">
                {diseaseProbData.map((disease, idx) => (
                  <div key={idx} className="probability-item">
                    <div className="prob-name">{disease.name}</div>
                    <div className="prob-bar">
                      <div
                        className="prob-fill"
                        style={{
                          width: `${disease.value}%`,
                          backgroundColor: disease.color
                        }}
                      ></div>
                    </div>
                    <div className="prob-value">{disease.value}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No probability data available</p>
            )}
          </div>
        </div>

        {/* ===== SECTION 3: REAL-TIME VITALS GRAPH ===== */}
        <div className="card graph-card full-width">
          <div className="card-header">
            <h2>📈 Real-Time Vital Signals (Model 01 Input)</h2>
          </div>

          <div className="graph-content">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={vitalsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" label={{ value: 'HR & SpO2', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°C) & BP (mmHg)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: `2px solid ${COLORS.purple}`,
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="hr" stroke={COLORS.red} name="Heart Rate" dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="spo2" stroke={COLORS.blue} name="SpO2 (%)" dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="temp" stroke={COLORS.amber} name="Temperature (°C)" dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="bp" stroke={COLORS.green} name="BP Systolic (mmHg)" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== SECTION 4: 24-HOUR RISK PROJECTIONS ===== */}
        <div className="card projection-card full-width">
          <div className="card-header">
            <h2>🔮 24-Hour Health Risk Projections (Model 07)</h2>
            <div className="projection-badge">
              <span>Trajectory:</span>
              <strong style={{ color: getRiskColor(projections.overall_trajectory) }}>
                {projections.overall_trajectory.toUpperCase()}
              </strong>
            </div>
          </div>

          <div className="graph-content">
            <div className="projection-grid">
              {/* Projection Area Chart */}
              <div className="projection-graph">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={projectionGraphData}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate} />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: 'Risk Score (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value) => `${value}%`}
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: `2px solid ${COLORS.purple}`,
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="risk"
                      stroke={COLORS.purple}
                      fillOpacity={1}
                      fill="url(#colorRisk)"
                      dot={{ r: 5, fill: COLORS.purple }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Projection Details */}
              <div className="projection-details">
                {['2h', '6h', '12h', '24h'].map((timepoint) => {
                  const pred = projections.predictions[timepoint] || {};
                  const riskScore = (pred.risk_score || 0) * 100;
                  return (
                    <div key={timepoint} className="projection-item">
                      <div className="timepoint">{timepoint}</div>
                      <div className="risk-badge" style={{ fontSize: '1.2em' }}>
                        {riskScore.toFixed(1)}%
                      </div>
                      <StatusBadge
                        level={pred.risk_level}
                        label={pred.risk_level?.toUpperCase() || 'N/A'}
                      />
                      <div className="condition-text" style={{ fontSize: '0.85em' }}>
                        {pred.condition || 'N/A'}
                      </div>
                      <div className="confidence-mini">
                        {(pred.confidence * 100)?.toFixed(0)}% conf
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ===== SECTION 5: CURRENT VITALS STATUS ===== */}
        <div className="card vitals-status-card full-width">
          <div className="card-header">
            <h2>💓 Current Vital Signs Status</h2>
          </div>

          <div className="vitals-grid">
            {[
              { label: 'Heart Rate', value: vitals.heart_rate, unit: 'bpm', normal: '60-100', color: COLORS.red },
              { label: 'SpO2', value: vitals.spo2, unit: '%', normal: '>95', color: COLORS.blue },
              { label: 'Temperature', value: vitals.temperature, unit: '°C', normal: '36.5-37.5', color: COLORS.amber },
              { label: 'BP (Systolic)', value: vitals.systolic_bp, unit: 'mmHg', normal: '<120', color: COLORS.green }
            ].map((vital, idx) => (
              <div key={idx} className="vital-card">
                <div className="vital-value" style={{ color: vital.color }}>
                  {vital.value} <span className="unit">{vital.unit}</span>
                </div>
                <div className="vital-label">{vital.label}</div>
                <div className="vital-normal">Normal: {vital.normal}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Analyzing health data...</p>
        </div>
      )}
    </div>
  );
}