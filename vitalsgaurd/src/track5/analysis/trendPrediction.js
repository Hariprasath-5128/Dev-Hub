function slope(values) {
  if (!values || values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

export function summarizeTrends(vitals) {
  const hrSeries = vitals.map((v) => Number(v.hr ?? 0));
  const spo2Series = vitals.map((v) => Number(v.spo2 ?? 100));
  const tempSeries = vitals.map((v) => Number(v.temp ?? 36.8));

  return {
    hrSlope: slope(hrSeries),
    spo2Slope: slope(spo2Series),
    tempSlope: slope(tempSeries),
  };
}

export function predictRiskInHours(vitals, hoursAhead = 2) {
  const latest = vitals[vitals.length - 1] || {};
  const trends = summarizeTrends(vitals);

  const hrProjection = Number(latest.hr ?? 0) + (trends.hrSlope / Math.max(vitals.length - 1, 1)) * hoursAhead;
  const spo2Projection = Number(latest.spo2 ?? 100) + (trends.spo2Slope / Math.max(vitals.length - 1, 1)) * hoursAhead;

  let risk = 'stable';
  if (hrProjection > 100 || spo2Projection < 94) risk = 'warning';
  if (hrProjection > 115 || spo2Projection < 91) risk = 'critical';

  return {
    hoursAhead,
    hrProjection: Number(hrProjection.toFixed(1)),
    spo2Projection: Number(spo2Projection.toFixed(1)),
    risk,
    trends,
  };
}
