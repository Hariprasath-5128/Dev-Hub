"""
VitalsGuard AI Agents — Powered by Phidata + Mistral
=====================================================
Defines the full 8-agent architecture:

  1. Monitoring Agent     — reads vitals/history, runs LSTM + trend models
  2. Diagnosis Agent      — matches anomalies to disease fingerprints
  3. Debate Coordinator   — challenges Monitoring vs Diagnosis, resolves conflicts
  4. Explanation Agent    — translates consensus into plain patient language
  5. Action Agent         — produces a prioritised, constraint-aware action plan
  6. Emergency Agent      — decides whether to escalate/dispatch alerts
  7. Comparison/Vision Agent — verifies AI findings against uploaded reports
  8. NLP/Chatbot Agent    — answers natural-language questions with patient context

Each agent is attached to the real tool functions it can call (see
backend/tools/*.py). Agents that return free-text (Monitoring, Diagnosis,
Debate Coordinator, Chatbot) invoke their tools autonomously via Mistral
function calling. Agents that return structured output (Explanation, Action,
Emergency, Comparison) are additionally grounded with tool results computed
deterministically in the pipeline below, so their structured fields stay
reliable regardless of whether the underlying model chooses to call a tool.
"""

from __future__ import annotations
import os
import json
import logging
import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from pydantic import BaseModel, Field
from phi.agent import Agent
from phi.model.mistral import MistralChat
from mistralai import Mistral
from dotenv import load_dotenv

from tools.lstm_tool import lstm_predict
from models.health_logic import compute_ews, match_fingerprints
from services import data_store
from tools import monitoring_tools, diagnosis_tools, debate_tools
from tools import explanation_tools, action_tools, emergency_tools
from tools import vision_tools, chatbot_tools, appointment_tools
from services import fallback_engine

load_dotenv()
logger = logging.getLogger("vitalsguard.agents")

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

class ChatResult(BaseModel):
    answer: str = Field(..., description="A direct, patient-friendly answer to the user's question, grounded in their actual data.")
    sources: List[str] = Field(default_factory=list, description="Which tools/data the answer was grounded in (e.g. 'latest vitals', 'medical knowledge base').")


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
        "You are given the LSTM anomaly results, and the patient's vital-sign deviation from their own baseline, directly in the prompt — use only that data.",
        "Report the anomaly_score, detected patterns, and affected regions provided in the input.",
        "Note if this reading is an outlier vs. the patient's own baseline, using the given deviation data.",
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
        "You are given the Monitoring Agent's report, the matched disease fingerprints, curated knowledge-base "
        "entries, the patient's prior history, and a new-vs-recurring pattern comparison directly in the prompt — use only that data.",
        "Interpret the patterns from the Monitoring Agent's report using the given disease fingerprint matches (e.g., 'ecg_irregularity → arrhythmia').",
        "Reference the given patient history / pattern comparison to note whether this is a new or recurring/worsening issue.",
        "Ground your explanation in the given knowledge-base entries rather than guessing.",
        "Always mention severity: high / moderate / low risk.",
        "If the given data is empty/inconclusive, state: 'Insufficient data — request more readings.'",
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
        "Receive the Diagnosis Agent's conclusion, plus a grounded summary draft and simplified terminology, as input.",
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
        "Receive the diagnosis, EWS level, and a grounded action-plan scaffold (clinical guideline + patient constraints) as input.",
        "Adapt the scaffold into 2-4 clear, prioritised actionable steps — respect any constraint warnings (allergies, mobility, medication conflicts).",
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
        "Receive the EWS level, diagnosis, consensus, and hard-threshold breach findings as input.",
        "If EWS = 'critical' OR a hard emergency threshold was breached: recommend dispatching an alert immediately.",
        "If EWS = 'warning': recommend notifying the patient's doctor within the hour.",
        "If EWS = 'stable' and no hard threshold breach: no emergency action needed.",
    ],
)

# ── 6. Comparison / Vision Agent ─────────────────────────────────────────────
comparison_agent = Agent(
    name="Comparison Agent",
    role=(
        "You are a clinical laboratory specialist. Your job is to suggest "
        "specific physical lab tests, biomarkers, or imaging findings that "
        "would confirm or refute the current AI diagnosis, and to reconcile "
        "them against any lab values already extracted from an uploaded report."
    ),
    model=_mistral(),
    response_model=ComparisonResult,
    instructions=[
        "Receive the diagnosis consensus, plus any extracted/normalized lab values and their computed correlation score, as input.",
        "Suggest 2-4 concrete things to look for in a physical medical report.",
        "Example: If 'Hypoxemia' -> check 'pO2 levels in ABG' or 'Chest X-Ray'.",
        "Example: If 'Tachycardia' -> check 'ECG ST-segment' or 'Troponin'.",
        "Provide a very short summary sentence of the anomaly region.",
        "If a computed correlation_score is provided in the input, use it as-is; otherwise estimate 75-98 for clear anomalies, lower for vague ones.",
    ],
)

# ── 7. Debate Coordinator ────────────────────────────────────────────────────
# NOTE: this deliberately does NOT use Phidata's `team=[...]` delegation.
# In testing, both team delegation AND giving Monitoring/Diagnosis their own
# `tools=[...]` (for autonomous free-text tool-calling) were unreliable with
# Phidata 2.7.10 + Mistral's codestral-latest: agents would reply "I don't
# have the necessary tools" even when tools were correctly attached (verified
# the raw Mistral SDK does return valid tool_calls for the same schema — this
# is a Phidata tool-execution-loop issue specific to non-structured/free-text
# agents, not a Mistral or prompting problem). Structured-output agents
# (this coordinator, Explanation/Action/Emergency/Comparison/Chatbot) were
# unaffected. So Monitoring and Diagnosis below are grounded deterministically
# in Python (see run_full_pipeline) instead of calling tools themselves, and
# this coordinator receives their full text output directly rather than via
# team delegation — same division of labour, without the unreliable paths.
debate_coordinator = Agent(
    name="Debate Coordinator",
    role=(
        "You moderate a clinical AI debate. You are given the Monitoring Agent's "
        "raw vitals assessment and the Diagnosis Agent's clinical interpretation "
        "in full. Your goal is to reconcile them into a final consensus and a "
        "disagreement score."
    ),
    model=_mistral(),
    tools=[
        debate_tools.compare_agent_outputs,
        debate_tools.detect_contradictions,
        debate_tools.calculate_disagreement_score,
        debate_tools.request_reanalysis,
    ],
    response_model=DebateResult,
    instructions=[
        "You will be given the Monitoring Agent's full output and the Diagnosis Agent's full output directly in the prompt.",
        "Use compare_agent_outputs and detect_contradictions to check for disagreement between them.",
        "If a contradiction is found, use request_reanalysis to flag which agent's finding is less trustworthy and why.",
        "Use calculate_disagreement_score as a reference point, then produce a final consensus statement and a disagreement score (0-10).",
    ],
    show_tool_calls=True,
)

# ── 8. NLP / Chatbot Agent ───────────────────────────────────────────────────
chatbot_agent = Agent(
    name="Chatbot Agent",
    role=(
        "You are VitalsGuard's patient-facing assistant. You answer natural-language "
        "questions about a patient's vitals, reports, and prior analyses using only "
        "their actual data and the curated medical knowledge base — never invent numbers. "
        "You can also check doctor availability and book real appointments on the patient's behalf."
    ),
    model=_mistral(),
    tools=[
        chatbot_tools.get_patient_profile,
        chatbot_tools.get_vitals,
        chatbot_tools.get_reports,
        chatbot_tools.search_medical_knowledge,
        chatbot_tools.get_previous_analysis,
        appointment_tools.get_available_slots,
        appointment_tools.list_my_appointments,
        appointment_tools.book_doctor_appointment,
    ],
    response_model=ChatResult,
    instructions=[
        "Always call the relevant tool(s) before answering a question about the patient's own data.",
        "Use search_medical_knowledge to ground any explanation of a medical term or condition.",
        "If asked something outside available data or knowledge, say so plainly rather than guessing.",
        "Keep answers concise, calm, and non-alarming; suggest contacting a doctor for anything urgent.",
        "",
        "Appointment booking: the prompt tells you today's date and the patient's username — use them.",
        "To book, first call get_available_slots to find a real free doctor_name/date/time combination "
        "(never guess one), then call book_doctor_appointment with that exact date (YYYY-MM-DD) and "
        "time (HH:MM, 24-hour). Convert relative phrases like 'tomorrow' or '2pm' into that exact format "
        "yourself using today's date from the prompt — the tools only accept exact values.",
        "If book_doctor_appointment returns success: false, tell the patient the real reason (e.g. slot "
        "already taken) and suggest calling get_available_slots again for other options — do not claim "
        "success if the tool didn't report it.",
        "If asked what appointments they already have, use list_my_appointments.",
    ],
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

def _run_ai_analysis(vitals_data: dict, vitals_json: str, patient_id: str, report_image_base64: str | None,
                      lstm_raw: dict, ews: dict, fingerprints: list[dict]) -> dict:
    """The full LLM-driven multi-agent pipeline. Raises on any agent/API failure —
    callers should catch and fall back to services.fallback_engine.rule_based_analysis()."""
    # 2. Monitoring Agent — objective read of the vitals + LSTM output.
    # Grounding data is computed deterministically in Python (not via LLM
    # tool-calling — see the NOTE on debate_coordinator below for why).
    vital_deviation = monitoring_tools.calculate_vital_deviation(vitals_json)
    monitoring_prompt = (
        f"Patient ID: {patient_id}. New patient vitals: {vitals_json}. "
        f"LSTM Anomaly Detection Results: {json.dumps(lstm_raw)}. "
        f"Deviation from patient baseline: {vital_deviation}. "
        "Report your findings."
    )
    monitoring_text = monitoring_agent.run(monitoring_prompt).content

    # 3. Diagnosis Agent — interprets the Monitoring Agent's findings,
    # grounded with deterministically-computed fingerprint/history/KB data.
    patient_history = diagnosis_tools.get_patient_history(patient_id, limit=5)
    historical_patterns = []
    for past in json.loads(patient_history).get("previous_analyses", []):
        historical_patterns.extend(past.get("patterns", []))
    symptom_comparison = diagnosis_tools.compare_symptom_patterns(
        json.dumps(lstm_raw.get("patterns", [])), json.dumps(historical_patterns)
    )
    kb_query = fingerprints[0]["disease"] if fingerprints else (lstm_raw.get("patterns") or ["general health"])[0]
    kb_results = diagnosis_tools.search_medical_knowledge(kb_query)
    diagnosis_prompt = (
        f"Patient ID: {patient_id}. Monitoring Agent's report: {monitoring_text}. "
        f"Detected patterns: {json.dumps(lstm_raw.get('patterns', []))}. "
        f"Matched disease fingerprints: {json.dumps(fingerprints)}. "
        f"Patient history: {patient_history}. "
        f"New-vs-recurring pattern comparison: {symptom_comparison}. "
        f"Knowledge base entries: {kb_results}. "
        "Interpret these findings and form a differential diagnosis."
    )
    diagnosis_text = diagnosis_agent.run(diagnosis_prompt).content

    # 4. Debate Coordinator — reconciles both into a consensus + disagreement score
    debate_prompt = (
        f"Monitoring Agent's full output:\n{monitoring_text}\n\n"
        f"Diagnosis Agent's full output:\n{diagnosis_text}\n\n"
        "Reconcile these into a final consensus and disagreement score."
    )
    debate_response = debate_coordinator.run(debate_prompt)
    debate_data = debate_response.content

    # Deterministic disagreement cross-check (grounds/validates the LLM score)
    disagreement_check = json.loads(
        debate_tools.calculate_disagreement_score(debate_data.monitoring_view, debate_data.diagnosis_view)
    )

    # 3-6. Explanation / Action / Emergency / Comparison agents are all
    # independent of each other — each depends only on debate_data (already
    # computed above), not on one another's output. Run them concurrently
    # instead of sequentially: this is the single biggest lever on wall-clock
    # latency, since each is a several-second LLM round-trip and previously
    # ran one after another (4 agents x ~5-10s each vs. ~1x that in parallel).
    guideline_condition = fingerprints[0]["disease"] if fingerprints else "general"
    simplified_term = explanation_tools.simplify_medical_term(guideline_condition)
    explanation_prompt = (
        f"Diagnosis consensus: {debate_data.consensus}. "
        f"EWS level: {ews['level']}. "
        f"Plain-language term hint: {simplified_term}. "
        "Generate UI label and voice summary."
    )

    guideline_steps = action_tools.retrieve_clinical_guideline(guideline_condition)
    constraints = action_tools.check_patient_constraints(patient_id, guideline_steps)
    action_plan_scaffold = action_tools.generate_action_plan(guideline_steps, constraints, ews["level"])
    action_prompt = (
        f"Diagnosis: {debate_data.consensus}. "
        f"EWS level: {ews['level']}. "
        f"Grounded action-plan scaffold: {action_plan_scaffold}. "
        "Provide action steps."
    )

    threshold_check = json.loads(emergency_tools.check_emergency_thresholds(vitals_json))
    emergency_prompt = (
        f"EWS level: {ews['level']}. "
        f"Consensus: {debate_data.consensus}. "
        f"Hard threshold breach check: {threshold_check}. "
        "Should we dispatch an emergency alert?"
    )

    report_analyzed = False
    report_text_extract = ""
    lab_correlation = None
    if report_image_base64 and len(report_image_base64) > 10:
        report_text_extract = vision_tools.extract_report_image(report_image_base64)
        if "[Image Analysis Failed" not in report_text_extract:
            report_analyzed = True

    if report_text_extract and report_analyzed:
        raw_labs = vision_tools.extract_lab_values(report_text_extract)
        normalized_labs = vision_tools.normalize_lab_units(raw_labs)
        comparisons = vision_tools.compare_with_vitals(normalized_labs, vitals_json)
        lab_correlation = json.loads(vision_tools.calculate_correlation_score(comparisons))
        comparison_prompt = (
            f"AI Diagnosis Consensus based on sensors: {debate_data.consensus}.\n\n"
            f"EXTRACTED RAW DATA FROM PHYSICAL MEDICAL REPORT IMAGE:\n---\n{report_text_extract}\n---\n\n"
            f"Structured lab-vs-vitals comparison: {comparisons}\n"
            f"Computed correlation_score from structured comparison: {lab_correlation['correlation_score']}\n\n"
            f"Provide comparison insights based strictly on the text and data found in the report image above. "
            f"Use the computed correlation_score above unless you have strong reason to differ."
        )
    else:
        comparison_prompt = f"Diagnosis: {debate_data.consensus}. Provide theoretical comparison insights as if analyzing a standard report for this condition."

    with ThreadPoolExecutor(max_workers=4) as pool:
        explanation_future = pool.submit(explanation_agent.run, explanation_prompt)
        action_future = pool.submit(action_agent.run, action_prompt)
        emergency_future = pool.submit(emergency_agent.run, emergency_prompt)
        comparison_future = pool.submit(comparison_agent.run, comparison_prompt)

        explanation_data = explanation_future.result().content
        action_data = action_future.result().content
        emergency_data = emergency_future.result().content
        comparison_data = comparison_future.result().content

    # Hard threshold breaches always force escalation regardless of LLM judgement.
    if threshold_check["hard_emergency"]:
        emergency_data.dispatch_alert = True

    return {
        "ews": ews,
        "lstm_result": lstm_raw,
        "fingerprints": fingerprints,
        "debate": debate_data.model_dump(),
        "disagreement_check": disagreement_check,
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
        "lab_correlation": lab_correlation,
    }


def run_full_pipeline(
    vitals_data: dict,
    report_image_base64: str | None = None,
    patient_id: str = data_store.DEFAULT_PATIENT_ID,
    use_ai: bool = True,
) -> dict:
    """
    Orchestrates the multi-agent debate and supporting analysis.

    If use_ai is False, or the AI pipeline raises (Mistral unreachable,
    rate-limited, no API key configured, etc.), falls back to a fully
    deterministic, non-LLM analysis built from the same rule-based tools
    (see services/fallback_engine.py) — the response shape is identical
    either way, tagged with result["mode"] so the frontend can show which
    path produced it.
    """
    vitals_json = json.dumps(vitals_data)
    data_store.record_vitals(patient_id, vitals_data)

    # LSTM/EWS/fingerprint matching are already rule-based — always run once.
    lstm_raw = json.loads(lstm_predict(vitals_json))
    ews = compute_ews(lstm_raw["anomaly_score"])
    fingerprints = match_fingerprints(lstm_raw.get("patterns", []))

    result = None
    if use_ai:
        try:
            result = _run_ai_analysis(vitals_data, vitals_json, patient_id, report_image_base64, lstm_raw, ews, fingerprints)
            result["mode"] = "ai"
        except Exception as exc:
            logger.warning("AI agent pipeline failed (%s) — falling back to rule-based analysis.", exc)
            result = None

    if result is None:
        result = fallback_engine.rule_based_analysis(vitals_data, patient_id, lstm_raw, ews, fingerprints)

    # ── Persist emergency event + record analysis (both paths) ─────────────────
    emergency_event = emergency_tools.create_emergency_event(
        patient_id, ews["level"], result["consensus"], vitals_json, result["emergency"]["dispatch_alert"]
    )
    result["emergency_event"] = json.loads(emergency_event) if isinstance(emergency_event, str) else emergency_event

    data_store.record_analysis(patient_id, {
        "consensus": result["consensus"],
        "ews_level": ews["level"],
        "patterns": lstm_raw.get("patterns", []),
        "actions": result["actions"],
    })

    return result


def run_chat_pipeline(patient_id: str, message: str, use_ai: bool = True, username: str = "") -> dict:
    """
    Orchestrates the NLP/Chatbot Agent to answer a natural-language question
    grounded in the patient's actual data, including booking real appointments.
    Falls back to a rule-based answer (services/fallback_engine.py) if use_ai
    is False or the agent call fails.
    """
    if use_ai:
        try:
            today = datetime.date.today()
            chat_prompt = (
                f"Patient ID: {patient_id}. Username: {username or patient_id}. "
                f"Today's date is {today.isoformat()} ({today.strftime('%A')}). "
                f"Question: {message}"
            )
            chat_response = chatbot_agent.run(chat_prompt)
            result = chat_response.content.model_dump()
            result["mode"] = "ai"
            return result
        except Exception as exc:
            logger.warning("Chatbot agent failed (%s) — falling back to rule-based answer.", exc)

    return fallback_engine.rule_based_chat_answer(patient_id, message)
