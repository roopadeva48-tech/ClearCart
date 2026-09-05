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

# Load .env if present (local dev only — judges supply GEMINI_API_KEY via env)
load_dotenv()

# ─── Startup / shutdown ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run initialisation tasks before the server starts accepting requests."""
    print("[START] Initialising ClearCart …")

    # 1. Database: load CSVs → SQLite
    from src.database import init_db
    init_db()

    # 2. Embeddings: load pre-built FAISS index (fast — just mmap the file)
    from src import embeddings as emb
    emb.load_index()

    print("[START] ClearCart ready on http://localhost:8000")
    yield
    # Nothing to clean up


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


# ─── API Routes ──────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Accept a natural-language question and return a grounded answer.
    Never returns a 500 — all errors are surfaced in the response body.
    """
    from src.ai_agent import process_question
    try:
        result = process_question(req.message)
        return asdict(result)
    except Exception as e:
        # Safety net — should never reach here given agent's own error handling
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
    print(
        "[WARN] frontend/dist/ not found. "
        "Run: cd frontend && npm run build  then restart app.py."
    )

    @app.get("/")
    async def no_frontend():
        return JSONResponse(
            {"error": "Frontend not built. See README for build instructions."},
            status_code=503,
        )


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
