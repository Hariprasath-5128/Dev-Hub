"""
Explanation Agent tools — VitalsGuard AI
------------------------------------------
retrieve_medical_definition, simplify_medical_term, generate_patient_summary,
text_to_speech
"""

from __future__ import annotations
import base64
import io
import json
import logging

from services.knowledge_base import (
    retrieve_medical_definition as _retrieve_definition,
    simplify_medical_term as _simplify_term,
)

logger = logging.getLogger("vitalsguard.explanation_tools")


def retrieve_medical_definition(term: str) -> str:
    """
    Return the clinical definition of a medical term or condition.
    Args:
        term: The medical term or condition name (e.g. 'hypoxia').
    """
    return _retrieve_definition(term)


def simplify_medical_term(term: str) -> str:
    """
    Return a plain-language, non-alarming explanation of a medical term
    suitable for a patient-facing summary.
    Args:
        term: The medical term or condition name.
    """
    return _simplify_term(term)


def generate_patient_summary(diagnosis: str, ews_level: str, actions_json: str) -> str:
    """
    Compose a structured patient-facing summary template combining the
    diagnosis, urgency level, and recommended actions. The Explanation Agent
    LLM refines tone/wording on top of this scaffold.
    Args:
        diagnosis: The diagnosis consensus text.
        ews_level: 'stable', 'warning', or 'critical'.
        actions_json: JSON list of recommended action strings.
    """
    actions = json.loads(actions_json) if actions_json else []
    tone = {
        "stable": "Your vitals look good overall.",
        "warning": "We noticed something worth keeping an eye on.",
        "critical": "This needs prompt attention.",
    }.get(ews_level, "Here's the latest on your vitals.")

    summary = f"{tone} {diagnosis}"
    if actions:
        summary += " Recommended next steps: " + "; ".join(actions) + "."

    return json.dumps({"summary_draft": summary, "ews_level": ews_level})


def text_to_speech(text: str) -> str:
    """
    Convert a short patient-facing summary into speech audio.
    Args:
        text: The text to synthesize.
    Returns:
        JSON string with 'available' (bool) and, if available, 'audio_base64'
        (base64-encoded MP3) and 'mime_type'. Gracefully degrades to
        {"available": false} if no TTS engine is installed/reachable —
        the frontend should fall back to browser-native speech synthesis.
    """
    try:
        from gtts import gTTS  # type: ignore
    except ImportError:
        return json.dumps({"available": False, "reason": "gTTS not installed"})

    try:
        buf = io.BytesIO()
        gTTS(text=text, lang="en").write_to_fp(buf)
        audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return json.dumps({"available": True, "audio_base64": audio_b64, "mime_type": "audio/mpeg"})
    except Exception as exc:
        logger.warning("text_to_speech failed: %s", exc)
        return json.dumps({"available": False, "reason": str(exc)})
