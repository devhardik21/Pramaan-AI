"""
RAG ingest module — indexes regulatory source documents into ChromaDB.
Preserves source metadata (title, page, section references).
"""
import os
import logging
import hashlib
from pathlib import Path

logger = logging.getLogger("processor.rag.ingest")

VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "./vector_store")
CHUNK_SIZE = 800  # characters
CHUNK_OVERLAP = 100


def ingest(source_id: str, file_path: str) -> int:
    """
    Ingest a regulatory PDF into the vector store.
    Returns the number of chunks indexed.
    """
    from pypdf import PdfReader
    import chromadb
    from chromadb.config import Settings

    client = chromadb.PersistentClient(path=VECTOR_STORE_DIR)
    collection = client.get_or_create_collection(
        name="regulatory_docs",
        metadata={"hnsw:space": "cosine"},
    )

    # Extract text from PDF
    try:
        reader = PdfReader(file_path)
        chunks = []
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if not text.strip():
                continue
            page_chunks = _chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
            for i, chunk in enumerate(page_chunks):
                chunks.append({
                    "text": chunk,
                    "source_id": source_id,
                    "page": page_num + 1,
                    "chunk_index": i,
                })
    except Exception as e:
        logger.error(f"Failed to read PDF for ingestion: {e}")
        raise

    if not chunks:
        logger.warning(f"No text extracted from {file_path}")
        return 0

    # Embed and store
    embeddings = _embed([c["text"] for c in chunks])

    ids = [f"{source_id}_p{c['page']}_c{c['chunk_index']}" for c in chunks]
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[{"source_id": c["source_id"], "page": c["page"]} for c in chunks],
    )

    logger.info(f"Ingested {len(chunks)} chunks for source {source_id}")
    return len(chunks)


def _chunk_text(text: str, size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunks.append(text[start:end])
        start += size - overlap
    return chunks


def _embed(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using sentence-transformers."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.tolist()
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise
