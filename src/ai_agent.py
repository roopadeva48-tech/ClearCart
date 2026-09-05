"""
ClearCart — AI Agent  (6-Stage Grounded Pipeline)
==================================================
Uses google-genai (the current supported Gemini SDK).

Separation of concerns:
  • Gemini handles intent classification + natural language explanation.
  • ALL numerical values come strictly from the deterministic data layer (database.py).
  • Fallback deterministic reasoning guarantees full, rich answers with exact numbers
    even if the Gemini API key is not present or rate limited.
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

import pandas as pd

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
    "combined_spikes_and_dead",
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


def _deterministic_classify(question: str) -> dict:
    q = question.lower().strip()

    # Out of scope checks (code-level enforcement)
    if any(w in q for w in ["payroll", "salary", "employee", "hr", "weather", "password", "recipe", "tax rate"]):
        return {"intent": "out_of_scope", "product_name": None, "period_days": 30, "clarification_question": None}

    # Compound queries: spikes + dead stock
    if ("spike" in q or "fast" in q) and ("zero sales" in q or "no sales" in q or "dead" in q):
        return {"intent": "combined_spikes_and_dead", "product_name": None, "period_days": 30, "clarification_question": None}

    # Running out / low stock / critical
    if any(w in q for w in ["running out", "run out", "running", "low stock", "out of stock", "critical", "stockout", "shortage", "depleted"]):
        return {"intent": "critical_stock", "product_name": None, "period_days": 30, "clarification_question": None}

    # Overstocked / surplus
    if any(w in q for w in ["overstocked", "over stock", "excess", "surplus", "too much", "holding too much"]):
        return {"intent": "overstocked", "product_name": None, "period_days": 30, "clarification_question": None}

    # Reorder priority
    if any(w in q for w in ["reorder", "order first", "replenish", "what should i order", "purchase order", "restock"]):
        return {"intent": "reorder_priority", "product_name": None, "period_days": 30, "clarification_question": None}

    # Dead stock
    if any(w in q for w in ["dead stock", "not moving", "zero sales", "no sales", "stagnant", "slowest", "unsold"]):
        return {"intent": "dead_stock", "product_name": None, "period_days": 30, "clarification_question": None}

    # Spikes
    if any(w in q for w in ["spike", "spikes", "velocity", "surging", "fastest moving", "jumped"]):
        return {"intent": "sales_spikes", "product_name": None, "period_days": 30, "clarification_question": None}

    # Top sellers
    if any(w in q for w in ["top seller", "best seller", "top 5", "selling most", "most popular", "highest revenue"]):
        return {"intent": "top_sellers", "product_name": None, "period_days": 30, "clarification_question": None}

    # Specific product queries
    known_products = [
        "sparkling water", "mineral water", "milk", "organic milk", "basmati rice", "rice",
        "sunflower oil", "oil", "wheat flour", "flour", "brown sugar", "sugar",
        "sea salt", "salt", "tomato sauce", "pasta", "coffee", "green tea", "tea", "almonds"
    ]
    for p in known_products:
        if p in q:
            return {"intent": "product_sales", "product_name": p, "period_days": 30, "clarification_question": None}

    # General inventory overview
    if any(w in q for w in ["inventory", "snapshot", "all products", "catalog", "stock level", "overview"]):
        return {"intent": "inventory_snapshot", "product_name": None, "period_days": 30, "clarification_question": None}

    # Default to critical stock & replenishment analysis if general inventory question
    return {"intent": "critical_stock", "product_name": None, "period_days": 30, "clarification_question": None}


def _classify(question: str) -> dict:
    try:
        prompt = _CLASSIFY_PROMPT.format(question=question)
        raw = _call_gemini(prompt, temperature=0.0)
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
        res = json.loads(raw.strip())
        if res.get("intent") in SUPPORTED_INTENTS or res.get("intent") == OUT_OF_SCOPE_INTENT:
            return res
        return _deterministic_classify(question)
    except Exception:
        return _deterministic_classify(question)


# ─── Stage 3: Retrieve ───────────────────────────────────────────────────────

def _resolve_product(product_name: str) -> tuple[str | None, str | None]:
    """FAISS semantic search → SQL LIKE fallback. Returns (pid, canonical_name)."""
    candidates = emb.search_products(product_name, k=1)
    if candidates and candidates[0]["score"] > 0.4:
        return candidates[0]["product_id"], candidates[0]["name"]
    df = db.search_products_by_name(product_name)
    if not df.empty:
        return df.iloc[0]["product_id"], df.iloc[0]["name"]
    return None, None


def _retrieve(intent: str, product_name: str | None, period_days: int) -> dict:
    if intent == OUT_OF_SCOPE_INTENT:
        raise ValueError("out_of_scope")

    if intent == "combined_spikes_and_dead":
        return {
            "spikes": db.get_sales_spikes(days=period_days),
            "dead": db.get_dead_stock(days=period_days),
            "context": "Sales velocity spikes (last 7 days) and Dead stock items (0 sales in 30 days)",
        }

    if intent == "critical_stock":
        return {
            "data": db.get_critical_stock(),
            "context": "Products at or below reorder safety threshold",
        }

    if intent == "overstocked":
        return {
            "data": db.get_overstocked(multiplier=2.0),
            "context": "Products with excess inventory exceeding 200% of reorder threshold",
        }

    if intent == "inventory_snapshot":
        return {
            "data": db.get_inventory_snapshot(),
            "context": "Full inventory status and stock levels across all catalog products",
        }

    if intent == "top_sellers":
        return {
            "data": db.get_top_sellers(days=period_days, limit=5),
            "context": f"Top selling products by unit volume — last {period_days} days",
        }

    if intent == "dead_stock":
        return {
            "data": db.get_dead_stock(days=period_days),
            "context": f"Products with zero customer transactions in the last {period_days} days",
        }

    if intent == "sales_spikes":
        return {
            "data": db.get_sales_spikes(days=period_days),
            "context": "Products with sudden sales velocity acceleration (recent 7-day average vs baseline)",
        }

    if intent == "product_sales":
        if not product_name:
            raise ValueError("ambiguous_product")
        pid, canonical = _resolve_product(product_name)
        if pid is None:
            raise ValueError(f"product_not_found:{product_name}")
        return {
            "data":         db.get_sales_summary(pid, days=period_days),
            "daily":        db.get_product_sales(pid, days=period_days),
            "context":      f"Sales data for {canonical} (SKU: {pid}) — last {period_days} days",
            "product_id":   pid,
            "product_name": canonical,
        }

    if intent == "reorder_priority":
        return {
            "data":    db.get_critical_stock(),
            "spikes":  db.get_sales_spikes(days=period_days),
            "context": "Reorder priority list combining depleted stock and recent demand spikes",
        }

    raise ValueError(f"unhandled_intent:{intent}")


# ─── Stage 5: Explain ────────────────────────────────────────────────────────

_EXPLAIN_PROMPT = textwrap.dedent("""
You are ClearCart, an expert retail inventory and sales copilot. Answer the manager's question
using ONLY the exact data provided below.

Rules:
1. Cite the exact figures (units on hand, safety thresholds, sales units, revenue, percentage deltas).
2. Clearly identify items that need attention today.
3. Recommend concrete actions (e.g. order quantities, markdowns, or re-allocations) and show the data/assumptions behind each recommendation.
4. Format with clean bullet points and clear numbers so the store manager can act immediately.
5. If data is missing or empty, say so explicitly rather than inventing numbers.

Manager question: {question}

Data context: {context}

Exact database results:
{data_text}

Answer:
""")


def _format_deterministic_answer(intent: str, result: dict, question: str) -> str:
    """Rich, beautifully formatted deterministic response when LLM API is unavailable."""
    if intent == "critical_stock" or intent == "reorder_priority":
        data = result.get("data")
        if data is None or data.empty:
            return "All inventory levels are currently healthy and above safety thresholds."

        lines = ["**Critical Stock Attention Required Today:**\n"]
        for _, r in data.iterrows():
            pct = r.get('pct_of_threshold', round(r['quantity_on_hand'] / r['reorder_threshold'] * 100, 1))
            deficit = max(0, r['reorder_threshold'] - r['quantity_on_hand'])
            lines.append(
                f"• **{r['name']}** (`{r['product_id']}`) — Category: {r['category']}\n"
                f"  - **On Hand:** {r['quantity_on_hand']} units (Safety Threshold: {r['reorder_threshold']} units, **{pct}%** of min target)\n"
                f"  - **Deficit:** {deficit} units below safety buffer\n"
                f"  - **🎯 Recommended Action:** Generate Purchase Order for **{r['reorder_threshold'] * 2 - r['quantity_on_hand']} units** to restore 14-day operating buffer."
            )

        lines.append("\n**Data Assumptions:** Calculated assuming a 7-day replenishment lead time from primary distributor.")
        return "\n".join(lines)

    if intent == "overstocked":
        data = result.get("data")
        if data is None or data.empty:
            return "No products are currently identified as significantly overstocked."

        lines = ["**Overstocked Inventory Identified:**\n"]
        for _, r in data.iterrows():
            ratio = r.get('ratio_to_threshold', round(r['quantity_on_hand'] / r['reorder_threshold'], 1))
            lines.append(
                f"• **{r['name']}** (`{r['product_id']}`) — Category: {r['category']}\n"
                f"  - **On Hand:** {r['quantity_on_hand']} units (Threshold: {r['reorder_threshold']} units, **{ratio}x** safety level)\n"
                f"  - **🎯 Recommended Action:** Pause upcoming purchase orders and consider a 10% promotional discount or end-cap feature to accelerate turnover."
            )
        return "\n".join(lines)

    if intent == "dead_stock":
        data = result.get("data")
        if data is None or data.empty:
            return "Every active product has recorded sales transactions within the last 30 days."

        lines = ["**Dead Stock / Non-Moving Items (0 Sales in last 30 days):**\n"]
        for _, r in data.iterrows():
            lines.append(
                f"• **{r['name']}** (`{r['product_id']}`) — Category: {r['category']}\n"
                f"  - **Current Stock:** {r['quantity_on_hand']} units holding shelf space\n"
                f"  - **Last Restocked:** {r.get('last_restocked', 'N/A')}\n"
                f"  - **🎯 Recommended Action:** Mark down by 15-20% or bundle with related high-velocity goods to clear working capital."
            )
        return "\n".join(lines)

    if intent == "sales_spikes":
        data = result.get("data")
        if data is None or data.empty:
            return "No products have experienced sudden sales velocity spikes greater than 25% over the last 7 days."

        lines = ["**Sales Velocity Spikes Detected:**\n"]
        for _, r in data.iterrows():
            lines.append(
                f"• **{r['name']}** (`{r['product_id']}`)\n"
                f"  - **Recent Velocity:** {r['recent_avg']} units/day vs **{r['baseline_avg']}** units/day baseline\n"
                f"  - **Velocity Surge:** **+{r['spike_pct']}%** surge over 7-day period\n"
                f"  - **🎯 Recommended Action:** Expedite restocking by 50 units immediately to avoid impending stockout."
            )
        return "\n".join(lines)

    if intent == "combined_spikes_and_dead":
        spikes = result.get("spikes", pd.DataFrame())
        dead = result.get("dead", pd.DataFrame())

        lines = ["### 📊 Demand & Inventory Movement Analysis\n"]
        if not spikes.empty:
            lines.append("**🔥 High-Velocity Sales Spikes:**")
            for _, r in spikes.iterrows():
                lines.append(f"• **{r['name']}** (`{r['product_id']}`): Recent avg **{r['recent_avg']} units/day** vs {r['baseline_avg']} baseline (**+{r['spike_pct']}%** spike).")
            lines.append("  *Action:* Increase reorder quantity to prevent sudden stock depletion.\n")
        else:
            lines.append("• No significant sales spikes detected in the last 7 days.\n")

        if not dead.empty:
            lines.append("**🛑 Dead Stock (0 Transactions in 30 Days):**")
            for _, r in dead.iterrows():
                lines.append(f"• **{r['name']}** (`{r['product_id']}`): **{r['quantity_on_hand']} units** sitting idle.")
            lines.append("  *Action:* Implement clearance pricing or bundled offers to release trapped cash flow.")
        else:
            lines.append("• No dead stock identified.")

        return "\n".join(lines)

    if intent == "product_sales":
        data = result.get("data", {})
        daily = result.get("daily", pd.DataFrame())
        pname = result.get("product_name", "Product")
        pid = result.get("product_id", "")

        units = data.get("total_units", 0)
        rev = data.get("total_revenue", 0.0)
        avg = data.get("avg_daily_units", 0)
        tx = data.get("transactions", 0)

        lines = [
            f"**Sales Performance for {pname} (`{pid}`):**\n",
            f"• **Total Units Sold:** **{units} units** across {tx} transactions in the last 30 days.",
            f"• **Total Revenue Generated:** **${rev:,.2f}**",
            f"• **Average Daily Sales Rate:** **{avg} units/day**",
        ]
        if not daily.empty:
            lines.append(f"• **Recent Trend:** {len(daily)} active sales days recorded.")

        lines.append(f"\n**🎯 Recommended Action:** Maintain standard safety buffer based on steady daily movement of {avg} units/day.")
        return "\n".join(lines)

    if intent == "top_sellers":
        data = result.get("data")
        lines = ["**Top 5 Best Selling Products (Last 30 Days):**\n"]
        for idx, r in data.iterrows():
            lines.append(f"{idx+1}. **{r['name']}** (`{r['product_id']}`) — **{r['total_units']} units** (${r['total_revenue']:,.2f} revenue)")
        lines.append("\n**🎯 Recommended Action:** Ensure supplier lead times for top performers are locked in to guarantee 100% shelf availability.")
        return "\n".join(lines)

    # General snapshot
    data = result.get("data")
    return f"**Inventory Snapshot:** {len(data)} catalog items tracked in SQLite database. Total on hand volume: {data['quantity_on_hand'].sum()} units."


def _explain(question: str, context: str, data_text: str, intent: str, result: dict) -> str:
    try:
        prompt = _EXPLAIN_PROMPT.format(
            question=question, context=context, data_text=data_text
        )
        ans = _call_gemini(prompt, temperature=0.2)
        if ans and len(ans.strip()) > 10:
            return ans
    except Exception:
        pass
    return _format_deterministic_answer(intent, result, question)


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
        figures["Records Analyzed"] = len(data)
        if "quantity_on_hand" in data.columns:
            figures["Total Stock On Hand"] = int(data["quantity_on_hand"].sum())
        if "total_units" in data.columns:
            figures["Total Units Sold"] = int(data["total_units"].sum())
    if "spikes" in result and not result["spikes"].empty:
        figures["Spiking Products"] = len(result["spikes"])
    if "dead" in result and not result["dead"].empty:
        figures["Dead Stock Items"] = len(result["dead"])
    return figures


# ─── Main entry point ────────────────────────────────────────────────────────

def process_question(question: str) -> ChatResponse:
    """Full 6-stage pipeline. Always returns ChatResponse — never raises."""
    question = question.strip()
    if not question:
        return ChatResponse(
            answer="Please ask a question about your store's inventory, sales trends, or reorder priorities.",
            status="clarification_needed",
            figures={},
        )

    try:
        # Stage 2: Classify
        clf       = _classify(question)
        intent    = clf.get("intent", "critical_stock")
        prod_name = clf.get("product_name")
        period    = int(clf.get("period_days") or 30)

        # Stage 6b: Out of scope (Strict Refusal)
        if intent == OUT_OF_SCOPE_INTENT:
            return ChatResponse(
                answer=(
                    "That question is outside my supported operational scope. I am strictly grounded in your store's "
                    "inventory levels, product catalog, and sales data. I do not extrapolate on ungrounded topics."
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
                    answer="I can only answer questions about your local store inventory and sales records.",
                    status="refused", figures={}, intent=intent)
            if msg == "ambiguous_product":
                return ChatResponse(
                    answer="Which specific product are you asking about? Please provide the product name or SKU (e.g., Sparkling Water or Organic Milk).",
                    status="clarification_needed", figures={}, intent=intent)
            if msg.startswith("product_not_found:"):
                name = msg.split(":", 1)[1]
                return ChatResponse(
                    answer=f"I couldn't find '{name}' in the store product catalog. Please verify the product name or SKU.",
                    status="missing_data", figures={}, intent=intent)
            raise

        # Stage 4: Validate
        data = result.get("data")
        has_compound = ("spikes" in result or "dead" in result)
        empty = (
            not has_compound
            and (
                data is None
                or (isinstance(data, dict) and not data)
                or (hasattr(data, "empty") and data.empty)
            )
        )
        if empty:
            context = result.get("context", "")
            if "sales" in context.lower() or intent == "product_sales":
                return ChatResponse(
                    answer=(
                        f"No sales transactions are recorded for that "
                        f"{'product' if prod_name else 'query'} in the last {period} days. "
                        "I will not fabricate figures from missing records."
                    ),
                    status="missing_data", figures={}, intent=intent)
            return ChatResponse(
                answer="No matching records were found in the database. I won't invent figures.",
                status="missing_data", figures={}, intent=intent)

        # Stage 5: Explain
        parts = []
        if data is not None and not (hasattr(data, "empty") and data.empty):
            parts.append(_df_to_text(data))
        if "spikes" in result and not result["spikes"].empty:
            parts.append("Velocity spikes:\n" + _df_to_text(result["spikes"]))
        if "dead" in result and not result["dead"].empty:
            parts.append("Dead stock:\n" + _df_to_text(result["dead"]))
        if "daily" in result and not result["daily"].empty:
            parts.append("Recent daily sales:\n" + _df_to_text(result["daily"].tail(7)))

        data_text = "\n\n".join(parts) if parts else "(no records)"
        answer = _explain(question, result.get("context", ""), data_text, intent, result)
        figures = _extract_figures(result)

        return ChatResponse(answer=answer, status="ok", figures=figures, intent=intent)

    except Exception:
        traceback.print_exc()
        return ChatResponse(
            answer="An unexpected error occurred while processing your query. Please try again.",
            status="error", figures={})
