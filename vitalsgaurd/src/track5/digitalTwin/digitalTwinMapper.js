/**
 * DigitalTwinMapper
 * Extracts anatomical marker positions based on model's bounding box measurements.
 */

export const REGIONS = {
  HEART: 'heart',
  LUNGS: 'lungs',
  BODY: 'body',
  BRAIN: 'brain',
  NONE: 'none'
};

/**
 * Calculates the local marker position [x, y, z] relative to acentered model.
 * @param {string} region - The region identifier
 * @param {Object} bboxSize - {x, y, z} dimensions of the model
 * @returns {Array|null} [x, y, z] position
 */
export const getAnatomicalMarkerPos = (region, bboxSize) => {
  if (!region || region === REGIONS.NONE) return null;

  const height = bboxSize.y;
  const width = bboxSize.x;
  const depth = bboxSize.z;

  let x = 0;
  let y = height * 0.5;
  let z = depth * 0.25;

  switch (region) {
    case REGIONS.HEART:
      x = width * 0.10; 
      y = height * 0.78; 
      z = depth * 0.30; 
      break;
    case REGIONS.LUNGS:
      x = width * -0.05; 
      y = height * 0.74;
      z = depth * 0.30; 
      break;
    case REGIONS.BODY:
      x = 0;
      y = height * 0.60; // Upper abdomen/mid-torso
      z = depth * 0.30; 
      break;
    case REGIONS.BRAIN:
      x = 0;
      y = height * 0.93; // Head
      z = 0;
      break;
    default:
      break;
  }

  return [x, y, z];
};

/**
 * Normalizes a scan result to a valid region identifier.
 */
export const normalizeRegion = (scanData) => {
  if (!scanData) return REGIONS.NONE;

  const affected = scanData.affected_regions?.[0];
  if (affected && affected !== REGIONS.NONE && Object.values(REGIONS).includes(affected)) {
    return affected;
  }

  const cond = (scanData.condition || '').toLowerCase();
  const symptoms = (scanData.fingerprints || []).map(f =>
    typeof f === 'object' ? f.disease?.toLowerCase() : f.toLowerCase()
  ).join(' ');

  if (!cond && !symptoms) {
    return REGIONS.NONE;
  }

  if (cond.includes('cardia') || symptoms.includes('arrhythmia') || cond.includes('heart') || cond.includes('tachycardia')) {
    return REGIONS.HEART;
  }
  if (cond.includes('pulm') || cond.includes('lung') || cond.includes('respiratory') || cond.includes('hypoxemia')) {
    return REGIONS.LUNGS;
  }
  if (cond.includes('temp') || cond.includes('fever') || symptoms.includes('sepsis') || cond.includes('sepsis')) {
    return REGIONS.BODY;
  }

  return REGIONS.HEART;
};

export function mapRiskRegions(vitals = []) {
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

export function buildVoiceSummary(regions = []) {
  if (!regions.length) return 'Vitals stable. No elevated regional risk detected.';
  const top = regions[0];
  return `Attention: ${top.severity} risk detected around ${top.area}. Immediate monitoring recommended.`;
}
