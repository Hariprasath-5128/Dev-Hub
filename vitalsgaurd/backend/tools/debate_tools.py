"""
Debate Coordinator tools — VitalsGuard AI
------------------------------------------
compare_agent_outputs, detect_contradictions, calculate_disagreement_score,
request_reanalysis
"""

from __future__ import annotations
import json
import re

_SEVERITY_WORDS = {
    "critical": 3, "severe": 3, "high risk": 3, "high": 2,
    "moderate": 1.5, "warning": 1.5,
    "low risk": 0.5, "low": 0.5, "normal": 0, "stable": 0, "insufficient data": 0,
}

_NORMAL_MARKERS = ["normal range", "no anomaly", "within normal", "insufficient data"]
_ABNORMAL_MARKERS = ["risk", "arrhythmia", "hypoxia", "tachycardia", "critical", "abnormal"]


def compare_agent_outputs(monitoring_text: str, diagnosis_text: str) -> str:
    """
    Structurally compare the Monitoring Agent's objective report against the
    Diagnosis Agent's clinical interpretation.
    Args:
        monitoring_text: The Monitoring Agent's raw output text.
        diagnosis_text: The Diagnosis Agent's interpretation text.
    """
    m_lower = monitoring_text.lower()
    d_lower = diagnosis_text.lower()

    monitoring_flags_normal = any(marker in m_lower for marker in _NORMAL_MARKERS)
    diagnosis_flags_abnormal = any(marker in d_lower for marker in _ABNORMAL_MARKERS)

    return json.dumps({
        "monitoring_reports_normal": monitoring_flags_normal,
        "diagnosis_reports_abnormal": diagnosis_flags_abnormal,
        "aligned": monitoring_flags_normal != diagnosis_flags_abnormal or (not monitoring_flags_normal and not diagnosis_flags_abnormal),
    })


def detect_contradictions(monitoring_text: str, diagnosis_text: str) -> str:
    """
    Detect direct contradictions between the Monitoring and Diagnosis agents
    (e.g. monitoring reports normal vitals while diagnosis flags high risk).
    Args:
        monitoring_text: The Monitoring Agent's raw output text.
        diagnosis_text: The Diagnosis Agent's interpretation text.
    """
    m_lower = monitoring_text.lower()
    d_lower = diagnosis_text.lower()

    contradictions = []
    if any(marker in m_lower for marker in _NORMAL_MARKERS) and any(marker in d_lower for marker in _ABNORMAL_MARKERS):
        contradictions.append("Monitoring reports normal vitals but Diagnosis flags an abnormal/high-risk condition.")
    if "critical" in m_lower and "stable" in d_lower:
        contradictions.append("Monitoring implies critical severity but Diagnosis concludes stable/low risk.")

    return json.dumps({"contradictions": contradictions, "has_contradiction": len(contradictions) > 0})


def calculate_disagreement_score(monitoring_text: str, diagnosis_text: str) -> str:
    """
    Compute a heuristic 0-10 disagreement score between the two agents, based
    on severity language and detected contradictions. Intended to validate
    (not replace) the LLM-produced disagreement score.
    Args:
        monitoring_text: The Monitoring Agent's raw output text.
        diagnosis_text: The Diagnosis Agent's interpretation text.
    """
    m_lower = monitoring_text.lower()
    d_lower = diagnosis_text.lower()

    def severity_level(text: str) -> float:
        for phrase, weight in sorted(_SEVERITY_WORDS.items(), key=lambda x: -len(x[0])):
            if phrase in text:
                return weight
        return 0.0

    m_level = severity_level(m_lower)
    d_level = severity_level(d_lower)
    gap = abs(m_level - d_level)

    contradictions = json.loads(detect_contradictions(monitoring_text, diagnosis_text))
    score = min(10, round(gap * 2 + (4 if contradictions["has_contradiction"] else 0)))

    return json.dumps({
        "disagreement_score": score,
        "monitoring_severity": m_level,
        "diagnosis_severity": d_level,
        "has_contradiction": contradictions["has_contradiction"],
    })


def request_reanalysis(agent_name: str, reason: str, context_json: str) -> str:
    """
    Request that a specialist agent (Monitoring or Diagnosis) re-run its
    analysis with additional clarification context, when a contradiction or
    high disagreement score is detected.
    Args:
        agent_name: Which agent to re-invoke: 'monitoring' or 'diagnosis'.
        reason: Why re-analysis is being requested.
        context_json: JSON string with the original input data to re-analyze.
    """
    # Actual re-invocation is performed by the Debate Coordinator pipeline
    # (agents/vitals_agents.py), which has direct references to the agent
    # objects. This tool packages the request so the coordinator LLM can
    # decide when to trigger it.
    return json.dumps({
        "reanalysis_requested": True,
        "agent": agent_name,
        "reason": reason,
        "context": json.loads(context_json) if context_json else {},
    })
