import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import HealthCard from './HealthCard';
import CriticalOverlay from './CriticalOverlay';
import { patients } from '../data/mockVitals';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export default function DoctorDashboard({ onLogout }) {
	const [activePatient, setActivePatient] = useState(patients[0]);
	const [mode, setMode] = useState('normal');
	const [analyzing, setAnalyzing] = useState(false);
	const [scanResult, setScanResult] = useState(null);

	function examineVitals(patient) {
		setActivePatient(patient);
		setScanResult(null);
	}

	const latest = activePatient.vitals[activePatient.vitals.length - 1];
	const summary = {
		hr: latest.hr,
		spo2: latest.spo2,
		temp: latest.temp,
		status: latest.status,
	};

	async function runDoctorAnalysis() {
		setAnalyzing(true);
		setScanResult(null);
		try {
			const res = await axios.post(`${API_BASE}/analyze-vitals`, {
				heart_rate: latest.hr,
				spo2: latest.spo2,
				temperature: latest.temp,
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
		if (scanResult?.emergency?.dispatch_alert) {
			alert(`Auto-Emergency alert triggered! Reason: ${scanResult.emergency.urgency_note}`);
		} else {
			alert('Emergency alert sent manually.');
		}
	}

	return (
		<div className={`dashboard ${mode}`}>
			<CriticalOverlay
				active={mode === 'critical'}
				message="Patient critical parameter detected. Auto alert ready for emergency contact."
				onResolve={() => setMode('normal')}
			/>
			<header>
				<h1>Doctor Dashboard</h1>
				<div className="header-actions">
					<button onClick={() => setMode((v) => (v === 'normal' ? 'critical' : 'normal'))}>
						{mode === 'normal' ? 'Switch to Critical Mode' : 'Switch to Normal Mode'}
					</button>
					<button onClick={onLogout}>Logout</button>
				</div>
			</header>

			<section className="doctor-top-row">
				<div className="patient-list">
					<h2>Patient Assignments</h2>
					<ul>
						{patients.map((p) => (
							<li key={p.id} className={p.id === activePatient.id ? 'active' : ''} onClick={() => examineVitals(p)}>
								<strong>{p.name}</strong>
								<small>Age {p.age}</small>
							</li>
						))}
					</ul>
				</div>

				<div className="patient-summary">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<h2>{activePatient.name} - Real Time Vital Model</h2>
						<button 
							onClick={runDoctorAnalysis} 
							disabled={analyzing}
							style={{ padding: '0.6rem 1.2rem', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', cursor: analyzing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
						>
							{analyzing ? 'Scanning Patient...' : 'Run Phidata Agent Scan ✨'}
						</button>
					</div>
					<div className="health-grid">
						<HealthCard title="Heart Rate" value={summary.hr} unit=" BPM" severity={summary.status} icon="❤️" />
						<HealthCard title="SpO2" value={summary.spo2} unit=" %" severity={summary.status} icon="🩸" />
						<HealthCard title="Temperature" value={summary.temp} unit=" °C" severity={summary.status} icon="🌡️" />
					</div>

					{scanResult && (
						<div className="trend-box" style={{ background: '#0f172a', border: '1px solid #334155' }}>
							<h3 style={{ color: '#38bdf8' }}>AI Risk Signature & Fingerprints</h3>
							<p style={{ color: '#cbd5e1' }}>
								EWS Score: <strong>{scanResult.ews.score} ({scanResult.ews.level})</strong>. 
								Silent Risk Confidence: <strong>{Math.round(scanResult.lstm_result.confidence * 100)}%</strong>.
							</p>
							<div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
								{scanResult.fingerprints.map(fp => (
									<span key={fp.disease} style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#f8fafc', border: '1px solid #475569' }}>
										{fp.disease.replace(/_/g, ' ')}
									</span>
								))}
							</div>
						</div>
					)}

					<div className="chart-area">
						<ResponsiveContainer width="100%" height={270}>
							<LineChart data={activePatient.vitals}>
								<XAxis dataKey="time" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Line type="monotone" dataKey="hr" stroke="#e85252" strokeWidth={2} name="Heart Rate" />
								<Line type="monotone" dataKey="spo2" stroke="#2f9eea" strokeWidth={2} name="SpO2" />
								<Line type="monotone" dataKey="temp" stroke="#f9a825" strokeWidth={2} name="Temp" />
							</LineChart>
						</ResponsiveContainer>
					</div>

					{scanResult && (
						<div className="ai-debate" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1rem' }}>
							<h3 style={{ color: '#c084fc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
								<span>🤖</span> Live AI Multi-Agent Interaction
							</h3>

							{/* Agent Feed */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
								{[
									{ key: 'monitoring', icon: '📈', color: '#38bdf8', label: 'Monitoring Agent', bg: '#0c1a2e',
									  text: scanResult.debate?.monitoring_view },
									{ key: 'diagnosis',  icon: '🩺', color: '#f472b6', label: 'Diagnosis Agent',  bg: '#1a0e1e',
									  text: scanResult.debate?.diagnosis_view },
									{ key: 'debate',     icon: '⚖️', color: '#c084fc', label: 'Debate Coordinator', bg: '#1e1b4b',
									  text: `Consensus reached (Disagreement score: ${scanResult.disagreement_score}/10)\n${scanResult.debate?.consensus || scanResult.consensus}` },
									{ key: 'explanation',icon: '🗣️', color: '#fbbf24', label: 'Explanation Agent', bg: '#1c1500',
									  text: scanResult.explanation?.voice_summary || scanResult.voice_summary },
									{ key: 'actions',    icon: '⚡', color: '#22c55e', label: 'Action Agent', bg: '#0b1e0e',
									  text: (scanResult.actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') },
									{ key: 'emergency',  icon: '🚨', color: '#ef4444', label: 'Emergency Agent', bg: '#1f0808',
									  text: `Urgency: ${scanResult.emergency?.urgency_note}\nDispatch Alert: ${scanResult.emergency?.dispatch_alert ? 'YES ⚠️' : 'NO ✓'}` },
								].filter(item => item.text).map(item => (
									<div key={item.key} style={{ background: item.bg, padding: '1rem 1.2rem', borderRadius: '12px', borderLeft: `4px solid ${item.color}` }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
											<span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
											<strong style={{ color: item.color, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
												{item.label}
											</strong>
										</div>
										<p style={{ color: '#f1f5f9', margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
											{item.text}
										</p>
									</div>
								))}
							</div>

							<div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
								<span>Disagreement Score: <strong style={{ color: '#c084fc' }}>{scanResult.disagreement_score}/10</strong></span>
								<span>EWS: <strong style={{ color: scanResult.ews?.colour || '#22c55e' }}>{scanResult.ews?.level?.toUpperCase()}</strong></span>
								<span>Emergency Override: <strong style={{ color: scanResult.emergency?.dispatch_alert ? '#ef4444' : '#22c55e' }}>{scanResult.emergency?.dispatch_alert ? 'YES' : 'NO'}</strong></span>
							</div>
						</div>
					)}

					<div className="action-row">
						<button onClick={handleEmergencyAlert}>Send Alert</button>
					</div>
				</div>
			</section>
		</div>
	);

}
