"""
VitalsGuard AI — FastAPI Backend
=================================
Routes:
  POST /api/analyze-vitals      → full 5-agent pipeline
  POST /api/ews                 → Early Warning Score only (fast, no LLM)
  POST /api/fingerprint         → Health Anomaly Fingerprint only
  POST /api/predict/disease     → Model 01 Health Predictor
  GET  /api/health              → server health check
  GET  /api/simulate            → sample vitals for frontend testing
"""

from __future__ import annotations
import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Add base_models to path for Model 01 import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../base_models'))

from agents.vitals_agents import run_full_pipeline
from models.health_logic import compute_ews, match_fingerprints
from tools.lstm_tool import lstm_predict
from services.alert_service import dispatch_emergency_alert

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vitalsguard")


# ── Request / Response models ────────────────────────────────────────────────

class VitalsPayload(BaseModel):
    heart_rate: float       = Field(..., ge=0,   le=300,  description="BPM")
    spo2: float             = Field(..., ge=0,   le=100,  description="Oxygen saturation %")
    temperature: float      = Field(..., ge=25,  le=45,   description="Body temp °C")
    ecg_irregularity: float = Field(0.0, ge=0.0, le=1.0, description="ECG anomaly score 0-1")
    report_image: str | None = Field(None, description="Base64 encoded medical report image for Vision analysis")
    # Optional trend data (last N readings)
    history: list[dict] | None = Field(None, description="List of past VitalsPayload dicts")


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


@app.post("/api/predict/disease")
async def predict_disease(payload: VitalsPayload):
    """Model 01 Health Predictor endpoint — returns health condition prediction."""
    try:
        # Import Model 01 predictor dynamically
        import importlib.util
        spec = importlib.util.spec_from_file_location("predict_module", 
            os.path.join(os.path.dirname(__file__), '../../base_models/01_health_predictor/predict.py'))
        predict_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(predict_module)
        predict_condition = predict_module.predict_condition
        
        # Prepare vitals dictionary for the model
        vitals_dict = {
            "heart_rate": payload.heart_rate,
            "spo2": payload.spo2,
            "temperature": payload.temperature,
            "respiratory_rate": 16,  # Default if not provided
            "systolic_bp": 120,      # Default if not provided
            "diastolic_bp": 75,      # Default if not provided
            "hr_variability": 8,     # Default if not provided
        }
        
        # Get prediction from Model 01
        result = predict_condition(vitals_dict)
        
        return {
            "status": "success",
            "predicted_condition": result["predicted_condition"],
            "confidence": result["confidence"],
            "all_probabilities": result["all_probabilities"],
        }
    except Exception as exc:
        logger.exception("Model 01 prediction failed")
        return {
            "status": "error",
            "error": str(exc),
            "predicted_condition": "Unknown",
            "confidence": 0.0,
            "all_probabilities": {},
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


@app.post("/api/analyze-vitals")
async def analyze_vitals(payload: VitalsPayload):
    """
    Full 5-agent pipeline endpoint.
    Runs the Phidata agent debate, generates explanation, action plan,
    emergency decision, and Digital Twin UI metadata.
    """
    vitals = payload.model_dump(exclude={"history", "report_image"})
    report_image = payload.report_image

    try:
        # Run blocking agent pipeline in a thread so we don't block the event loop
        result = await asyncio.to_thread(run_full_pipeline, vitals, report_image)
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
