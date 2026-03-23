function variance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
}

function countDirectionChanges(values) {
  if (values.length < 3) return 0;
  let changes = 0;
  for (let i = 2; i < values.length; i += 1) {
    const d1 = values[i - 1] - values[i - 2];
    const d2 = values[i] - values[i - 1];
    if (d1 !== 0 && d2 !== 0 && Math.sign(d1) !== Math.sign(d2)) changes += 1;
  }
  return changes;
}

export function detectSilentRisk(vitals) {
  const hr = vitals.map((v) => Number(v.hr ?? 0));
  const spo2 = vitals.map((v) => Number(v.spo2 ?? 100));
  const latest = vitals[vitals.length - 1] || { hr: 0, spo2: 100 };

  const hrVar = variance(hr);
  const spo2Var = variance(spo2);
  const rhythmIrregularity = countDirectionChanges(hr);

  const currentlyNormal = latest.hr >= 60 && latest.hr <= 100 && latest.spo2 >= 95;
  const hiddenPatternDanger = hrVar > 18 || spo2Var > 1.4 || rhythmIrregularity >= 3;

  const level = currentlyNormal && hiddenPatternDanger ? 'warning' : 'stable';

  return {
    level,
    currentlyNormal,
    hiddenPatternDanger,
    markers: {
      microFluctuations: Number(hrVar.toFixed(2)),
      spo2Volatility: Number(spo2Var.toFixed(2)),
      irregularRhythmPattern: rhythmIrregularity,
    },
  };
}
