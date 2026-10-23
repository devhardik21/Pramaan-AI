"""
Document classifier for Pramaan AI processor.
Uses keyword rules — explainable and deterministic.
"""
import re
import logging

logger = logging.getLogger("processor.classifier")

# Keyword-based rules — ordered by specificity
CLASSIFIER_RULES = [
    ("approval_letter", ["aicte approval", "approved by aicte", "letter of approval"], 0.92),
    ("affiliation_certificate", ["affiliation", "affiliated to", "university affiliation"], 0.88),
    ("noc", ["no objection certificate", "noc", "state government noc"], 0.90),
    ("land_document", ["land", "property", "sq.ft", "sq.m", "floor area", "built-up area"], 0.80),
    ("fire_safety_certificate", ["fire", "noc", "fire department", "fire safety"], 0.85),
    ("building_completion_certificate", ["completion certificate", "occupancy certificate"], 0.88),
    ("financial_statement", ["balance sheet", "profit", "loss", "income", "expenditure", "audit"], 0.82),
    ("faculty_list", ["faculty", "professor", "lecturer", "teaching staff", "designation"], 0.78),
    ("lab_equipment_list", ["laboratory", "equipment", "instruments", "list of lab"], 0.80),
    ("programme_scheme", ["scheme", "syllabus", "curriculum", "credit", "semester"], 0.80),
    ("id_proof", ["aadhaar", "pan card", "passport", "voter id", "driving licence"], 0.88),
]

UNKNOWN_LABEL = "unknown"


def classify(text: str, mime_type: str = "application/pdf") -> tuple[str, float]:
    """
    Classify document type based on keyword matching.
    Returns (document_type, confidence).
    """
    if not text or not text.strip():
        logger.warning("Empty text — classifying as unknown")
        return UNKNOWN_LABEL, 0.0

    text_lower = text.lower()
    best_label = UNKNOWN_LABEL
    best_score = 0.0
    best_confidence = 0.0

    for label, keywords, confidence in CLASSIFIER_RULES:
        score = sum(1 for kw in keywords if kw in text_lower)
        normalized = score / len(keywords)
        if normalized > best_score:
            best_score = normalized
            best_label = label
            best_confidence = confidence * normalized

    if best_score == 0:
        logger.info("No classifier match — labelling as unknown")
        return UNKNOWN_LABEL, 0.0

    logger.info(f"Classified as '{best_label}' (score={best_score:.2f}, confidence={best_confidence:.2f})")
    return best_label, round(best_confidence, 2)
