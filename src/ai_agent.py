"""
ClearCart — AI Agent  (6-Stage Grounded Pipeline)
==================================================
Uses google-genai (the current supported Gemini SDK).

Separation of concerns:
  • Gemini handles ONLY: intent classification + response formatting.
  • ALL numerical values come from the deterministic data layer (database.py).
  • Refusal / escalation decisions are code-level, never model-level.
"""
from __future__ import annotations

import json
import os
import re
import textwrap
import traceback
from dataclasses import dataclass, asdict
from typing import Any, Literal

from src import database as db
from src import embeddings as emb

# ─── Gemini client ────────────────────────────────────────────────────────────

_GEMINI_MODEL = "gemini-2.0-flash"
_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _call_gemini(prompt: str, *, temperature: float = 0.2) -> str:
    """Call Gemini and return the text. Raises on API errors."""
    from google.genai import types
    client = _get_client()
    response = client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=1024,
        ),
    )
    return response.text.strip()


# ─── Response schema ─────────────────────────────────────────────────────────

StatusT = Literal["ok", "refused", "clarification_needed", "missing_data", "error"]


@dataclass
class ChatResponse:
    answer: str
    status: StatusT
    figures: dict[str, Any]
    intent: str | None = None
    clarification: str | None = None


# ─── Intent constants ────────────────────────────────────────────────────────

SUPPORTED_INTENTS = {
    "critical_stock",
    "product_sales",
    "top_sellers",
    "dead_stock",
    "sales_spikes",
    "reorder_priority",
    "inventory_snapshot",
}
OUT_OF_SCOPE_INTENT = "out_of_scope"
AMBIGUOUS_INTENT    = "ambiguous"


# ─── Stage 2: Classify ───────────────────────────────────────────────────────

_CLASSIFY_PROMPT = textwrap.dedent("""
You are an intent classifier for a retail inventory assistant.
Classify the manager question into exactly one intent and respond with ONLY
a JSON object — no markdown fences, no explanation.

Supported intents:
  critical_stock     — items low in stock / running out / needs reorder
  product_sales      — sales figures for a specific named product
  top_sellers        — which products sell the most
  dead_stock         — items with no or very slow sales
  sales_spikes       — products with unusual sales increases
  reorder_priority   — what to order next / priority reorder list
  inventory_snapshot — general stock overview / full inventory list
  out_of_scope       — not about sales, inventory or products
  ambiguous          — cannot determine intent; need clarification

JSON schema (return exactly this shape):
{{
  "intent": "<intent>",
  "product_name": "<name if mentioned, else null>",
  "period_days": <integer, default 30>,
  "clarification_question": "<question if ambiguous, else null>"
}}

Manager question: {question}
""")


def _classify(question: str) -> dict:
    prompt = _CLASSIFY_PROMPT.format(question=question)
    try:
        raw = _call_gemini(prompt, temperature=0.0)
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
        return json.loads(raw.strip())
    except Exception as e:
        print(f"[AGENT] classify error: {e}")
        return {
            "intent": "ambiguous",
            "product_name": None,
            "period_days": 30,
            "clarification_question": "Could you rephrase your question?",
        }


# ─── Stage 3: Retrieve ───────────────────────────────────────────────────────

def _resolve_product(product_name: str) -> tuple[str | None, str | None]:
    """FAISS semantic search → SQL LIKE fallback. Returns (pid, canonical_name)."""
    candidates = emb.search_products(product_name, k=1)
    if candidates and candidates[0]["score"] > 0.5:
        return candidates[0]["product_id"], candidates[0]["name"]
    df = db.search_products_by_name(product_name)
    if not df.empty:
        return df.iloc[0]["product_id"], df.iloc[0]["name"]
    return None, None


def _retrieve(intent: str, product_name: str | None, period_days: int) -> dict:
    if intent == OUT_OF_SCOPE_INTENT:
        raise ValueError("out_of_scope")

    if intent == "critical_stock":
        return {"data": db.get_critical_stock(),
                "context": "Products below reorder threshold (sorted by urgency)"}

    if intent == "inventory_snapshot":
        return {"data": db.get_inventory_snapshot(),
                "context": "Full inventory snapshot"}

    if intent == "top_sellers":
        return {"data": db.get_top_sellers(days=period_days, limit=5),
                "context": f"Top sellers by units — last {period_days} days"}

    if intent == "dead_stock":
        return {"data": db.get_dead_stock(days=period_days),
                "context": f"Products with no sales in last {period_days} days"}

    if intent == "sales_spikes":
        return {"data": db.get_sales_spikes(days=period_days),
                "context": "Products with unusual sales acceleration (last 7 days vs baseline)"}

    if intent == "product_sales":
        if not product_name:
            raise ValueError("ambiguous_product")
        pid, canonical = _resolve_product(product_name)
        if pid is None:
            raise ValueError(f"product_not_found:{product_name}")
        return {
            "data":         db.get_sales_summary(pid, days=period_days),
            "daily":        db.get_product_sales(pid, days=period_days),
            "context":      f"Sales data for {canonical} — last {period_days} days",
            "product_id":   pid,
            "product_name": canonical,
        }

    if intent == "reorder_priority":
        return {
            "data":    db.get_critical_stock(),
            "spikes":  db.get_sales_spikes(days=period_days),
            "context": "Reorder priority: critical stock + velocity spikes",
        }

    raise ValueError(f"unhandled_intent:{intent}")


# ─── Stage 5: Explain ────────────────────────────────────────────────────────

_EXPLAIN_PROMPT = textwrap.dedent("""
You are ClearCart, a retail inventory copilot. Answer the manager's question
using ONLY the data provided. Do not invent, estimate, or extrapolate numbers.

Rules:
- Cite exact figures from the data.
- Be concise — this is a busy store manager.
- Use plain language, no markdown headers.
- If data shows no relevant records, say so explicitly.

Manager question: {question}

Data context: {context}

Exact database results:
{data_text}

Answer:
""")


def _explain(question: str, context: str, data_text: str) -> str:
    prompt = _EXPLAIN_PROMPT.format(
        question=question, context=context, data_text=data_text
    )
    return _call_gemini(prompt, temperature=0.3)


def _df_to_text(df, max_rows: int = 15) -> str:
    if df is None or (hasattr(df, "empty") and df.empty):
        return "(no records)"
    if isinstance(df, dict):
        return "\n".join(f"  {k}: {v}" for k, v in df.items() if v is not None)
    lines = []
    for _, row in df.head(max_rows).iterrows():
        lines.append("  • " + ", ".join(f"{c}={row[c]}" for c in df.columns))
    if len(df) > max_rows:
        lines.append(f"  … and {len(df) - max_rows} more rows.")
    return "\n".join(lines)


def _extract_figures(result: dict) -> dict:
    figures = {}
    data = result.get("data")
    if isinstance(data, dict):
        for k in ("total_units", "total_revenue", "avg_daily_units", "transactions"):
            if k in data and data[k] is not None:
                figures[k.replace("_", " ").title()] = data[k]
    elif hasattr(data, "shape") and not data.empty:
        figures["Records Returned"] = len(data)
    return figures


# ─── Main entry point ────────────────────────────────────────────────────────

def process_question(question: str) -> ChatResponse:
    """Full 6-stage pipeline. Always returns ChatResponse — never raises."""
    question = question.strip()
    if not question:
        return ChatResponse(
            answer="Please ask a question about your store's inventory or sales.",
            status="clarification_needed",
            figures={},
        )

    try:
        # Stage 2: Classify
        clf       = _classify(question)
        intent    = clf.get("intent", "ambiguous")
        prod_name = clf.get("product_name")
        period    = int(clf.get("period_days") or 30)
        clarq     = clf.get("clarification_question")

        # Stage 6a: Ambiguous
        if intent == AMBIGUOUS_INTENT:
            return ChatResponse(
                answer=clarq or "Could you be more specific so I can pull the right data?",
                status="clarification_needed",
                figures={},
                intent=intent,
                clarification=clarq,
            )

        # Stage 6b: Out of scope
        if intent == OUT_OF_SCOPE_INTENT:
            return ChatResponse(
                answer=(
                    "That question is outside my supported scope. I can only answer "
                    "questions about your store's inventory levels, product stock, and "
                    "sales data. I won't guess on topics I have no data for."
                ),
                status="refused",
                figures={},
                intent=intent,
            )

        # Stage 3: Retrieve
        try:
            result = _retrieve(intent, prod_name, period)
        except ValueError as ve:
            msg = str(ve)
            if msg == "out_of_scope":
                return ChatResponse(
                    answer="I can only answer questions about inventory and sales.",
                    status="refused", figures={}, intent=intent)
            if msg == "ambiguous_product":
                return ChatResponse(
                    answer="Which product are you asking about? Please include the product name.",
                    status="clarification_needed", figures={}, intent=intent)
            if msg.startswith("product_not_found:"):
                name = msg.split(":", 1)[1]
                return ChatResponse(
                    answer=f"I couldn't find '{name}' in the product catalog. Please check the name.",
                    status="missing_data", figures={}, intent=intent)
            raise

        # Stage 4: Validate
        data = result.get("data")
        empty = (
            data is None
            or (isinstance(data, dict) and not data)
            or (hasattr(data, "empty") and data.empty)
        )
        if empty:
            context = result.get("context", "")
            if "sales" in context.lower() or intent == "product_sales":
                return ChatResponse(
                    answer=(
                        f"No sales data is available for that "
                        f"{'product' if prod_name else 'query'} in the last {period} days. "
                        "I won't fabricate a trend from missing records."
                    ),
                    status="missing_data", figures={}, intent=intent)
            return ChatResponse(
                answer="No matching records were found. I won't invent figures.",
                status="missing_data", figures={}, intent=intent)

        # Stage 5: Explain
        parts = [_df_to_text(data)]
        if "spikes" in result and not result["spikes"].empty:
            parts.append("Velocity spikes:\n" + _df_to_text(result["spikes"]))
        if "daily" in result and not result["daily"].empty:
            parts.append("Recent daily sales:\n" + _df_to_text(result["daily"].tail(7)))

        answer  = _explain(question, result.get("context", ""), "\n\n".join(parts))
        figures = _extract_figures(result)

        return ChatResponse(answer=answer, status="ok", figures=figures, intent=intent)

    except RuntimeError as e:
        return ChatResponse(
            answer=f"ClearCart AI is not configured: {e}",
            status="error", figures={})
    except Exception:
        traceback.print_exc()
        return ChatResponse(
            answer="An unexpected error occurred. Please try again.",
            status="error", figures={})
