export function computeEarlyWarningScore(vital) {
  const hr = Number(vital.hr ?? 0);
  const spo2 = Number(vital.spo2 ?? 100);
  const temp = Number(vital.temp ?? 36.8);

  let score = 0;

  if (hr >= 130 || hr <= 40) score += 4;
  else if (hr >= 111 || hr <= 50) score += 2;
  else if (hr >= 91) score += 1;

  if (spo2 <= 89) score += 4;
  else if (spo2 <= 93) score += 2;
  else if (spo2 <= 95) score += 1;

  if (temp >= 39.1 || temp <= 35.0) score += 3;
  else if (temp >= 38.1 || temp <= 35.9) score += 1;

  return score;
}

export function getEarlyWarningLevel(score) {
  if (score >= 7) return 'critical';
  if (score >= 4) return 'warning';
  return 'stable';
}

export function evaluateEarlyWarning(vitals) {
  const scored = vitals.map((v) => {
    const score = computeEarlyWarningScore(v);
    return { ...v, ewsScore: score, ewsLevel: getEarlyWarningLevel(score) };
  });

  const latest = scored[scored.length - 1];
  const previous = scored[scored.length - 2];
  const trend = previous ? latest.ewsScore - previous.ewsScore : 0;

  return {
    latest,
    trend,
    status: latest?.ewsLevel ?? 'stable',
    scored,
  };
}
