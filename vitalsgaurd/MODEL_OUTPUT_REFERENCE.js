/**
 * IntegratedHealthAnalyzer Component - OUTPUT REFERENCE
 * 
 * This component displays 5 major sections from Model 01 & 07 outputs
 */

// ============================================================================
// 🤖 SECTION 1: AI DIAGNOSIS (Model 01 Current Health Prediction)
// ============================================================================

Model01Output = {
  "predicted_condition": "Normal",        // Current diagnosis
  "confidence": 0.98,                     // 0-1 scale, displayed as %
  "all_probabilities": {                  // All disease hypotheses ranked
    "Normal": 0.98,
    "Tachycardia": 0.015,
    "Fever": 0.005,
    "Hypotension": 0.0,
    "Bradycardia": 0.0
  }
};

// DISPLAY: Large primary condition + confidence bar + What-If simulator


// ============================================================================
// 📊 SECTION 2: DISEASE PROBABILITIES (Model 01 Full Predictions)
// ============================================================================

DiseaseProbabilities = [
  {
    name: "Normal",
    probability: 0.98,      // 98%
    color: "Green"
  },
  {
    name: "Tachycardia", 
    probability: 0.015,     // 1.5%
    color: "Amber"
  },
  {
    name: "Fever",
    probability: 0.005,     // 0.5%
    color: "Red"
  }
  // ... more conditions ranked by probability
];

// DISPLAY: Horizontal bar chart with top 5 conditions


// ============================================================================
// 💓 SECTION 3: REAL-TIME VITAL SIGNALS (Model 01 Input Variables)
// ============================================================================

RealTimeVitals = {
  "heart_rate": 85,           // bpm
  "spo2": 97,                 // %
  "temperature": 37.0,        // °C
  "respiratory_rate": 16,     // breaths/min
  "systolic_bp": 120,         // mmHg
  "diastolic_bp": 75,         // mmHg
  "hr_variability": 8         // ms (optional)
};

// CHART DATA: Multi-line graph showing 10-point history
VitalsHistory = [
  { time: "14:32", hr: 72, spo2: 98, temp: 36.5, bp: 118 },
  { time: "14:33", hr: 73, spo2: 98, temp: 36.5, bp: 119 },
  { time: "14:34", hr: 75, spo2: 97, temp: 36.6, bp: 120 },
  // ... up to 10 latest measurements
];

// DISPLAY: 
// - HR: Red line (normal: 60-100 bpm)
// - SpO2: Blue line (normal: ≥95%)
// - Temperature: Amber line (normal: 36.5-37.5°C)
// - BP Systolic: Green line (normal: <120 mmHg)
// - Dual Y-axis for better readability


// ============================================================================
// 🔮 SECTION 4: 24-HOUR HEALTH RISK PROJECTIONS (Model 07 What-If)
// ============================================================================

Model07Output = {
  "predictions": {
    "2h": {
      "risk_score": 0.15,           // 0-1 scale → 15%
      "condition": "Normal",         // Predicted condition at 2h
      "risk_level": "low",          // low|moderate|high
      "confidence": 0.92            // Model confidence in prediction
    },
    "6h": {
      "risk_score": 0.18,
      "condition": "Normal",
      "risk_level": "low",
      "confidence": 0.89
    },
    "12h": {
      "risk_score": 0.22,
      "condition": "Borderline Hypertension",
      "risk_level": "moderate",
      "confidence": 0.75
    },
    "24h": {
      "risk_score": 0.28,
      "condition": "Mild Hypertension",
      "risk_level": "moderate",
      "confidence": 0.71
    }
  },
  "overall_trajectory": "deteriorating"  // improving|stable|deteriorating
};

// DISPLAY:
// - Area chart: Risk evolution over 24 hours (5 data points)
// - X-axis: Current → 2h → 6h → 12h → 24h
// - Y-axis: Risk Score (0-100%)
// - Color gradient: Purple gradient fill with trend line
// - Status badges: Condition + Risk Level for each timepoint
// - Legend: Trajectory status (color-coded)


// ============================================================================
// 💡 SECTION 5: CURRENT VITAL SIGNS STATUS (Input Context)
// ============================================================================

VitalSignsStatus = [
  {
    label: "Heart Rate",
    value: 85,
    unit: "bpm",
    normal_range: "60-100",
    status: "Normal"    // Derived from value vs range
  },
  {
    label: "SpO2",
    value: 97,
    unit: "%",
    normal_range: ">95",
    status: "Normal"
  },
  {
    label: "Temperature",
    value: 37.0,
    unit: "°C",
    normal_range: "36.5-37.5",
    status: "Normal"
  },
  {
    label: "BP (Systolic)",
    value: 120,
    unit: "mmHg",
    normal_range: "<120",
    status: "Elevated"
  }
];

// DISPLAY: 4-card grid with large values + status indicators


// ============================================================================
// 🔧 WHAT-IF SIMULATOR FEATURE
// ============================================================================

// When user clicks "⚙️ What-If" button:
SimulatorInputs = {
  "heart_rate": {
    min: 40,
    max: 160,
    step: 1,
    current: 85,
    slider: true
  },
  "spo2": {
    min: 70,
    max: 100,
    step: 1,
    current: 97,
    slider: true
  },
  "temperature": {
    min: 35,
    max: 40,
    step: 0.1,
    current: 37.0,
    slider: true
  },
  "systolic_bp": {
    min: 80,
    max: 200,
    step: 1,
    current: 120,
    slider: true
  }
};

// On any slider change:
// 1. Send new vitals to /api/integrated/analysis
// 2. Receive updated Model 01 diagnosis
// 3. Receive updated Model 07 projections
// 4. All 5 sections UPDATE INSTANTLY without page reload
// 5. User sees immediate "what-if" outcome


// ============================================================================
// 📡 API FLOW DIAGRAM
// ============================================================================

/*
┌─────────────────────────────────────────────────────────────┐
│       User Views IntegratedHealthAnalyzer Component          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Auto-refresh every 5s │
         │ OR slider change      │
         └───────────┬───────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │ POST /api/integrated/analysis          │
    │ with current vitals                    │
    └────────┬─────────────────────┬─────────┘
             │                     │
             ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐
    │  Model 01       │   │  Model 07       │
    │ (Diagnosis)     │   │ (What-If 24h)   │
    └────────┬────────┘   └────────┬────────┘
             │                     │
             ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ Response:       │   │ Response:       │
    │ • Condition     │   │ • 2h/6h/12h/24h │
    │ • Confidence    │   │   predictions   │
    │ • All Probs     │   │ • Trajectory    │
    └────────┬────────┘   └────────┬────────┘
             │                     │
             └──────────┬──────────┘
                        │
                        ▼
        ┌──────────────────────────┐
        │ Display All 5 Sections:  │
        │ 1. AI Diagnosis          │
        │ 2. Disease Probs         │
        │ 3. Real-Time Vitals      │
        │ 4. 24h Projections       │
        │ 5. Current Vital Status  │
        └──────────────────────────┘
*/


// ============================================================================
// 📊 VISUALIZATION EXAMPLES
// ============================================================================

// EXAMPLE 1: Normal Patient
NormalPatient = {
  vitals: {
    heart_rate: 72,
    spo2: 98,
    temperature: 36.8,
    systolic_bp: 115
  },
  model01_output: {
    predicted_condition: "Normal",
    confidence: 0.96
  },
  model07_output: {
    overall_trajectory: "stable",    // Stays healthy
    predictions: {
      "2h": { risk_score: 0.12, risk_level: "low" },
      "24h": { risk_score: 0.14, risk_level: "low" }
    }
  }
};

// EXAMPLE 2: Abnormal Patient
AbnormalPatient = {
  vitals: {
    heart_rate: 125,     // High
    spo2: 91,            // Low
    temperature: 38.5,   // Fever
    systolic_bp: 145     // Hypertensive
  },
  model01_output: {
    predicted_condition: "Fever + Tachycardia",
    confidence: 0.87
  },
  model07_output: {
    overall_trajectory: "deteriorating",  // Getting worse
    predictions: {
      "2h": { risk_score: 0.65, risk_level: "high" },
      "24h": { risk_score: 0.78, risk_level: "high" }
    }
  }
};


// ============================================================================
// 🎨 COLOR SCHEME
// ============================================================================

ColorScheme = {
  purple: "#7C3AED",      // Primary UI color
  green: "#10b981",       // Low risk / Normal
  amber: "#f59e0b",       // Moderate risk / Warning  
  red: "#ef4444",         // High risk / Critical
  blue: "#3b82f6",        // SpO2 indicator
  slate: "#64748b"        // Neutral/secondary
};


// ============================================================================
// 🚀 USER JOURNEY
// ============================================================================

UserJourney = [
  "1. Open /health-analysis",
  "2. See AI Diagnosis card with current condition",
  "3. View Disease Probabilities (what else could it be?)",
  "4. Check Real-Time Vitals (4-parameter graph)",
  "5. Review 24-Hour Projections (what will happen?)",
  "6. OPTIONAL: Click 'What-If' and adjust sliders",
  "7. Watch all sections update instantly",
  "8. Make informed clinical decisions"
];

// ============================================================================
// END OF OUTPUT REFERENCE
// ============================================================================
