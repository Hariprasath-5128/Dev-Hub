import { evaluateEarlyWarning } from '../analysis/earlyWarningScore';
import { detectSilentRisk } from '../analysis/silentRiskDetector';
import { predictRiskInHours } from '../analysis/trendPrediction';
import { matchHealthAnomalyFingerprint } from '../analysis/anomalyFingerprint';

function monitoringAgent(vitals) {
  const ews = evaluateEarlyWarning(vitals);
  return {
    agent: 'monitoring',
    stance: ews.status,
    reason: `Early warning score ${ews.latest?.ewsScore ?? 0} with trend ${ews.trend >= 0 ? '+' : ''}${ews.trend}`,
    confidence: 0.78,
  };
}

function diagnosisAgent(vitals) {
  const fp = matchHealthAnomalyFingerprint(vitals);
  const stance = fp.bestMatch?.score > 0.6 ? 'warning' : 'stable';
  return {
    agent: 'diagnosis',
    stance,
    reason: `Fingerprint match ${fp.bestMatch?.name ?? 'none'} (${fp.bestMatch?.score ?? 0})`,
    confidence: 0.72,
  };
}

function explanationAgent(vitals) {
  const trend2h = predictRiskInHours(vitals, 2);
  return {
    agent: 'explanation',
    stance: trend2h.risk,
    reason: `2h projection HR ${trend2h.hrProjection}, SpO2 ${trend2h.spo2Projection}`,
    confidence: 0.7,
  };
}

function emergencyAgent(vitals) {
  const trend6h = predictRiskInHours(vitals, 6);
  return {
    agent: 'emergency',
    stance: trend6h.risk === 'critical' ? 'critical' : 'warning',
    reason: `6h projection indicates ${trend6h.risk} risk`,
    confidence: 0.8,
  };
}

function actionAgent(vitals) {
  const silent = detectSilentRisk(vitals);
  return {
    agent: 'action',
    stance: silent.level,
    reason: silent.hiddenPatternDanger
      ? 'Hidden risk pattern detected despite normal current vitals'
      : 'No hidden risk pattern detected',
    confidence: 0.68,
  };
}

export function runAgenticDebate(vitals) {
  const outputs = [
    monitoringAgent(vitals),
    diagnosisAgent(vitals),
    explanationAgent(vitals),
    emergencyAgent(vitals),
    actionAgent(vitals),
  ];

  const weights = { stable: 0, warning: 1, critical: 2 };
  const avg = outputs.reduce((sum, o) => sum + weights[o.stance], 0) / outputs.length;

  const consensus = avg >= 1.5 ? 'critical' : avg >= 0.7 ? 'warning' : 'stable';

  const disagreementScore = Number(
    (outputs.filter((o) => o.stance !== consensus).length / outputs.length).toFixed(2)
  );

  return {
    outputs,
    consensus,
    disagreementScore,
  };
}
