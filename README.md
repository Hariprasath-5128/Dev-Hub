---
title: VitalsGuard AI
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# AI-Based Vital Analysis & Health Prediction System

## 🌟 Overview
An intelligent application designed to collect and analyze human vital parameters (Heart Rate, SpO₂, ECG, Temperature) using Machine Learning and Agentic AI. 
This project goes beyond simple monitoring. It acts as a **Virtual Health Companion**, featuring a Digital Twin visualization, continuous trend analysis, and a Multi-Agent Debate system to ensure accurate health predictions.

## 🚀 Key Features

### 1. Vital Data Input & ML Engine
- **Input:** Real-time data or dataset inputs.
- **Engine:** Employs ML (Scikit-learn, TensorFlow/PyTorch) including LSTM for time-series forecasting.
- **Doctor vs AI Comparison:** Side-by-side comparison mode of AI predictions versus provided medical reports.

### 2. Advanced Predictive Analytics
- **Continuous Trend Prediction:** Forecasts potential health conditions based on historical trends, not just current anomalies.
- **Silent Risk Detector:** Identifies micro-fluctuations and irregular rhythms (e.g., normal HR/SpO₂ but dangerous underlying patterns).
- **Health Anomaly Fingerprint:** Maps vitals to a unique signature and compares it with known disease fingerprints (e.g., COVID-like, Cardiac).

### 3. Agentic AI & AI Debate System (Powered by Phidata)
- **Multi-Agent System:** Employs distinct agents for monitoring, explanation, emergency handling, and diagnosis.
- **AI Debate System:** Multiple agents argue their perspectives (e.g., Agent A: "Normal", Agent B: "Possible risk") to reach a consensus, outputting a composite decision with a disagreement score.

### 4. Interactive UI & Digital Twin
- **2D Visual Body System:** Cinematic scanning animation of a 2D human silhouette, highlighting problem areas with an expanding heatmap circle, layered diagnostics, and voice summaries.
- **Dashboard & Emergency Mode:** Clean visualization using Recharts/Chart.js, with dynamic switching between Normal and Critical (Emergency) UI modes.
- **Real-Time ECG:** Highlights abnormal segments visually.
- **Health Simulator:** Interactive sliders allowing users to adjust vitals and see future predictions (e.g., what happens in 2 hours if SpO₂ drops).

### 5. Smart Alert System & Early Warning
- Categorizes states into Stable, Warning, and Critical, automatically triggering SMS/Email alerts to emergency contacts when necessary.
- **Behavior-Aware Prediction:** Incorporates sleep, stress, and activity levels.

### 6. Health Data Marketplace (Blockchain)
- Optional ethical data sharing where users can provide anonymized data to researchers and earn simulated tokens.

## 🚀 Local Implementation

To run the full VitalsGuard suite locally, you must start the four core services simultaneously. 

### Quick Start (4-Terminal Setup)

1.  **ML Engine**: `cd base_models && python app.py` (Port 5000)
2.  **Auth Server**: `cd vitalsgaurd/server && node server.js` (Port 5003)
3.  **AI Agents**: `cd vitalsgaurd/backend && python main.py` (Port 8000)
4.  **Frontend**: `cd vitalsgaurd && npm run dev` (Port 5173)

For detailed installation instructions, environment setup, and troubleshooting, please refer to the:
👉 **[Detailed Implementation Guide](file:///c:/Projects/Dev-Hub/IMPLEMENTATION_STEPS.md)**

---

## 🛠 Tech Stack
- **Backend**: Python (FastAPI/Flask)
- **Agentic AI**: Phidata (replaces LangChain for production-grade agent memory, tools, and execution)
- **Machine Learning**: Scikit-learn, TensorFlow/LSTM, PyTorch
- **Frontend**: React, Framer Motion (for Digital Twin animations), Chart.js/Recharts/D3.js
- **Alerts**: Twilio API, SendGrid
- **Optional Web3**: Ethereum/Polygon, Solidity, Web3.js


## 📝 Agentic AI Workflow using Phidata
We will be utilizing **Phidata** to build the AI Agents. Phidata is highly recommended for this project because:
1. It natively supports **memory** (storing past vitals and conversations in a database).
2. It has built-in **tool integration** (e.g., calling the ML model, querying the database).
3. It simplifies the implementation of **multi-agent teams** (perfect for our AI Debate System).

*Refer to the `.agents/workflows/ai_agents_phidata_workflow.md` for the detailed Phidata implementation workflow.*

## 🚀 Local Development Setup

To run the full VitalsGuard suite locally, follow these steps:

### 1️⃣ Backend Setup (Python AI Agent)
The AI agent suite handles health analysis and trend predictions.
```bash
cd vitalsgaurd/backend
# Install dependencies
pip install -r requirements.txt
# Start the FastAPI server
python main.py
```
*Backend will be available at `http://localhost:8000`*

### 2️⃣ Database Server (Node.js)
The Node.js server handles authentication and medical reporting using Supabase.
```bash
cd vitalsgaurd/server
# Install dependencies
npm install
# Start the server
npm start
```
*Database server will be available at `http://localhost:5003`*

### 3️⃣ Frontend Setup (React + Vite)
The interactive dashboard and Digital Twin visualization.
```bash
cd vitalsgaurd
# Install dependencies
npm install
# Start the development server
npm run dev
```
*Dashboard will be available at `http://localhost:5173`*

### 🧪 Combined AI Suite
You can also run the unified AI suite using the PowerShell script:
```powershell
./vitalsgaurd/backend/run_ai_suite.ps1
```

