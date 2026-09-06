"""
ClearCart — Main FastAPI Application
=====================================
One command: python app.py
Serves backend API + pre-built React frontend on port 8000.
"""
from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Load .env if present (local dev only)
load_dotenv()

# ─── Startup / shutdown ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run initialisation tasks before the server starts accepting requests."""
    print("[START] Initialising ClearCart …")

    # 1. Database: load CSVs → SQLite
    from src.database import init_db
    init_db()

    # 2. Embeddings: load pre-built FAISS index
    from src import embeddings as emb
    emb.load_index()

    print("[START] ClearCart ready on http://localhost:8000")
    yield


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ClearCart",
    version="1.0.0",
    description="Retail Sales & Inventory Copilot — grounded AI assistant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic models ─────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    api_key: str | None = None
    user_context: dict | None = None


class TestKeyRequest(BaseModel):
    api_key: str


# ─── API Routes ──────────────────────────────────────────────────────────────

@app.post("/api/test_key")
async def test_key(req: TestKeyRequest):
    """Test and validate a user-supplied Gemini API Key."""
    key = req.api_key.strip()
    if not key:
        return {"ok": False, "error": "API key cannot be empty"}
    try:
        from src.ai_agent import _call_gemini
        res = _call_gemini("Say 'OK'", api_key=key)
        return {"ok": True, "model": "gemini-flash", "response": res}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Accept a natural-language question and return a dynamic grounded answer
    using Gemini API Key when provided, customized with user & shop context.
    """
    from src.ai_agent import process_question
    try:
        result = process_question(
            req.message,
            api_key=req.api_key,
            user_context=req.user_context,
        )
        return asdict(result)
    except Exception as e:
        return {
            "answer": "An unexpected server error occurred. Please try again.",
            "status": "error",
            "figures": {},
        }


@app.get("/api/alerts")
async def get_alerts():
    """Return proactive stock and sales alerts (pure deterministic logic)."""
    try:
        from src.alerts import compute_alerts
        alerts = compute_alerts()
        return {"alerts": [a.to_dict() for a in alerts]}
    except Exception as e:
        return {"alerts": [], "error": str(e)}


@app.get("/api/data")
async def get_data():
    """Return joined inventory + product snapshot for the frontend table."""
    try:
        from src.database import get_inventory_snapshot
        df = get_inventory_snapshot()
        return {"data": df.to_dict(orient="records")}
    except Exception as e:
        return {"data": [], "error": str(e)}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ClearCart"}


# ─── Serve React SPA ─────────────────────────────────────────────────────────

DIST = Path(__file__).parent / "frontend" / "dist"

if DIST.is_dir():
    # Mount the assets sub-folder so Vite's hashed asset paths resolve
    assets_dir = DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", response_class=FileResponse)
    async def serve_root():
        return FileResponse(str(DIST / "index.html"))

    @app.get("/{full_path:path}", response_class=FileResponse)
    async def serve_spa(full_path: str):
        """Catch-all: serve index.html for any path not matched by an API route."""
        target = DIST / full_path
        if target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(DIST / "index.html"))
else:
    @app.get("/")
    async def no_frontend():
        return JSONResponse(
            {"error": "Frontend not built. Run npm run build in frontend directory."},
            status_code=503,
        )


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
