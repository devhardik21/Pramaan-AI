"""
Structured field extractor for Pramaan AI processor.
Uses regex patterns for deterministic extraction.
Returns fields with confidence scores.
"""
import re
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger("processor.extractor")

OCR_CONFIDENCE_THRESHOLD = 60

# Date patterns
DATE_PATTERNS = [
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
    r"\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b",
    r"\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b",
]

FIELD_PATTERNS = {
    "institution_name": [
        r"(?:institution|college|university|institute)\s*(?:name|:)\s*([A-Z][^\n]{3,80})",
        r"(?:name of\s+(?:institution|college|university))\s*:?\s*([A-Z][^\n]{3,80})",
    ],
    "aicte_id": [
        r"AICTE\s*(?:ID|Code|Number|Approval\s*No\.?)\s*:?\s*([A-Z0-9/-]{5,30})",
        r"(?:Approval|Registration)\s*(?:No|Number)\.?\s*:?\s*([A-Z0-9/-]{5,30})",
    ],
    "certificate_number": [
        r"(?:Certificate|Cert|Registration)\s*(?:No|Number|#)\.?\s*:?\s*([A-Z0-9/-]{4,30})",
        r"Ref(?:erence)?\s*(?:No|Number)\.?\s*:?\s*([A-Z0-9/-]{4,30})",
    ],
    "issue_date": DATE_PATTERNS,
    "expiry_date": [
        r"(?:expir[ye]|valid(?:ity)?\s*(?:up)?)\s*(?:to|till|until|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(?:expir[ye]|valid(?:ity)?\s*(?:up)?)\s*(?:to|till|until|:)?\s*(\d{1,2}\s+\w+\s+\d{4})",
    ],
    "issuing_authority": [
        r"(?:issued\s+by|issuing\s+authority|authority)\s*:?\s*([A-Z][^\n]{3,80})",
    ],
    "programme": [
        r"(?:programme|program|course)\s*:?\s*([A-Z][^\n]{3,60})",
    ],
    "intake": [
        r"(?:intake|sanctioned\s+intake|approved\s+intake)\s*:?\s*(\d{1,4})",
    ],
    "land_area_acres": [
        r"(?:total\s+)?(?:land\s+area|area\s+of\s+land|extent\s+of\s+land|land\s+measuring)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:acres?|acre)",
        r"(\d+(?:\.\d+)?)\s*(?:acres?|acre)\s+(?:of\s+land|land)",
        r"(?:land\s+area|area)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:hec|hectares?)",
    ],
    "survey_number": [
        r"(?:survey\s*(?:no|number|\#)|sy\.?\s*no\.?|khasra\s*(?:no|number|\#)|gat\s*(?:no|number|\#))\s*:?\s*([A-Z0-9/,\s-]{2,40})",
        r"(?:plot\s*(?:no|number|\#))\s*:?\s*([A-Z0-9/,\s-]{2,30})",
    ],
    "built_up_area_sqm": [
        r"(?:built(?:-|\s*)up\s+area|carpet\s+area|total\s+covered\s+area|floor\s+area)\s*:?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\.?\s*m(?:trs?)?|sqm|sq\s*meters?|square\s+met(?:ers?|res?))",
        r"(?:built(?:-|\s*)up\s+area|carpet\s+area|floor\s+area)\s*:?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square\s+feet)",
    ],
    "society_trust_name": [
        r"(?:society|trust|management|foundation|running\s+society)\s*(?:name|:)\s*([A-Z][^\n]{3,80})",
        r"(?:managed\s+by|established\s+by|under\s+the\s+aegis\s+of)\s*:?\s*([A-Z][^\n]{3,80})",
    ],
    "faculty_count": [
        r"(?:total\s+faculty|teaching\s+staff|faculty\s+members?|number\s+of\s+faculty)\s*:?\s*(\d{1,4})",
        r"(?:faculty|staff)\s+strength\s*:?\s*(\d{1,4})",
    ],
}


def extract_fields(text: str, doc_type: str, method: str) -> list[dict]:
    """
    Extract structured fields from text.
    Returns a list of field dicts with status and confidence.
    """
    if not text or not text.strip():
        logger.warning("Empty text — no fields to extract")
        return []

    results = []
    text_clean = " ".join(text.split())  # Normalize whitespace

    for field_name, patterns in FIELD_PATTERNS.items():
        value = None
        confidence = 0.0

        for pattern in patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                # OCR results get lower baseline confidence
                confidence = 0.9 if method == "pdf_text" else 0.65
                break

        if value:
            status = (
                "extraction_uncertain"
                if confidence * 100 < OCR_CONFIDENCE_THRESHOLD
                else "extracted"
            )
            results.append(
                {
                    "fieldName": field_name,
                    "extractedValue": value,
                    "confidence": round(confidence, 2),
                    "extractionMethod": method,
                    "status": status,
                }
            )
        else:
            # Do NOT invent a value — record as missing
            results.append(
                {
                    "fieldName": field_name,
                    "extractedValue": None,
                    "confidence": 0.0,
                    "extractionMethod": method,
                    "status": "missing",
                }
            )

    logger.info(f"Extracted {len([r for r in results if r['extractedValue']])} fields for doc_type={doc_type}")
    return results
