export function mapRiskRegions(vitals) {
  const latest = vitals[vitals.length - 1] || { hr: 0, spo2: 100, temp: 36.8 };
  const regions = [];

  if (latest.hr > 100) {
    regions.push({
      area: 'chest',
      severity: latest.hr > 115 ? 'critical' : 'warning',
      color: latest.hr > 115 ? '#ef4444' : '#f59e0b',
      notes: ['Irregular heart rhythm pattern', 'Elevated cardiovascular load'],
    });
  }

  if (latest.spo2 < 95) {
    regions.push({
      area: 'lungs',
      severity: latest.spo2 < 91 ? 'critical' : 'warning',
      color: latest.spo2 < 91 ? '#ef4444' : '#f59e0b',
      notes: ['SpO2 fluctuation observed', 'Potential oxygen transfer issue'],
    });
  }

  if (latest.temp > 37.8) {
    regions.push({
      area: 'systemic',
      severity: latest.temp > 39 ? 'critical' : 'warning',
      color: latest.temp > 39 ? '#ef4444' : '#f59e0b',
      notes: ['High thermal stress detected'],
    });
  }

  return regions;
}

export function buildVoiceSummary(regions) {
  if (!regions.length) return 'Vitals stable. No elevated regional risk detected.';
  const top = regions[0];
  return `Attention: ${top.severity} risk detected around ${top.area}. Immediate monitoring recommended.`;
}
