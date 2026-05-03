export function buildEmergencyAlertPayload({ patient, consensus, reasons }) {
  return {
    to: patient?.emergencyContact ?? 'Not configured',
    patientId: patient?.id ?? 'unknown',
    patientName: patient?.name ?? 'Unknown',
    severity: consensus,
    message: `Emergency alert: ${patient?.name ?? 'Patient'} marked ${consensus}`,
    reasons,
    timestamp: new Date().toISOString(),
  };
}

export async function sendEmergencyAlert(payload) {
  // Simulated async dispatch. Replace with Twilio/Email/SMS gateway.
  return Promise.resolve({ success: true, channel: 'simulated', payload });
}
