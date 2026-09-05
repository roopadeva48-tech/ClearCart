"""
ClearCart — Embeddings & FAISS Product Index
=============================================
Uses google-genai SDK (text-embedding-004 / gemini-embedding-001).

Build the index once before committing:
    python scripts/build_index.py
"""
from __future__ import annotations
import os
import json
import hashlib
import numpy as np

_faiss = None
_ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_PATH = os.path.join(_ROOT, "data", "faiss.index")
META_PATH  = os.path.join(_ROOT, "data", "faiss_meta.json")

EMBED_DIM   = 768
CANDIDATE_MODELS = [
    "text-embedding-004",
    "models/text-embedding-004",
    "gemini-embedding-001",
    "models/gemini-embedding-001",
]

_index: object | None = None
_meta:  list[dict]    = []


def _import_faiss():
    global _faiss
    if _faiss is None:
        import faiss as _f
        _faiss = _f
    return _faiss


def _hash_embed(text: str, dim: int = EMBED_DIM) -> np.ndarray:
    """Deterministic fallback embedding when API key is absent or API is unreachable."""
    rng = np.random.default_rng(int(hashlib.sha256(text.encode()).hexdigest(), 16) % (2**32))
    v = rng.standard_normal(dim).astype(np.float32)
    v /= np.linalg.norm(v)
    return v


def _gemini_embed_batch(texts: list[str]) -> np.ndarray:
    """Embed a batch of texts using the google-genai SDK with fallback across model aliases."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in ("your_key_here", "your_gemini_api_key_here"):
        raise ValueError("No valid GEMINI_API_KEY provided")

    client = genai.Client(api_key=api_key)
    vecs = []
    last_err = None

    for model_name in CANDIDATE_MODELS:
        try:
            vecs = []
            for text in texts:
                result = client.models.embed_content(
                    model=model_name,
                    contents=text,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
                )
                vecs.append(result.embeddings[0].values)
            break  # Success
        except Exception as e:
            last_err = e
            vecs = []
            continue

    if not vecs:
        raise last_err or RuntimeError("Could not generate embeddings with candidate models")

    arr = np.array(vecs, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    arr /= np.maximum(norms, 1e-9)
    return arr


def _gemini_embed_query(text: str) -> np.ndarray:
    """Embed a single query string."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or api_key in ("your_key_here", "your_gemini_api_key_here"):
        return _hash_embed(text).reshape(1, -1)

    try:
        client = genai.Client(api_key=api_key)
        for model_name in CANDIDATE_MODELS:
            try:
                result = client.models.embed_content(
                    model=model_name,
                    contents=text,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
                )
                v = np.array(result.embeddings[0].values, dtype=np.float32)
                v /= max(np.linalg.norm(v), 1e-9)
                return v.reshape(1, -1)
            except Exception:
                continue
        return _hash_embed(text).reshape(1, -1)
    except Exception:
        return _hash_embed(text).reshape(1, -1)


# ─── Public API ──────────────────────────────────────────────────────────────

def build_index(products_df) -> None:
    """Build + save FAISS index. Called by scripts/build_index.py."""
    faiss = _import_faiss()
    texts = [
        f"{row['name']} {row['category']} {row.get('description', '')}"
        for _, row in products_df.iterrows()
    ]
    meta = [
        {"product_id": row["product_id"], "name": row["name"], "category": row["category"]}
        for _, row in products_df.iterrows()
    ]

    vecs = None
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key and api_key not in ("your_key_here", "your_gemini_api_key_here"):
        print("[EMBED] Attempting Gemini embeddings …")
        try:
            vecs = _gemini_embed_batch(texts)
            print("[EMBED] Successfully generated embeddings using Gemini API.")
        except Exception as e:
            print(f"[EMBED] Notice: Gemini embedding API call failed ({e}).")
            print("[EMBED] Falling back to deterministic hash embeddings.")
            vecs = None
    else:
        print("[EMBED] No valid GEMINI_API_KEY provided.")

    if vecs is None:
        print("[EMBED] Using deterministic hash-based fallback embeddings.")
        vecs = np.stack([_hash_embed(t) for t in texts])

    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(vecs)
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"[EMBED] Saved index ({len(meta)} vectors) -> {INDEX_PATH}")


def load_index() -> bool:
    """Load pre-built FAISS index at startup. Returns True on success."""
    global _index, _meta
    faiss = _import_faiss()
    if not os.path.exists(INDEX_PATH) or not os.path.exists(META_PATH):
        print("[EMBED] No pre-built index — product name resolution falls back to SQL LIKE.")
        return False
    try:
        _index = faiss.read_index(INDEX_PATH)
        with open(META_PATH) as f:
            _meta = json.load(f)
        print(f"[EMBED] Loaded FAISS index ({len(_meta)} products).")
        return True
    except Exception as e:
        print(f"[EMBED] Failed to load index: {e}")
        return False


def search_products(query: str, k: int = 3) -> list[dict]:
    """Semantic product lookup. Returns [{product_id, name, category, score}]."""
    if _index is None:
        return []
    try:
        qvec = _gemini_embed_query(query)
        scores, indices = _index.search(qvec, k)
        return [
            {**_meta[idx], "score": float(score)}
            for score, idx in zip(scores[0], indices[0])
            if idx >= 0
        ]
    except Exception as e:
        print(f"[EMBED] search error: {e}")
        return []
