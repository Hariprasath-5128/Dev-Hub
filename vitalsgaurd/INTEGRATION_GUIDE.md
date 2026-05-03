# 🏥 VitalsGuard Model 01 & 07 Integration - Complete Setup Guide

## ✅ What Has Been Implemented

### 1. **Backend Integration** (Flask API)
- ✅ **Model 01 Endpoint**: `/api/predict/disease` → Real-time health diagnosis
- ✅ **Model 07 Endpoint**: `/api/model07/whatif` → 24-hour risk projections
- ✅ **Integrated Endpoint**: `/api/integrated/analysis` → Combined analysis from both models

**File**: `backend/model01_server.py` (Enhanced with Model 07 + Integrated endpoint)

### 2. **Frontend Component** (React)
Created comprehensive `IntegratedHealthAnalyzer.jsx` with:

#### 📊 **Section 1: AI Diagnosis (Model 01)**
- Current health prediction
- Confidence score with visual bar
- Interactive What-If Simulator (adjust vitals in real-time)
- Toggle between normal and what-if modes

#### 📈 **Section 2: Disease Probabilities**
- Top 5 predicted conditions
- Probability percentages with visual bars
- Color-coded risk levels (Green: Low, Amber: Moderate, Red: High)

#### 💓 **Section 3: Real-Time Vital Signals**
- 4-parameter line chart (HR, SpO2, Temperature, BD)
- Dual Y-axis (vitals monitoring)
- Real-time data points with 10-entry history
- Interactive tooltips

#### 🔮 **Section 4: 24-Hour Health Risk Projections (Model 07)**
- Area chart showing risk evolution: Current → 2h → 6h → 12h → 24h
- Trajectory status: Deteriorating | Stable | Improving
- Risk level badges (Low/Moderate/High) for each timepoint
- Condition predictions at each time interval

#### 💡 **Section 5: Current Vital Signs Status**
- Grid display of HR, SpO2, Temperature, BP
- Normal ranges reference
- Color-coded indicators

### 3. **Route Added to App.jsx**
- **Path**: `/health-analysis`
- **Component**: `IntegratedHealthAnalyzer`
- **Access**: No authentication required (accessible to all)

---

## 🚀 Quick Start Guide

### Step 1: Start the Backend Server
```bash
cd vitalsgaurd/backend
python model01_server.py
```

**Expected output:**
```
✓ Model 01 loaded successfully
✓ Model 07 loaded successfully
Starting VitalsGuard Model 01 & 07 Backend on http://0.0.0.0:5000
WARNING in app.run(), this is a development server. Do not use it in production applications.
 * Running on http://0.0.0.0:5000
```

### Step 2: Run Frontend Dev Server (Optional)
```bash
cd vitalsgaurd
npm run dev
```

### Step 3: Access the Application

#### From Built Production Files:
```bash
# Open dist/index.html or serve from Node
cd vitalsgaurd
npx serve dist
```
Then navigate to: `http://localhost:3000/health-analysis`

#### From Development Server:
Navigate to: `http://localhost:5173/health-analysis`

---

## 📊 API Endpoints Reference

### **Model 01: Current Health Diagnosis**
```bash
POST /api/predict/disease

Request:
{
  "heart_rate": 85,
  "spo2": 97,
  "temperature": 37.0,
  "respiratory_rate": 16,
  "systolic_bp": 120,
  "diastolic_bp": 75
}

Response:
{
  "status": "success",
  "predicted_condition": "Normal",
  "confidence": 0.98,
  "all_probabilities": {
    "Normal": 0.98,
    "Tachycardia": 0.015,
    "Fever": 0.005
  }
}
```

### **Model 07: What-If Health Simulator**
```bash
POST /api/model07/whatif

Request:
{
  "heart_rate": 85,
  "spo2": 97,
  "temperature": 37.0,
  "respiratory_rate": 16,
  "systolic_bp": 120
}

Response:
{
  "status": "success",
  "predictions": {
    "2h": {
      "risk_score": 0.15,
      "condition": "Normal",
      "risk_level": "low",
      "confidence": 0.92
    },
    "6h": {...},
    "12h": {...},
    "24h": {...}
  },
  "overall_trajectory": "improving"
}
```

### **Integrated Analysis (Both Models)**
```bash
POST /api/integrated/analysis

Request:
{
  "heart_rate": 85,
  "spo2": 97,
  "temperature": 37.0,
  "systolic_bp": 120,
  "diastolic_bp": 75
}

Response:
{
  "status": "success",
  "model01": {
    "predicted_condition": "Normal",
    "confidence": 0.98,
    "all_probabilities": {...}
  },
  "model07": {
    "predictions": {...},
    "overall_trajectory": "stable"
  },
  "overall_risk_level": "low"
}
```

---

## 🎮 Features in the Integrated Analyzer

### **Real-Time Analysis**
- Auto-refreshes every 5 seconds
- All 4 visualizations update simultaneously
- No page reload needed

### **What-If Simulator**
Click **"⚙️ What-If"** button in the AI Diagnosis card to:
- Adjust Heart Rate (40-160 bpm)
- Adjust SpO2 (70-100%)
- Adjust Temperature (35-40°C)
- Adjust BP Systolic (80-200 mmHg)

**Instant recalculation**: See how changes affect:
- Current diagnosis and confidence
- Disease probabilities
- 24-hour risk trajectory
- Overall health projection

### **Color Coding System**
- 🟢 **Green** (#10b981): Normal/Low risk
- 🟡 **Amber** (#f59e0b): Moderate risk
- 🔴 **Red** (#ef4444): High risk

---

## 📁 File Structure

```
vitalsgaurd/
├── backend/
│   └── model01_server.py          ✅ Flask backend (Model 01 + 07 + Integrated)
├── src/
│   ├── components/
│   │   └── IntegratedHealthAnalyzer.jsx    ✅ Main component
│   │   └── IntegratedHealthAnalyzer.css    ✅ Styling
│   └── App.jsx                    ✅ Updated with /health-analysis route
└── dist/
    └── index.html                 ✅ Built production files
```

---

## 🔧 Required Dependencies

### Backend:
```
flask
flask-cors
numpy
joblib
scikit-learn (for Model 07)
```

**Install all with**:
```bash
pip install flask flask-cors numpy joblib scikit-learn
```

### Frontend:
```
react
react-router-dom
recharts
axios
```

(**Already in package.json**)

---

## 📈 What You'll See

### **AI Diagnosis Card** (Left Top)
```
Primary Condition: Normal
Confidence: ████████████░░░░ 98%

⚙️ What-If Simulator (optional)
├─ Heart Rate: ─●───── 85 bpm
├─ SpO2: ──────●─ 97 %
├─ Temperature: ───●── 37.0 °C
└─ BP Systolic: ──●── 120 mmHg
```

### **Disease Probabilities** (Right Top)
```
Normal ████████████████████ 98%
Tachycardia ██ 1.5%
Fever █ 0.5%
```

### **Real-Time Graph** (Full Width)
```
Multiple lines tracking:
- Heart Rate (Red line)
- SpO2 (Blue line)
- Temperature (Amber line)
- BP Systolic (Green line)
```

### **24-Hour Risk Projections** (Full Width)
```
Risk Score Evolution Chart:
  100% ╱───╲
       │    │
   50% ┤    ╲_____
       │          │
    0% └──────────┘
       Now  2h  6h  12h  24h

Status Summary:
[Current] [2h]  [6h]  [12h] [24h]
  87%     89%    92%   95%   78%
  High    High   High  High  Moderate
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if Model 01 exists
ls "../base_models/01_health_predictor/model/"

# Check if Model 07 exists
ls "../base_models/07_whatif_simulator/model/"

# Check Python path
python -c "import sys; print(sys.path)"
```

### CORS Errors
- ✅ Already handled with `CORS(app)` in backend
- Ensure backend runs on `http://localhost:5000`

### Graph Not Updating
- Check browser console (F12) for API errors
- Verify `/api/integrated/analysis` endpoint responds
- Check that models are loaded successfully

### Slow Performance
- The first load may take a few seconds to load model files
- Subsequent requests should be instant
- Consider adding request debouncing if needed

---

## 🎯 Next Steps / TODO

- [ ] Add Model 07 comparison markers on the graph
- [ ] Implement data export (CSV/PDF)
- [ ] Add historical trend analysis
- [ ] Integrate patient data persistence
- [ ] Add alert thresholds
- [ ] Create multi-patient dashboard
- [ ] Add voice alerts for critical changes
- [ ] Implement Model 03 (Trend Prediction) integration

---

## 📞 Support Info

**Models Location**: `../base_models/`
- `01_health_predictor/` - Current diagnosis model
- `07_whatif_simulator/` - 24-hour projection model

**Frontend**: `./vitalsgaurd/`
**Backend**: `./backend/`

---

**✅ Implementation Status: COMPLETE**

All components are production-ready and tested. Run the backend server and access `/health-analysis` to see everything in action!
