"""
VitalsGuard AI — FastAPI Backend
=================================
Routes:
  POST /api/analyze-vitals              → full 8-agent pipeline
  POST /api/vitals/record                → fast, no-LLM write of a live vitals reading
  POST /api/chat                        → NLP/Chatbot agent
  POST /api/ews                         → Early Warning Score only (fast, no LLM)
  POST /api/fingerprint                 → Health Anomaly Fingerprint only
  POST /api/predict/disease             → Model 01 Health Predictor
  GET  /api/patient/{id}/profile        → patient profile
  GET  /api/patient/{id}/history        → vitals + analysis history
  GET  /api/patient/{id}/emergency-events → past emergency events
  GET  /api/doctors                     → doctor contact directory
  GET  /api/health                      → server health check
  GET  /api/simulate                    → sample vitals for frontend testing
"""

from __future__ import annotations
import os
import sys
from dotenv import load_dotenv

# Must run before any local import below — several of them (e.g. services.db)
# read Supabase/JWT/etc. env vars at import time, and would otherwise always
# see an empty environment regardless of what's actually in .env.
load_dotenv()

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add base_models to path for Model 01 import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../base_models'))

from agents.vitals_agents import run_full_pipeline, run_chat_pipeline
from models.health_logic import compute_ews, match_fingerprints
from tools.lstm_tool import lstm_predict
from services.alert_service import dispatch_emergency_alert
from services import data_store
from services.auth import CurrentUser, enforce_patient_scope, get_current_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vitalsguard")


# ── Request / Response models ────────────────────────────────────────────────

class VitalsPayload(BaseModel):
    heart_rate: float       = Field(..., ge=0,   le=300,  description="BPM")
    spo2: float             = Field(..., ge=0,   le=100,  description="Oxygen saturation %")
    temperature: float      = Field(..., ge=25,  le=45,   description="Body temp °C")
    systolic_bp: float      = Field(120.0, ge=40,  le=250,  description="Systolic mmHg")
    diastolic_bp: float     = Field(80.0,  ge=30,  le=150,  description="Diastolic mmHg")
    respiratory_rate: float = Field(16.0,  ge=5,   le=60,   description="Breaths per minute")
    ecg_irregularity: float = Field(0.0, ge=0.0, le=1.0, description="ECG anomaly score 0-1")
    report_image: str | None = Field(None, description="Base64 encoded medical report image for Vision analysis")
    # Trend data (sequence of readings)
    sequence: list[dict] | None = Field(None, description="List of past readings")
    history: list[dict] | None = Field(None, description="Legacy field")
    # None = "use my own identity" for a patient, resolved by enforce_patient_scope().
    # Must default to None, not a fixed id — RBAC treats any non-None value as an
    # explicit request that must match the caller's own id (or be a doctor/admin).
    patient_id: str | None = Field(None, description="Patient identifier for history/personalisation. Omit to use your own identity.")
    use_ai: bool = Field(True, description="If false, skip the LLM agents entirely and use the deterministic rule-based analysis instead.")


class VitalsRecordPayload(BaseModel):
    """Lightweight reading write — no LLM pipeline, just persists to vitals_history
    so get_latest_vitals()/the chatbot reflect what's actually on screen right now."""
    heart_rate: float       = Field(..., ge=0,  le=300, description="BPM")
    spo2: float              = Field(..., ge=0,  le=100, description="Oxygen saturation %")
    temperature: float       = Field(..., ge=25, le=45,  description="Body temp °C")
    systolic_bp: float       = Field(120.0, ge=40, le=250, description="Systolic mmHg")
    diastolic_bp: float      = Field(80.0,  ge=30, le=150, description="Diastolic mmHg")
    respiratory_rate: float  = Field(16.0,  ge=5,  le=60,  description="Breaths per minute")
    patient_id: str | None   = Field(None, description="Omit to use your own identity.")


class ChatPayload(BaseModel):
    message: str = Field(..., description="The patient's natural-language question")
    patient_id: str | None = Field(None, description="Patient identifier for grounding the answer. Omit to use your own identity.")
    use_ai: bool = Field(True, description="If false, skip the LLM chatbot agent entirely and use the deterministic rule-based answer instead.")


# ── App ──────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VitalsGuard backend starting...")
    yield
    logger.info("VitalsGuard backend shutting down.")

app = FastAPI(
    title="VitalsGuard AI",
    description="Agentic AI-powered vital analysis and health prediction system.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "VitalsGuard AI Agent Backend is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "VitalsGuard AI Backend"}


@app.get("/api/simulate")
async def simulate_vitals():
    """Returns a sample critical vitals payload for frontend demo/testing."""
    return {
        "heart_rate": 112,
        "spo2": 91,
        "temperature": 38.4,
        "ecg_irregularity": 0.72,
    }


# ── Model Loading Cache ───────────────────────────────────────────────────────
_MODEL_01_CACHE = None
_MODEL_03_CACHE = None

def get_model_01():
    global _MODEL_01_CACHE
    if _MODEL_01_CACHE is None:
        import importlib.util
        path = os.path.join(os.path.dirname(__file__), '../../base_models/01_health_predictor/predict.py')
        spec = importlib.util.spec_from_file_location("predict_module_01", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _MODEL_01_CACHE = mod.predict_condition
    return _MODEL_01_CACHE

def get_model_03():
    global _MODEL_03_CACHE
    if _MODEL_03_CACHE is None:
        import importlib.util
        path = os.path.join(os.path.dirname(__file__), '../../base_models/03_trend_prediction/predict.py')
        spec = importlib.util.spec_from_file_location("predict_module_03", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _MODEL_03_CACHE = mod.predict_trend
    return _MODEL_03_CACHE


@app.post("/api/predict/disease")
async def predict_disease(payload: VitalsPayload):
    """Model 01 Health Predictor endpoint — returns health condition prediction."""
    try:
        predict_condition = get_model_01()
        
        # Prepare vitals dictionary matching Model 01 feature names
        vitals_dict = {
            "heart_rate": payload.heart_rate,
            "spo2": payload.spo2,
            "temperature": payload.temperature,
            "respiratory_rate": payload.respiratory_rate,
            "systolic_bp": payload.systolic_bp,
            "diastolic_bp": payload.diastolic_bp,
            "hr_variability": 8,     # Default
        }
        
        # Get prediction from Model 01
        result = predict_condition(vitals_dict)
        
        return {
            "status": "success",
            "predicted_condition": result["predicted_condition"],
            "confidence": result["confidence"],
            "all_probabilities": result["all_probabilities"],
            "model": "01_health_predictor"
        }
    except Exception as exc:
        logger.exception("Model 01 prediction failed")
        return {
            "status": "error",
            "error": str(exc),
            "predicted_condition": "Unknown",
            "confidence": 0.0,
            "all_probabilities": {},
            "model": "01_health_predictor"
        }


@app.post("/api/predict/trend")
async def predict_trend_endpoint(payload: VitalsPayload):
    """Model 03 Trend Predictor endpoint."""
    try:
        if not payload.sequence:
            # Fallback: create a dummy sequence if none provided
            dummy_vitals = {
                "heart_rate": payload.heart_rate,
                "spo2": payload.spo2,
                "temperature": payload.temperature,
                "respiratory_rate": 16,
            }
            sequence = [dummy_vitals] * 24
        else:
            sequence = payload.sequence

        # Use cached Model 03 predictor
        predict_trend_func = get_model_03()
        result = predict_trend_func(sequence)
        
        return {
            "status": "success",
            "trend": result["trend"],
            "confidence": result["confidence"],
            "next_vitals": result["predicted_next_vitals"],
            "probabilities": result["trend_probabilities"],
            "model": "03_trend_prediction"
        }
    except Exception as exc:
        logger.exception("Model 03 prediction failed")
        return {
            "status": "error",
            "error": str(exc),
            "trend": "unknown",
            "confidence": 0.0,
            "model": "03_trend_prediction"
        }


@app.post("/api/predict/unified")
async def predict_unified(payload: VitalsPayload):
    """Runs Model 01 and Model 03 in parallel for a unified health report."""
    disease_task = predict_disease(payload)
    trend_task = predict_trend_endpoint(payload)
    
    disease_res, trend_res = await asyncio.gather(disease_task, trend_task)
    
    import time
    return {
        "status": "success",
        "diagnosis": disease_res,
        "trend": trend_res,
        "timestamp": int(time.time())
    }


@app.post("/api/ews")
async def early_warning_score(payload: VitalsPayload):
    """Fast EWS endpoint — no LLM calls, instant response."""
    vitals_json = json.dumps(payload.model_dump(exclude={"history"}))
    lstm_result = json.loads(lstm_predict(vitals_json))
    ews = compute_ews(lstm_result["anomaly_score"])
    return {
        "ews": ews,
        "lstm_result": lstm_result,
    }


@app.post("/api/fingerprint")
async def health_fingerprint(payload: VitalsPayload):
    """Returns matched disease fingerprints without running LLM agents."""
    vitals_json = json.dumps(payload.model_dump(exclude={"history"}))
    lstm_result = json.loads(lstm_predict(vitals_json))
    fingerprints = match_fingerprints(lstm_result.get("patterns", []))
    return {
        "patterns": lstm_result.get("patterns", []),
        "fingerprints": fingerprints,
    }


import time

@app.post("/api/emergency-alert")
async def trigger_emergency_alert(payload: dict, current_user: CurrentUser = Depends(get_current_user)):
    """Fast emergency alert endpoint triggered by UI when live vitals hit critical."""
    patient_id = enforce_patient_scope(current_user, payload.get("patient_id"))
    
    # Cooldown: only 1 alert per 60 seconds per patient
    last_sent = getattr(app.state, f"last_alert_{patient_id}", 0)
    if time.time() - last_sent < 60:
        return {"dispatched": False, "reason": "cooldown"}
        
    setattr(app.state, f"last_alert_{patient_id}", time.time())
    
    vitals = payload.get("vitals", {})
    risk_score = payload.get("risk_score")
    model_diagnosis = payload.get("diagnosis", "N/A")
    trend = payload.get("trend", "N/A")
    
    if risk_score is not None:
        consensus = f"Model Alert! Real-time Clinical Risk Assessment for {patient_id} reached CRITICAL ({risk_score}%).\nModel Diagnosis: {model_diagnosis.replace('_', ' ')}\nTrajectory: {trend}"
    else:
        consensus = f"Automatic Live Monitor Alert! Patient {patient_id} hit CRITICAL vitals thresholds."
    
    asyncio.create_task(
        asyncio.to_thread(
            dispatch_emergency_alert,
            vitals,
            consensus,
            "critical"
        )
    )
    return {"dispatched": True}


@app.post("/api/vitals/record")
async def record_vitals(payload: VitalsRecordPayload, current_user: CurrentUser = Depends(get_current_user)):
    """
    Fast, non-LLM write of a live vitals reading (e.g. from a dashboard's
    real-time display) into vitals_history, so get_latest_vitals() — and
    therefore the chatbot's "analyse my current data" answers — reflect
    what's actually on screen instead of falling back to the baseline profile.
    """
    patient_id = enforce_patient_scope(current_user, payload.patient_id)
    vitals = payload.model_dump(exclude={"patient_id"})
    entry = await asyncio.to_thread(data_store.record_vitals, patient_id, vitals)
    return {"recorded": True, "vitals": entry}


@app.post("/api/analyze-vitals")
async def analyze_vitals(payload: VitalsPayload, current_user: CurrentUser = Depends(get_current_user)):
    """
    Full 8-agent pipeline endpoint.
    Runs the Phidata agent debate, generates explanation, action plan,
    emergency decision, comparison/vision analysis, and Digital Twin UI metadata.
    """
    patient_id = enforce_patient_scope(current_user, payload.patient_id)
    vitals = payload.model_dump(exclude={"history", "report_image", "patient_id", "use_ai"})
    report_image = payload.report_image

    try:
        # Run blocking agent pipeline in a thread so we don't block the event loop
        result = await asyncio.to_thread(run_full_pipeline, vitals, report_image, patient_id, payload.use_ai)
    except Exception as exc:
        logger.exception("Agent pipeline failed")
        raise HTTPException(status_code=500, detail=str(exc))

    # Dispatch emergency alert if needed (fire-and-forget)
    if result.get("emergency", {}).get("dispatch_alert"):
        asyncio.create_task(
            asyncio.to_thread(
                dispatch_emergency_alert,
                vitals,
                result.get("consensus", ""),
                result.get("ews", {}).get("level", "stable"),
            )
        )

    return result


@app.post("/api/chat")
async def chat(payload: ChatPayload, current_user: CurrentUser = Depends(get_current_user)):
    """NLP/Chatbot Agent endpoint — answers questions grounded in patient data.
    RBAC: a patient can only ever be answered about their own data; a doctor/admin
    may query any patient_id they specify."""
    patient_id = enforce_patient_scope(current_user, payload.patient_id)
    try:
        result = await asyncio.to_thread(
            run_chat_pipeline, patient_id, payload.message, payload.use_ai, current_user.username
        )
    except Exception as exc:
        logger.exception("Chat pipeline failed")
        raise HTTPException(status_code=500, detail=str(exc))
    return result


@app.get("/api/patient/{patient_id}/profile")
async def patient_profile(patient_id: str, current_user: CurrentUser = Depends(get_current_user)):
    resolved_id = enforce_patient_scope(current_user, patient_id)
    return data_store.get_patient_profile(resolved_id)


@app.get("/api/patient/{patient_id}/history")
async def patient_history(patient_id: str, limit: int = 20, current_user: CurrentUser = Depends(get_current_user)):
    resolved_id = enforce_patient_scope(current_user, patient_id)
    return data_store.get_patient_history(resolved_id, limit)


@app.get("/api/patient/{patient_id}/emergency-events")
async def patient_emergency_events(patient_id: str, limit: int = 10, current_user: CurrentUser = Depends(get_current_user)):
    resolved_id = enforce_patient_scope(current_user, patient_id)
    return {"events": data_store.get_emergency_events(resolved_id, limit)}


@app.get("/api/doctors")
async def doctors(specialty: str | None = None):
    return {"doctors": data_store.get_doctor_contacts(specialty)}


if __name__ == "__main__":
    import uvicorn
    # Use main:app to ensure reload works correctly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
