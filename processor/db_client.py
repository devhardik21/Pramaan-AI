"""MongoDB client for the processor service — writes extraction results back to DB."""
import os
import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

logger = logging.getLogger("processor.db_client")

_client = None
_db = None


def _get_db():
    global _client, _db
    if _db is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/pramaanai")
        _client = AsyncIOMotorClient(mongo_uri)
        _db = _client["pramaanai"]
    return _db


async def save_extracted_fields(
    document_id: str,
    application_id: str,
    fields: list[dict],
    processing_status: str = "completed",
):
    """Upsert extracted fields into ExtractedField collection."""
    db = _get_db()
    doc_oid = ObjectId(document_id)
    app_oid = ObjectId(application_id)

    for field in fields:
        await db.extractedfields.update_one(
            {"document": doc_oid, "fieldName": field["fieldName"]},
            {
                "$set": {
                    "application": app_oid,
                    "extractedValue": field.get("extractedValue"),
                    "confidence": field.get("confidence", 0.0),
                    "extractionMethod": field.get("extractionMethod", "ocr"),
                    "status": field.get("status", "extracted"),
                    "updatedAt": datetime.utcnow(),
                },
                "$setOnInsert": {
                    "createdAt": datetime.utcnow(),
                },
            },
            upsert=True,
        )
    logger.info(f"Saved {len(fields)} fields for document {document_id}")


async def update_document(document_id: str, update: dict):
    """Update document record."""
    db = _get_db()
    doc_oid = ObjectId(document_id)
    await db.documents.update_one(
        {"_id": doc_oid},
        {"$set": {**update, "updatedAt": datetime.utcnow()}},
    )
