"""
Pramaan AI — Python Processing Service
Handles: OCR, field extraction, document classification, QR decoding, RAG
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

import ocr
import extractor
import classifier
from rag import retriever as rag_retriever
from rag import ingest as rag_ingest
import db_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("processor")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pramaan AI Processor starting up")
    rag_retriever.load_vector_store()
    yield
    logger.info("Pramaan AI Processor shutting down")

app = FastAPI(title="Pramaan AI Processor", version="1.0.0", lifespan=lifespan)


class ProcessRequest(BaseModel):
    documentId: str
    filePath: str
    mimeType: str
    applicationId: str


class QRRequest(BaseModel):
    documentId: str
    filePath: str


class IngestRequest(BaseModel):
    sourceId: str
    filePath: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


class AskRequest(BaseModel):
    question: str
    findingId: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pramaan-ai-processor"}


@app.post("/process")
async def process_document(req: ProcessRequest):
    """Extract text and structured fields from an uploaded document."""
    logger.info(f"Processing document {req.documentId} ({req.mimeType})")
    try:
        # 1. Extract raw text
        if req.mimeType == "application/pdf":
            text, method = ocr.extract_pdf(req.filePath)
        else:
            text, method = ocr.extract_image(req.filePath)

        # 2. Classify document type
        doc_type, doc_type_confidence = classifier.classify(text, req.mimeType)

        # 3. Extract structured fields
        fields = extractor.extract_fields(text, doc_type, method)

        # 4. Write results back to MongoDB
        await db_client.save_extracted_fields(
            document_id=req.documentId,
            application_id=req.applicationId,
            fields=fields,
            processing_status="completed",
        )
        await db_client.update_document(
            document_id=req.documentId,
            update={
                "processingStatus": "completed",
                "documentType": doc_type,
            },
        )

        logger.info(f"Document {req.documentId} processed: {len(fields)} fields, type={doc_type}")
        return {
            "documentId": req.documentId,
            "documentType": doc_type,
            "documentTypeConfidence": doc_type_confidence,
            "extractionMethod": method,
            "fieldsExtracted": len(fields),
        }
    except Exception as e:
        logger.error(f"Processing failed for {req.documentId}: {e}", exc_info=True)
        await db_client.update_document(
            document_id=req.documentId,
            update={"processingStatus": "failed", "processingError": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify/qr")
async def decode_qr(req: QRRequest):
    """Decode QR code from a document image or PDF page."""
    logger.info(f"QR decode for document {req.documentId}")
    try:
        qr_data = ocr.decode_qr(req.filePath)
        return {"documentId": req.documentId, "qrData": qr_data}
    except Exception as e:
        logger.warning(f"QR decode failed for {req.documentId}: {e}")
        return {"documentId": req.documentId, "qrData": None, "error": str(e)}


@app.post("/rag/ingest")
async def ingest_source(req: IngestRequest):
    """Ingest and index a regulatory source document."""
    logger.info(f"Ingesting source {req.sourceId}")
    try:
        chunk_count = rag_ingest.ingest(req.sourceId, req.filePath)
        return {"sourceId": req.sourceId, "chunkCount": chunk_count}
    except Exception as e:
        logger.error(f"Ingest failed for {req.sourceId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/search")
async def search_regulations(req: SearchRequest):
    """Retrieve relevant regulatory passages for a query."""
    try:
        passages = rag_retriever.search(req.query, req.limit)
        return {"passages": passages, "query": req.query, "serviceAvailable": True}
    except Exception as e:
        logger.error(f"RAG search failed: {e}", exc_info=True)
        return {"passages": [], "query": req.query, "serviceAvailable": False, "error": str(e)}


@app.post("/rag/ask")
async def ask_regulations(req: AskRequest):
    """Retrieve relevant passages and optionally generate an LLM answer."""
    try:
        passages = rag_retriever.search(req.question, limit=5)
        answer = rag_retriever.generate_answer(req.question, passages)
        return {
            "question": req.question,
            "passages": passages,
            "answer": answer,
            "serviceAvailable": True,
        }
    except Exception as e:
        logger.error(f"RAG ask failed: {e}", exc_info=True)
        return {
            "question": req.question,
            "passages": [],
            "answer": None,
            "serviceAvailable": False,
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PROCESSOR_PORT", 8001))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
