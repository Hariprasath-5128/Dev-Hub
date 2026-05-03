const fingerprints = {
  covid_like: { spo2Low: 1, tempHigh: 1, hrSpike: 0 },
  cardiac_like: { spo2Low: 0, tempHigh: 0, hrSpike: 1 },
  stress_like: { spo2Low: 0, tempHigh: 0, hrSpike: 0.6 },
};

function buildSignal(vitals) {
  const latest = vitals[vitals.length - 1] || { hr: 0, spo2: 100, temp: 36.8 };
  return {
    spo2Low: latest.spo2 < 94 ? 1 : 0,
    tempHigh: latest.temp > 37.8 ? 1 : 0,
    hrSpike: latest.hr > 100 ? 1 : latest.hr > 90 ? 0.6 : 0,
  };
}

function similarity(a, b) {
  const keys = Object.keys(a);
  const dot = keys.reduce((sum, k) => sum + a[k] * b[k], 0);
  const magA = Math.sqrt(keys.reduce((sum, k) => sum + a[k] * a[k], 0));
  const magB = Math.sqrt(keys.reduce((sum, k) => sum + b[k] * b[k], 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

export function matchHealthAnomalyFingerprint(vitals) {
  const signal = buildSignal(vitals);

  const ranked = Object.entries(fingerprints)
    .map(([name, fp]) => ({ name, score: Number(similarity(signal, fp).toFixed(3)) }))
    .sort((a, b) => b.score - a.score);

  return {
    signal,
    bestMatch: ranked[0],
    ranked,
  };
}
