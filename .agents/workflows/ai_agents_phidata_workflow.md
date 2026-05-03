---
description: How to set up and run the VitalsGuard AI backend (Phidata + Mistral + FastAPI)
---

# Workflow: Phidata Agentic AI Backend — VitalsGuard

## Project Structure
```
vitalsgaurd/backend/
├── main.py                   ← FastAPI app (entry point)
├── agents/
│   └── vitals_agents.py      ← All 5 agents + Debate Coordinator
├── tools/
│   └── lstm_tool.py          ← LSTM/ML prediction tool (swappable)
├── models/
│   └── health_logic.py       ← EWS + Health Anomaly Fingerprint
├── services/
│   └── alert_service.py      ← Email + SMS emergency alerts
├── requirements.txt
└── .env.example              ← Copy to .env and fill in keys
```

## Step 1: Create & Activate a Virtual Environment
```bash
cd vitalsgaurd/backend
python -m venv venv
# Windows:
venv\Scripts\activate
```

## Step 2: Install Dependencies
// turbo
```bash
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Mistral API key:
```bash
copy .env.example .env
```
Required keys:
- `MISTRAL_API_KEY` — from https://console.mistral.ai/

## Step 4: Run the FastAPI Server
// turbo
```bash
uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## Step 5: Test the Full Agent Pipeline
Send a POST to `/api/analyze-vitals`:
```bash
curl -X POST http://localhost:8000/api/analyze-vitals \
  -H "Content-Type: application/json" \
  -d '{"heart_rate": 112, "spo2": 91, "temperature": 38.4, "ecg_irregularity": 0.72}'
```

## Step 6: Plug in Your Trained LSTM Model
When your PyTorch/Keras LSTM is ready:
1. Save it as `backend/models/lstm_vitals.pt` (PyTorch) or `.h5` (Keras).
2. Open `tools/lstm_tool.py` and replace the `_run_model()` function body with your model inference code (clear TODO comments are in place).

## Available Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/simulate` | Sample critical vitals for frontend testing |
| POST | `/api/ews` | Fast Early Warning Score (no LLM) |
| POST | `/api/fingerprint` | Health Anomaly Fingerprint matching |
| POST | `/api/analyze-vitals` | **Full 5-agent pipeline** |

