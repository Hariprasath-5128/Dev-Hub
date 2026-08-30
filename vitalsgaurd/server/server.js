const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const supabase = require("./supabase");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("[Auth] WARNING: JWT_SECRET not set — login will not issue usable session tokens.");
}

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
if (!INTERNAL_SERVICE_KEY) {
  console.warn("[Auth] WARNING: INTERNAL_SERVICE_KEY not set — the Python backend won't be able to call appointment routes.");
}

function signSessionToken({ userId, role, username }) {
  return jwt.sign({ sub: userId, role, username }, JWT_SECRET, { expiresIn: "24h" });
}

const app = express();
app.use(cors());
app.use(express.json());

// Root route for health check
app.get('/', (req, res) => {
  res.json({ message: 'VitalsGuard Node API is running' });
});

const APPOINTMENT_DURATION_MINUTES = 20;
const WORK_DAY_START_HOUR = 9;
const WORK_DAY_END_HOUR = 17;

const doctorsCatalog = [
  { id: 'd1', name: 'Dr. Sarah Chen', specialty: 'Cardiologist' },
  { id: 'd2', name: 'Dr. Rajesh Kumar', specialty: 'Neurologist' },
  { id: 'd3', name: 'Dr. Lisa Wong', specialty: 'Physiologist' },
];

const alertsStore = []; // In-memory emergency alert store — appointments now live in Supabase (see supabase_schema_appointments.sql)

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
      role: data.role,
      token: signSessionToken({ userId: data.id, role: data.role, username: data.username }),
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
    role: data.role, // Send role back to frontend just in case
    token: signSessionToken({ userId: data.id, role: data.role, username: data.username }),
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
//  Auth: either a valid end-user Bearer JWT (patients are locked to their
//  own patientId; doctor/admin may act on any), or a trusted internal
//  X-Internal-Key header (used by the Python backend's chatbot booking
//  tool — RBAC for that patient_id was already enforced upstream there).
// ═══════════════════════════════════════════════════

function verifyAppointmentAuth(req, res, next) {
  const internalKey = req.headers['x-internal-key'];
  if (INTERNAL_SERVICE_KEY && internalKey === INTERNAL_SERVICE_KEY) {
    req.auth = { internal: true };
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or malformed Authorization header.' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7).trim(), JWT_SECRET);
    req.auth = { internal: false, userId: payload.sub, role: payload.role, username: payload.username };
    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

// Resolves+authorizes the patientId a request is allowed to touch, or
// throws an Error with a .status the route handler should respond with.
function resolvePatientId(req, requestedPatientId) {
  if (req.auth.internal) return requestedPatientId; // already RBAC-checked upstream by Python
  if (req.auth.role === 'patient') {
    if (requestedPatientId && String(requestedPatientId) !== String(req.auth.userId)) {
      const err = new Error("You are not authorized to access another patient's appointments.");
      err.status = 403;
      throw err;
    }
    return req.auth.userId;
  }
  if (!requestedPatientId) {
    const err = new Error('patientId is required for this role.');
    err.status = 400;
    throw err;
  }
  return requestedPatientId;
}

app.use('/appointments', verifyAppointmentAuth);

function rowToAppointment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    username: row.username,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    start: row.start_time,
    end: row.end_time,
    durationMinutes: row.duration_minutes,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function fetchAppointmentsForDate(dateStr) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`);
  if (error) throw error;
  return (data || []).map(rowToAppointment);
}

app.get('/appointments/eligibility/:userId', async (req, res) => {
  let userId;
  try {
    userId = resolvePatientId(req, req.params.userId);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }
  const username = req.query.username || req.auth.username || '';

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
  let patientId;
  try {
    patientId = resolvePatientId(req, req.query.patientId);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: 'date is required.' });
  }

  let dayAppointments;
  try {
    dayAppointments = await fetchAppointmentsForDate(date);
  } catch (err) {
    console.error('[Appointments] fetch by date failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load appointments.' });
  }

  const daySlots = createDaySlots(date);
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
  let patientId;
  try {
    patientId = resolvePatientId(req, req.query.patientId);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[Appointments] /my query failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load appointments.' });
  }

  return res.json({ success: true, appointments: (data || []).map(rowToAppointment) });
});

app.post('/appointments/book', async (req, res) => {
  let patientId;
  try {
    patientId = resolvePatientId(req, req.body.patientId);
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const { doctorId, start } = req.body;
  const username = req.body.username || req.auth.username || '';

  if (!doctorId || !start) {
    return res.status(400).json({ success: false, message: 'doctorId and start are required.' });
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

  const dateStr = slotStart.toISOString().slice(0, 10);
  let dayAppointments;
  try {
    dayAppointments = await fetchAppointmentsForDate(dateStr);
  } catch (err) {
    console.error('[Appointments] conflict check failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not verify slot availability.' });
  }

  const doctorConflict = dayAppointments.find((a) =>
    a.doctorId === doctorId && overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end))
  );
  if (doctorConflict) {
    return res.status(409).json({ success: false, message: 'This doctor slot is already booked.' });
  }

  const patientConflict = dayAppointments.find((a) =>
    String(a.patientId) === String(patientId) && overlaps(slotStart, slotEnd, new Date(a.start), new Date(a.end))
  );
  if (patientConflict) {
    return res.status(409).json({ success: false, message: 'You already have an appointment overlapping this slot.' });
  }

  const row = {
    id: `apt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    patient_id: patientId,
    username: username || '',
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialty: doctor.specialty,
    start_time: slotStart.toISOString(),
    end_time: slotEnd.toISOString(),
    duration_minutes: APPOINTMENT_DURATION_MINUTES,
    status: 'booked',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('appointments')
    .insert([row])
    .select()
    .single();

  if (insertError) {
    console.error('[Appointments] insert failed:', insertError.message);
    return res.status(500).json({ success: false, message: 'Could not save the appointment.' });
  }

  return res.json({ success: true, appointment: rowToAppointment(inserted) });
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
  console.log(`[${new Date().toISOString()}] ALERT: ${alertType} (${urgency}) triggered by ${doctorName} at ${location}`);
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