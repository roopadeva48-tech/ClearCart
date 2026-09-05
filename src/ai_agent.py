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
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key or api_key in ("your_key_here", "your_gemini_api_key_here"):
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set or is a placeholder."
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
    recommendation: str | None = None


# ─── Intent constants ────────────────────────────────────────────────────────

SUPPORTED_INTENTS = {
    "critical_stock",
    "overstocked",
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
  overstocked        — items with excess inventory / overstocked / surplus stock
  product_sales      — sales figures for a specific named product
  top_sellers        — which products sell the most
  dead_stock         — items with no or very slow sales / not moving
  sales_spikes       — products with unusual sales increases or spikes
  reorder_priority   — what to order next / priority reorder list
  inventory_snapshot — general stock overview / full inventory list
  out_of_scope       — not about sales, inventory or products (e.g. payroll, HR, weather)
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
        # Deterministic keyword fallback
        q = question.lower()
        if any(w in q for w in ["out of stock", "running out", "low stock", "critical"]):
            return {"intent": "critical_stock", "product_name": None, "period_days": 30, "clarification_question": None}
        if any(w in q for w in ["overstocked", "excess", "surplus", "too much stock"]):
            return {"intent": "overstocked", "product_name": None, "period_days": 30, "clarification_question": None}
        if any(w in q for w in ["reorder", "order first", "replenish"]):
            return {"intent": "reorder_priority", "product_name": None, "period_days": 30, "clarification_question": None}
        if any(w in q for w in ["dead stock", "not moving", "no sales", "zero sales"]):
            return {"intent": "dead_stock", "product_name": None, "period_days": 30, "clarification_question": None}
        if any(w in q for w in ["spike", "fast selling", "unusual"]):
            return {"intent": "sales_spikes", "product_name": None, "period_days": 30, "clarification_question": None}
        if any(w in q for w in ["payroll", "employee", "salary", "weather", "password"]):
            return {"intent": "out_of_scope", "product_name": None, "period_days": 30, "clarification_question": None}
        return {
            "intent": "ambiguous",
            "product_name": None,
            "period_days": 30,
            "clarification_question": "Could you please specify which product or metric you would like to analyze?",
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

    if intent == "overstocked":
        return {"data": db.get_overstocked(multiplier=2.0),
                "context": "Products with excess inventory exceeding safety thresholds"}

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
You are ClearCart, an expert retail inventory and sales copilot. Answer the manager's question
using ONLY the exact data provided. Never make a claim without the actual numbers behind it.

Response Requirements:
1. State the exact numbers (units on hand, thresholds, sales units, revenue, percentage deltas).
2. Highlight items requiring immediate attention today.
3. Recommend a concrete action for each issue, explaining the data and assumption behind the recommendation.
4. Keep the tone concise, authoritative, and direct for a busy store manager.
5. If data is missing or records are empty, explicitly state that rather than guessing.

Manager question: {question}

Data context: {context}

Exact database results:
{data_text}

Answer:
""")


def _explain(question: str, context: str, data_text: str) -> str:
    try:
        prompt = _EXPLAIN_PROMPT.format(
            question=question, context=context, data_text=data_text
        )
        return _call_gemini(prompt, temperature=0.2)
    except Exception as e:
        print(f"[AGENT] explain fallback due to: {e}")
        # Deterministic formatting fallback
        return f"Based on SQLite records for {context}:\n\n{data_text}\n\nRecommended Action: Review these figures to execute timely purchase orders or promotions."


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
        if "quantity_on_hand" in data.columns:
            figures["Total Units On Hand"] = int(data["quantity_on_hand"].sum())
        if "total_units" in data.columns:
            figures["Total Sales Units"] = int(data["total_units"].sum())
    return figures


# ─── Main entry point ────────────────────────────────────────────────────────

def process_question(question: str) -> ChatResponse:
    """Full 6-stage pipeline. Always returns ChatResponse — never raises."""
    question = question.strip()
    if not question:
        return ChatResponse(
            answer="Please ask a question about your store's inventory, sales trends, or reorder needs.",
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
                answer=clarq or "Could you be more specific so I can pull the exact figures from local inventory records?",
                status="clarification_needed",
                figures={},
                intent=intent,
                clarification=clarq,
            )

        # Stage 6b: Out of scope (Strict Refusal)
        if intent == OUT_OF_SCOPE_INTENT:
            return ChatResponse(
                answer=(
                    "That question is outside my supported scope. I am strictly grounded in your store's "
                    "inventory, product stock, and sales data. I won't guess or extrapolate on ungrounded topics."
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
                    answer="I can only answer questions about your local inventory and sales.",
                    status="refused", figures={}, intent=intent)
            if msg == "ambiguous_product":
                return ChatResponse(
                    answer="Which specific product are you asking about? Please provide the product name or SKU.",
                    status="clarification_needed", figures={}, intent=intent)
            if msg.startswith("product_not_found:"):
                name = msg.split(":", 1)[1]
                return ChatResponse(
                    answer=f"I couldn't find '{name}' in the local product catalog. Please check the name or SKU.",
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
                        f"No sales transactions are recorded for that "
                        f"{'product' if prod_name else 'query'} in the last {period} days. "
                        "I will not fabricate figures from missing data."
                    ),
                    status="missing_data", figures={}, intent=intent)
            return ChatResponse(
                answer="No matching records were found in the database. I won't invent figures.",
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
        # Graceful fallback when GEMINI_API_KEY is not configured
        q = question.lower()
        if "running out" in q or "low" in q or "critical" in q:
            crit = db.get_critical_stock()
            return ChatResponse(
                answer=f"Here is what is running out based on local SQLite records:\n\n{_df_to_text(crit)}\n\nRecommended Action: Generate purchase orders immediately for items at or below 40% threshold.",
                status="ok",
                figures={"Critical Items": len(crit)},
                intent="critical_stock"
            )
        if "overstocked" in q or "surplus" in q:
            over = db.get_overstocked()
            return ChatResponse(
                answer=f"Overstocked products exceeding safety thresholds:\n\n{_df_to_text(over)}\n\nRecommended Action: Consider bundle promotions or reducing upcoming purchase order quantities.",
                status="ok",
                figures={"Overstocked Items": len(over)},
                intent="overstocked"
            )
        if "dead" in q or "no sales" in q or "not moving" in q:
            dead = db.get_dead_stock(30)
            return ChatResponse(
                answer=f"Products with zero sales in the last 30 days:\n\n{_df_to_text(dead)}\n\nRecommended Action: Mark down or reposition on store shelves.",
                status="ok",
                figures={"Dead Stock Items": len(dead)},
                intent="dead_stock"
            )
        return ChatResponse(
            answer="ClearCart Copilot is ready. Please ask about inventory levels, sales trends, dead stock, or reorder priorities.",
            status="ok", figures={})
    except Exception:
        traceback.print_exc()
        return ChatResponse(
            answer="An unexpected error occurred processing your question. Please try again.",
            status="error", figures={})
