import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import HealthCard from './HealthCard';
import CriticalOverlay from './CriticalOverlay';
import { patients } from '../data/mockVitals';
import {
	evaluateEarlyWarning,
	predictRiskInHours,
	detectSilentRisk,
	matchHealthAnomalyFingerprint,
	runAgenticDebate,
	buildEmergencyAlertPayload,
	sendEmergencyAlert,
} from '../track5';

export default function DoctorDashboard({ onLogout }) {
	const [activePatient, setActivePatient] = useState(patients[0]);
	const [mode, setMode] = useState('normal');

	function examineVitals(patient) {
		setActivePatient(patient);
	}

	function getHealthSummary() {
		const latest = activePatient.vitals[activePatient.vitals.length - 1];
		return {
			hr: latest.hr,
			spo2: latest.spo2,
			temp: latest.temp,
			status: latest.status,
		};
	}

	const summary = getHealthSummary();
	const ews = evaluateEarlyWarning(activePatient.vitals);
	const twoHourRisk = predictRiskInHours(activePatient.vitals, 2);
	const sixHourRisk = predictRiskInHours(activePatient.vitals, 6);
	const silentRisk = detectSilentRisk(activePatient.vitals);
	const fingerprint = matchHealthAnomalyFingerprint(activePatient.vitals);
	const debate = runAgenticDebate(activePatient.vitals);

	async function handleEmergencyAlert() {
		const payload = buildEmergencyAlertPayload({
			patient: activePatient,
			consensus: debate.consensus,
			reasons: debate.outputs.map((o) => `${o.agent}: ${o.reason}`),
		});
		await sendEmergencyAlert(payload);
		alert(`Emergency alert sent (${payload.severity}).`);
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
					<h2>{activePatient.name} - Real Time Vital Model</h2>
					<div className="health-grid">
						<HealthCard title="Heart Rate" value={summary.hr} unit=" BPM" severity={summary.status} icon="❤️" />
						<HealthCard title="SpO2" value={summary.spo2} unit=" %" severity={summary.status} icon="🩸" />
						<HealthCard title="Temperature" value={summary.temp} unit=" °C" severity={summary.status} icon="🌡️" />
					</div>

					<div className="trend-box">
						<h3>Trend-Based Prediction & AI Signature</h3>
						<p>
							2h Risk: <strong>{twoHourRisk.risk}</strong>, 6h Risk: <strong>{sixHourRisk.risk}</strong>. Silent Risk:
							 <strong>{silentRisk.level}</strong> (micro-fluctuations {silentRisk.markers.microFluctuations}).
							 Fingerprint: <strong>{fingerprint.bestMatch?.name ?? 'none'}</strong> ({fingerprint.bestMatch?.score ?? 0}).
						</p>
					</div>

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

					<div className="ai-debate">
						<h3>AI Debate (Consensus + Disagreement)</h3>
						<p>
							{debate.outputs.map((o) => `${o.agent}: ${o.stance}`).join(' | ')}
						</p>
						<p>
							Final: <strong>{debate.consensus}</strong>, disagreement score <strong>{debate.disagreementScore}</strong>,
							 EWS <strong>{ews.latest?.ewsScore ?? 0}</strong> ({ews.status})
						</p>
					</div>

					<div className="action-row">
						<button onClick={handleEmergencyAlert}>Send Alert</button>
					</div>
				</div>
			</section>
		</div>
	);
}
