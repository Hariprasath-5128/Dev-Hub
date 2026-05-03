# 🛠 VitalsGuard AI - Local Implementation Guide

Follow these steps to run the complete VitalsGuard AI ecosystem locally. This system consists of four main services that need to run simultaneously.

## 📋 Prerequisites
- **Python 3.10+** (3.11 recommended)
- **Node.js 18+**
- **Git**
- **Environment Variables**: Ensure you have configured `.env` files in `vitalsgaurd/backend/` and `vitalsgaurd/server/` (see `.env.example` in those folders).

---

## 🚀 Step-by-Step Execution

### 1️⃣ Start the Prediction Engine (Flask)
This service loads the ML models (XGBoost/LSTM) for core vital analysis.
```bash
cd base_models
python app.py
```
*   **Port**: 5000
*   **Responsibility**: Disease prediction (Model 01), Trend analysis (Model 03), and What-If simulations (Model 07).

### 2️⃣ Start the Database API (Node.js)
This service manages user authentication, patient data, and medical reports via Supabase.
```bash
cd vitalsgaurd/server
npm install
node server.js
```
*   **Port**: 5003
*   **Responsibility**: Auth gating, Database CRUD, and session management.

### 3️⃣ Start the AI Agent Suite (FastAPI)
This service powers the Agentic AI features, including the Multi-Agent Debate and reasoning.
```bash
cd vitalsgaurd/backend
pip install -r requirements.txt
python main.py
```
*   **Port**: 8000
*   **Responsibility**: Phidata agents, Mistral LLM reasoning, and complex health summaries.

### 4️⃣ Start the Frontend (React + Vite)
The interactive dashboard and 2D Digital Twin visualization.
```bash
cd vitalsgaurd
npm install
npm run dev
```
*   **Port**: 5173
*   **Responsibility**: User Interface, Real-time Charts, and Digital Twin animations.

---

## 🔗 Service Map
| Service | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React / Vite | 5173 | Patient & Doctor Dashboard |
| **Auth Server** | Node.js / Express | 5003 | Supabase & Account Management |
| **AI Agents** | FastAPI / Phidata | 8000 | Multi-Agent Debate & Summaries |
| **ML Engine** | Flask / XGBoost | 5000 | Real-time Vital Prediction |

---

## 💡 Troubleshooting
- **CORS Errors**: Ensure all four servers are running. The frontend is configured to talk to ports 5000, 5003, and 8000.
- **Port Conflicts**: If a port is already in use, you can change it in the respective `app.run()` or `app.listen()` calls, but remember to update the frontend API URLs.
- **Missing Models**: If `base_models` fails to start, ensure the `.pkl` and `.keras` files are present in their respective subdirectories.
