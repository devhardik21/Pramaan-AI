"""
RAG retriever — searches ChromaDB and optionally generates LLM answers.
When no LLM is configured, returns passages only.
"""
import os
import logging

logger = logging.getLogger("processor.rag.retriever")

VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "./vector_store")
_collection = None
_embed_model = None


def load_vector_store():
    """Load ChromaDB collection on startup."""
    global _collection, _embed_model
    try:
        import chromadb
        client = chromadb.PersistentClient(path=VECTOR_STORE_DIR)
        _collection = client.get_or_create_collection(
            name="regulatory_docs",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"RAG vector store loaded — {_collection.count()} chunks indexed")
    except Exception as e:
        logger.warning(f"RAG vector store unavailable: {e}")
        _collection = None

    try:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Sentence-transformer model loaded")
    except Exception as e:
        logger.warning(f"Embedding model unavailable: {e}")
        _embed_model = None


def search(query: str, limit: int = 5) -> list[dict]:
    """Retrieve top-k passages relevant to query."""
    if _collection is None or _embed_model is None:
        logger.warning("RAG not available — no passages returned")
        return []

    if _collection.count() == 0:
        return []

    embedding = _embed_model.encode([query], normalize_embeddings=True).tolist()
    results = _collection.query(
        query_embeddings=embedding,
        n_results=min(limit, _collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    passages = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        passages.append(
            {
                "text": doc,
                "sourceId": meta.get("source_id"),
                "page": meta.get("page"),
                "relevanceScore": round(1 - distance, 4),
            }
        )
    return passages


def generate_answer(question: str, passages: list[dict]) -> str | None:
    """
    Generate an LLM answer grounded in retrieved passages.
    Returns None when no LLM is configured — never fabricates.
    """
    if not passages:
        return None

    provider = os.getenv("LLM_PROVIDER", "").lower()
    context = "\n\n---\n\n".join(
        [f"[Page {p.get('page', '?')}] {p['text']}" for p in passages[:5]]
    )

    system_prompt = (
        "You are a regulatory compliance assistant for AICTE applications. "
        "Answer ONLY based on the provided passages. "
        "If the passages do not contain sufficient evidence, state that clearly. "
        "Do not invent regulatory requirements or thresholds. "
        "Cite the page number when possible."
    )

    if provider == "openai":
        return _ask_openai(system_prompt, question, context)
    elif provider == "ollama":
        return _ask_ollama(system_prompt, question, context)
    else:
        logger.info("No LLM provider configured — returning passages only")
        return None


def _ask_openai(system_prompt: str, question: str, context: str) -> str | None:
    try:
        import openai
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
            ],
            max_tokens=512,
            temperature=0.1,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI call failed: {e}")
        return None


def _ask_ollama(system_prompt: str, question: str, context: str) -> str | None:
    try:
        import httpx
        base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        model = os.getenv("OLLAMA_MODEL", "llama3")
        prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {question}"
        resp = httpx.post(
            f"{base_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json().get("response")
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return None
