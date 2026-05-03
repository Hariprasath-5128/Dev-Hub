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

## 🛠 Tech Stack
- **Backend:** Python (FastAPI/Flask)
- **Agentic AI:** Phidata (replaces LangChain for production-grade agent memory, tools, and execution)
- **Machine Learning:** Scikit-learn, TensorFlow/LSTM, PyTorch
- **Frontend:** React, Framer Motion (for Digital Twin animations), Chart.js/Recharts/D3.js
- **Alerts:** Twilio API, SendGrid
- **Optional Web3:** Ethereum/Polygon, Solidity, Web3.js

## 📝 Agentic AI Workflow using Phidata
We will be utilizing **Phidata** to build the AI Agents. Phidata is highly recommended for this project because:
1. It natively supports **memory** (storing past vitals and conversations in a database).
2. It has built-in **tool integration** (e.g., calling the ML model, querying the database).
3. It simplifies the implementation of **multi-agent teams** (perfect for our AI Debate System).

*Refer to the `.agents/workflows/ai_agents_phidata_workflow.md` for the detailed Phidata implementation workflow.*
