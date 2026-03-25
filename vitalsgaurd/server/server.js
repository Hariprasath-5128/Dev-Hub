const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const supabase = require("./supabase");

const app = express();
app.use(express.json());
app.use(cors());

const APPOINTMENT_DURATION_MINUTES = 20;
const WORK_DAY_START_HOUR = 9;
const WORK_DAY_END_HOUR = 17;

const doctorsCatalog = [
  { id: 'd1', name: 'Dr. Sarah Chen', specialty: 'Cardiologist' },
  { id: 'd2', name: 'Dr. Rajesh Kumar', specialty: 'Neurologist' },
  { id: 'd3', name: 'Dr. Lisa Wong', specialty: 'Physiologist' },
];

// In-memory store; replace with DB table when schema is finalized.
const appointmentsStore = [];
const alertsStore = []; // In-memory emergency alert store

function isSameDate(isoDateTime, dateStr) {
  return (isoDateTime || '').slice(0, 10) === dateStr;
}

function parseDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function createDaySlots(dateStr) {
  const slots = [];
  const now = new Date();

  for (let hour = WORK_DAY_START_HOUR; hour < WORK_DAY_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += APPOINTMENT_DURATION_MINUTES) {
      const start = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000);

      if (start > now) {
        slots.push({
          start: start.toISOString(),
          end: end.toISOString()
        });
      }
    }
  }

  return slots;
}

async function getDischargeEligibility({ userId, username }) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, is_discharged')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data && typeof data.is_discharged === 'boolean') {
      return {
        discharged: data.is_discharged,
        source: 'users.is_discharged'
      };
    }
  } catch (_err) {
    // Fallback below
  }

  const uname = (username || '').toLowerCase();
  const uid = String(userId || '').toLowerCase();
  const demoDischarged = uname === 'patient1' || uid.startsWith('demo-patient');

  return {
    discharged: demoDischarged,
    source: 'demo-fallback'
  };
}

// ═══════════════════════════════════════════════════
//  AUTH  —  /auth
//  action: "signup" | "login"
//  Stores users in the public.users table (username, password, role)
// ═══════════════════════════════════════════════════
app.post("/auth", async (req, res) => {
  const { username, password, action, role } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Username and password are required." });
  }

  // ── Sign Up ──────────────────────────────────────
  if (action === "signup") {
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, password, role: role || 'patient' }])
      .select()
      .single();

    if (error) {
      console.error("[Auth] Signup error:", error);
      return res.json({ success: false, message: error.message || "Signup failed." });
    }

    return res.json({
      success: true,
      message: "Signup successful!",
      userId: data.id,
    });
  }

  // ── Login ────────────────────────────────────────
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !data) {
    return res.json({ success: false, message: "Invalid credentials." });
  }

  res.json({
    success: true,
    message: "Login successful!",
    userId: data.id,
    role: data.role // Send role back to frontend just in case
  });
});

// ═══════════════════════════════════════════════════
//  AI ROUTE  —  /store-report
//  Calls the Python AI backend and stores the result in medical_reports
// ═══════════════════════════════════════════════════
app.post("/store-report", async (req, res) => {
  const { userId, heartRate, spo2, temperature, scanType } = req.body;

  try {
    // 1. Call the Python AI Backend for analysis
    const response = await axios.post("http://localhost:8000/api/analyze-vitals", {
      heart_rate: heartRate,
      spo2: spo2,
      temperature: temperature,
      ecg_irregularity: 0.0
    });

    const aiOut = response.data;
    const confidenceScore = aiOut.lstm_result?.confidence
      ? Math.round(aiOut.lstm_result.confidence * 100)
      : (aiOut.confidence ? Math.round(aiOut.confidence * 100) : null);

    // 2. Save the scan metrics AND the AI output into the database
    await supabase.from("medical_reports").insert([
      {
        user_id: userId || null,
        scan_type: scanType || 'Targeted Scan',
        heart_rate: heartRate,
        spo2: spo2,
        temperature: temperature,
        condition: aiOut.ui_label || aiOut.condition || "Unknown",
        diagnosis_summary: aiOut.voice_summary || aiOut.consensus || "No details",
        confidence_score: confidenceScore
      },
    ]);

    // 3. Return the AI results to the frontend UI
    res.json({
      success: true,
      data: aiOut
    });
  } catch (err) {
    console.error("[Store Report] Error:", err.message);
    res.json({ success: false, message: "AI processing or DB storage failed.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  APPOINTMENTS ROUTES
// ═══════════════════════════════════════════════════
app.get('/appointments/eligibility/:userId', async (req, res) => {
  const { userId } = req.params;
  const username = req.query.username || '';

  const eligibility = await getDischargeEligibility({ userId, username });
  res.json({
    success: true,
    discharged: eligibility.discharged,
    source: eligibility.source,
    message: eligibility.discharged
      ? 'Patient is discharged and can book appointments.'
      : 'Patient is not discharged yet. Booking is currently locked.'
  });
});

app.get('/appointments/doctors', async (req, res) => {
  const { date, patientId } = req.query;

  if (!date || !patientId) {
    return res.status(400).json({ success: false, message: 'date and patientId are required.' });
  }

  const daySlots = createDaySlots(date);
  const dayAppointments = appointmentsStore.filter((a) => isSameDate(a.start, date));
  const patientDayAppointments = dayAppointments.filter((a) => String(a.patientId) === String(patientId));

  const doctors = doctorsCatalog.map((doctor) => {
    const doctorAppointments = dayAppointments.filter((a) => a.doctorId === doctor.id);

    const slots = daySlots.map((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);

      const doctorConflict = doctorAppointments.find((a) => overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end)));
      const patientConflict = patientDayAppointments.find((a) => overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end)));

      return {
        start: slot.start,
        end: slot.end,
        available: !doctorConflict && !patientConflict,
        reason: doctorConflict ? 'booked' : patientConflict ? 'patient-overlap' : null,
        appointmentId: doctorConflict?.id || patientConflict?.id || null
      };
    });

    return { ...doctor, slots };
  });

  return res.json({
    success: true,
    appointmentDurationMinutes: APPOINTMENT_DURATION_MINUTES,
    doctors
  });
});

app.get('/appointments/my', async (req, res) => {
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ success: false, message: 'patientId is required.' });
  }

  const appointments = appointmentsStore
    .filter((a) => String(a.patientId) === String(patientId))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  return res.json({ success: true, appointments });
});

app.post('/appointments/book', async (req, res) => {
  const { patientId, username, doctorId, start } = req.body;

  if (!patientId || !doctorId || !start) {
    return res.status(400).json({ success: false, message: 'patientId, doctorId and start are required.' });
  }

  const doctor = doctorsCatalog.find((d) => d.id === doctorId);
  if (!doctor) {
    return res.status(400).json({ success: false, message: 'Invalid doctorId.' });
  }

  const eligibility = await getDischargeEligibility({ userId: patientId, username });
  if (!eligibility.discharged) {
    return res.status(403).json({ success: false, message: 'Patient is not discharged. Appointment booking is locked.' });
  }

  const slotStart = new Date(start);
  if (Number.isNaN(slotStart.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid start datetime.' });
  }

  const slotEnd = new Date(slotStart.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000);
  const minutes = slotStart.getMinutes();
  if (minutes % APPOINTMENT_DURATION_MINUTES !== 0) {
    return res.status(400).json({ success: false, message: `Slots must start at ${APPOINTMENT_DURATION_MINUTES}-minute boundaries.` });
  }

  const hour = slotStart.getHours();
  if (hour < WORK_DAY_START_HOUR || hour >= WORK_DAY_END_HOUR) {
    return res.status(400).json({ success: false, message: 'Slot is outside doctor working hours.' });
  }

  const now = new Date();
  if (slotStart <= now) {
    return res.status(400).json({ success: false, message: 'Cannot book past slots.' });
  }

  const doctorConflict = appointmentsStore.find((a) =>
    a.doctorId === doctorId && overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end))
  );
  if (doctorConflict) {
    return res.status(409).json({ success: false, message: 'This doctor slot is already booked.' });
  }

  const patientConflict = appointmentsStore.find((a) =>
    String(a.patientId) === String(patientId) && overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end))
  );
  if (patientConflict) {
    return res.status(409).json({ success: false, message: 'You already have an appointment overlapping this slot.' });
  }

  const appointment = {
    id: `apt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    patientId,
    username: username || '',
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    start: slotStart.toISOString(),
    end: slotEnd.toISOString(),
    durationMinutes: APPOINTMENT_DURATION_MINUTES,
    status: 'booked',
    createdAt: new Date().toISOString()
  };

  appointmentsStore.push(appointment);
  return res.json({ success: true, appointment });
});

// ═══════════════════════════════════════════════════
//  EMERGENCY ALERTS ROUTES
// ═══════════════════════════════════════════════════

// Get all active alerts
app.get('/alerts', (req, res) => {
  const activeAlerts = alertsStore.filter(a => a.status !== 'resolved');
  res.json({ success: true, alerts: activeAlerts });
});

// Create a new alert (from Doctor)
app.post('/alerts', (req, res) => {
  const { doctorName, location, alertType, urgency, patientId, patientName, requirements } = req.body;

  if (!doctorName || !location || !alertType) {
    return res.status(400).json({ success: false, message: 'doctorName, location, and alertType are required.' });
  }

  const alert = {
    id: `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    doctor: doctorName,
    location,
    alert: alertType,
    urgency: urgency || 'high',
    patientId: patientId || null,
    patientName: patientName || 'Unknown Patient',
    requirements: requirements || [],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  alertsStore.push(alert);
  console.log(`[Alert] ${alertType} triggered by ${doctorName} at ${location}`);
  res.json({ success: true, alert });
});

// Respond to an alert (from Admin)
app.patch('/alerts/:id/respond', (req, res) => {
  const { id } = req.params;
  const alert = alertsStore.find(a => a.id === id);

  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found.' });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  console.log(`[Alert] ${id} resolved by Admin`);
  
  res.json({ success: true, alert });
});

// ═══════════════════════════════════════════════════
//  Health check
// ═══════════════════════════════════════════════════
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = 5003;
app.listen(PORT, () => console.log(`[VitalsGuard Node API] Running on port ${PORT}`));