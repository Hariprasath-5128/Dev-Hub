"""
VitalsGuard AI Agents — Powered by Phidata + Mistral
=====================================================
Defines 5 specialist agents and a Debate Coordinator:

  1. Monitoring Agent    — continuously watches vitals, invokes LSTM tool
  2. Diagnosis Agent     — matches anomalies to disease fingerprints
  3. Explanation Agent   — translates diagnosis into plain language for the UI
  4. Action Agent        — provides step-by-step patient guidance
  5. Emergency Agent     — decides if alert dispatch is required

  + Debate Coordinator   — orchestrates Monitoring vs Diagnosis debate
"""

from __future__ import annotations
import os
import json
from typing import List, Optional
from pydantic import BaseModel, Field
from phi.agent import Agent
from phi.model.mistral import MistralChat
from mistralai import Mistral
from dotenv import load_dotenv

from tools.lstm_tool import lstm_predict
from models.health_logic import compute_ews, match_fingerprints

load_dotenv()

# ── Mistral client config ────────────────────────────────────────────────────
MISTRAL_API_KEY  = os.getenv("MISTRAL_API_KEY", "")

def _mistral(model_id: str = "codestral-latest") -> MistralChat:
    """Return a Phidata MistralChat model."""
    return MistralChat(
        id=model_id,
        api_key=MISTRAL_API_KEY,
    )


# ── Structured Output Models ────────────────────────────────────────────────

class DebateResult(BaseModel):
    consensus: str = Field(..., description="The final combined medical consensus after the debate.")
    disagreement_score: int = Field(..., description="Score from 0-10 indicating the level of disagreement between agents.")
    monitoring_view: str = Field(..., description="Summary of the Monitoring Agent's objective findings.")
    diagnosis_view: str = Field(..., description="Summary of the Diagnosis Agent's clinical interpretation.")

class ExplanationResult(BaseModel):
    ui_label: str = Field(..., description="A short summary sentence for the UI label (max 12 words).")
    voice_summary: str = Field(..., description="A calm voice-over sentence to be spoken to the patient.")

class ActionResult(BaseModel):
    actions: List[str] = Field(..., description="2-4 prioritised actionable steps for the patient/caregiver.")

class EmergencyResult(BaseModel):
    dispatch_alert: bool = Field(..., description="Whether to immediately send emergency alerts.")
    urgency_note: str = Field(..., description="A brief note on why the specific urgency level was chosen.")

class ComparisonResult(BaseModel):
    summary: str = Field(..., description="A 1-sentence summary of the main anomaly region for comparison.")
    insights: List[str] = Field(..., description="2-4 key lab markers or physical findings to check in a medical report.")
    correlation_score: int = Field(..., description="A score from 0-100 indicating the estimated correlation between the AI's diagnosis and the physical report indicators.")


# ── LSTM Tool for Phidata ─────────────────────────────────────────────────────
# In Phidata v2, plain Python functions are passed directly as tools.
def run_lstm_prediction(vitals_json: str) -> str:
    """
    Run the LSTM anomaly detection model on incoming vital signs.
    Args:
        vitals_json: JSON string with keys: heart_rate (float), spo2 (float),
                     temperature (float), ecg_irregularity (float, 0-1).
    Returns:
        JSON string with: anomaly_score, anomaly_detected, patterns,
        affected_regions, and confidence.
    """
    return lstm_predict(vitals_json)


# ── 1. Monitoring Agent ──────────────────────────────────────────────────────
monitoring_agent = Agent(
    name="Monitoring Agent",
    role=(
        "You are a clinical monitoring specialist. "
        "Your job is to read raw patient vitals and LSTM anomaly findings. "
        "Report the findings clearly and objectively — do NOT interpret or diagnose, just report."
    ),
    model=_mistral(),
    instructions=[
        "Report the anomaly_score, detected patterns, and affected regions provided in the input.",
        "Do not speculate about the cause — just state what the sensors and model found.",
        "If anomaly_score < 0.3, state: 'Vitals appear within normal range.'",
    ],
    show_tool_calls=False,
    markdown=False,
)

# ── 2. Diagnosis Agent ───────────────────────────────────────────────────────
diagnosis_agent = Agent(
    name="Diagnosis Agent",
    role=(
        "You are a medical diagnostician AI. Given LSTM anomaly output, "
        "you form a differential diagnosis by matching patterns to known "
        "disease fingerprints and explain the clinical significance."
    ),
    model=_mistral(),
    instructions=[
        "Interpret the patterns from the Monitoring Agent's report.",
        "Map patterns to likely health conditions (e.g., 'ecg_irregularity → arrhythmia').",
        "Always mention severity: high / moderate / low risk.",
        "If you are unsure, state: 'Insufficient data — request more readings.'",
    ],
    show_tool_calls=False,
    markdown=False,
)

# ── 3. Explanation Agent ─────────────────────────────────────────────────────
explanation_agent = Agent(
    name="Explanation Agent",
    role=(
        "You are a patient communication specialist. "
        "You take complex medical diagnoses and translate them into "
        "simple, calm, and reassuring language suitable for a patient-facing UI."
    ),
    model=_mistral(),
    response_model=ExplanationResult,
    instructions=[
        "Receive the Diagnosis Agent's conclusion as input.",
        "Produce a short summary for the UI label and a voice-over summary.",
        "Keep the tone calm, clear, and non-alarming unless EWS is critical.",
    ],
)

# ── 4. Action Agent ──────────────────────────────────────────────────────────
action_agent = Agent(
    name="Action Agent",
    role=(
        "You are a clinical action advisor. Based on the diagnosis, "
        "you provide concrete, prioritised steps the patient or caregiver "
        "should take right now."
    ),
    model=_mistral(),
    response_model=ActionResult,
    instructions=[
        "Receive the diagnosis and EWS level as input.",
        "Provide 2-4 clear, numbered actionable steps.",
        "For 'stable': lifestyle advice.",
        "For 'warning': suggest rest, monitoring, and contacting a doctor.",
        "For 'critical': instruct to call emergency services immediately.",
    ],
)

# ── 5. Emergency Agent ───────────────────────────────────────────────────────
emergency_agent = Agent(
    name="Emergency Agent",
    role=(
        "You are an emergency triage AI. You assess whether the current "
        "health state requires immediate external intervention."
    ),
    model=_mistral(),
    response_model=EmergencyResult,
    instructions=[
        "Receive the EWS level, diagnosis, and consensus as input.",
        "If EWS = 'critical': recommend dispatching an alert immediately.",
        "If EWS = 'warning': recommend notifying the patient's doctor within the hour.",
        "If EWS = 'stable': no emergency action needed.",
    ],
)

# ── 6. Comparison Agent ──────────────────────────────────────────────────────
comparison_agent = Agent(
    name="Comparison Agent",
    role=(
        "You are a clinical laboratory specialist. Your job is to suggest "
        "specific physical lab tests, biomarkers, or imaging findings that "
        "would confirm or refute the current AI diagnosis."
    ),
    model=_mistral(),
    response_model=ComparisonResult,
    instructions=[
        "Receive the diagnosis consensus as input.",
        "Suggest 2-4 concrete things to look for in a physical medical report.",
        "Example: If 'Hypoxemia' -> check 'pO2 levels in ABG' or 'Chest X-Ray'.",
        "Example: If 'Tachycardia' -> check 'ECG ST-segment' or 'Troponin'.",
        "Provide a very short summary sentence of the anomaly region.",
        "Generate a 'correlation_score' (0-100) representing how strongly the AI's vitals-based findings typically align with physical lab confirmations for this diagnosis (simulate 75-98 for clear anomalies, lower for vague ones).",
    ],
)

# ── Debate Coordinator ───────────────────────────────────────────────────────
debate_coordinator = Agent(
    name="Debate Coordinator",
    role=(
        "You moderate a clinical AI debate between the Monitoring Agent "
        "and the Diagnosis Agent. Your goal is to produce a final consensus "
        "and a disagreement score."
    ),
    team=[monitoring_agent, diagnosis_agent],
    model=_mistral(),
    response_model=DebateResult,
    instructions=[
        "Step 1: Ask the Monitoring Agent for its raw vitals assessment.",
        "Step 2: Ask the Diagnosis Agent to interpret the Monitoring Agent's findings.",
        "Step 3: Identify points of agreement and disagreement.",
        "Step 4: Produce a final consensus statement and a disagreement score (0-10).",
    ],
    show_tool_calls=True,
)


# ── Pipeline entry point ─────────────────────────────────────────────────────

def extract_report_data_with_mistral(base64_image: str) -> str:
    """
    Directly calls the mistralai SDK with Pixtral to extract text/findings from an image.
    This bypasses Phidata's native multimodal message limitations in older versions.
    """
    try:
        client = Mistral(api_key=MISTRAL_API_KEY)
        response = client.chat.complete(
            model="pixtral-12b-2409",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all readable text, medical data, test results, and clinical findings from this medical report image. Only return the raw medical facts and numbers you see in the image, without conversational filler."
                        },
                        {
                            "type": "image_url",
                            "image_url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    ]
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Image Analysis Failed. Could not extract text from report due to error: {str(e)}]"

def run_full_pipeline(vitals_data: dict, report_image_base64: str | None = None) -> dict:
    """
    Orchestrates the multi-agent debate and supporting analysis.
    """
    vitals_json = json.dumps(vitals_data)

    # 1. Run LSTM first (no LLM, very fast)
    lstm_raw = json.loads(lstm_predict(vitals_json))
    ews = compute_ews(lstm_raw["anomaly_score"])
    fingerprints = match_fingerprints(lstm_raw.get("patterns", []))

    # 1. Debate: Monitoring + Diagnosis
    debate_prompt = (
        f"New patient vitals: {vitals_json}. "
        f"LSTM Anomaly Detection Results: {json.dumps(lstm_raw)}. "
        "Conduct the diagnostic debate and return the result."
    )
    debate_response = debate_coordinator.run(debate_prompt)
    debate_data = debate_response.content

    # 3. Explanation Agent
    explanation_prompt = (
        f"Diagnosis consensus: {debate_data.consensus}. "
        f"EWS level: {ews['level']}. Generate UI label and voice summary."
    )
    explanation_response = explanation_agent.run(explanation_prompt)
    explanation_data = explanation_response.content

    # 4. Action Agent
    action_prompt = (
        f"Diagnosis: {debate_data.consensus}. "
        f"EWS level: {ews['level']}. Provide action steps."
    )
    action_response = action_agent.run(action_prompt)
    action_data = action_response.content

    # 5. Emergency Agent decision
    emergency_prompt = (
        f"EWS level: {ews['level']}. "
        f"Consensus: {debate_data.consensus}. "
        "Should we dispatch an emergency alert?"
    )
    emergency_response = emergency_agent.run(emergency_prompt)
    emergency_data = emergency_response.content

    report_analyzed = False
    report_text_extract = ""
    if report_image_base64 and len(report_image_base64) > 10:
        report_text_extract = extract_report_data_with_mistral(report_image_base64)
        if "[Image Analysis Failed]" not in report_text_extract:
            report_analyzed = True
        
    if report_text_extract:
        comparison_prompt = (
            f"AI Diagnosis Consensus based on sensors: {debate_data.consensus}.\n\n"
            f"EXTRACTED RAW DATA FROM PHYSICAL MEDICAL REPORT IMAGE:\n---\n{report_text_extract}\n---\n\n"
            f"Provide comparison insights based strictly on the text and data found in the report image above. "
            f"Calculate the correlation_score out of 100 based on how well the sensor consensus matches the actual report text."
        )
    else:
        comparison_prompt = f"Diagnosis: {debate_data.consensus}. Provide theoretical comparison insights as if analyzing a standard report for this condition."
        
    comparison_response = comparison_agent.run(comparison_prompt)
    comparison_data = comparison_response.content

    # ── Assemble final response ───────────────────────────────────────────────
    return {
        "ews": ews,
        "lstm_result": lstm_raw,
        "fingerprints": fingerprints,
        "debate": debate_data.model_dump(),
        "explanation": explanation_data.model_dump(),
        "actions": action_data.actions,
        "emergency": emergency_data.model_dump(),
        "comparison": comparison_data.model_dump(),
        # Convenience fields for the Digital Twin UI
        "affected_regions": lstm_raw.get("affected_regions", ["none"]),
        "heatmap_colour": ews["colour"],
        "ui_label": explanation_data.ui_label,
        "voice_summary": explanation_data.voice_summary,
        "consensus": debate_data.consensus,
        "disagreement_score": debate_data.disagreement_score,
        "report_analyzed": report_analyzed,
    }
