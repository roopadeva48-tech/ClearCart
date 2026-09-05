"""
ClearCart — Alert Engine
========================
Pure deterministic Pandas logic. No LLM involved.
Produces structured alerts the frontend and chat pipeline consume.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Literal
from src.database import get_critical_stock, get_dead_stock, get_sales_spikes


AlertType = Literal["stockout", "spike", "dead_stock"]


@dataclass
class Alert:
    type: AlertType
    title: str
    detail: str
    product_ids: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


def compute_alerts(
    *,
    dead_stock_days: int = 30,
    spike_threshold_pct: float = 25.0,
) -> list[Alert]:
    """
    Return a list of Alert objects derived purely from database queries.
    Runs on every GET /api/alerts call; fast enough at this data scale.
    """
    alerts: list[Alert] = []

    # ── 1. Stock-out / critical stock ─────────────────────────────────────────
    try:
        crit = get_critical_stock()
        if not crit.empty:
            ids   = crit["product_id"].tolist()
            names = crit["name"].tolist()
            pcts  = crit["pct_of_threshold"].tolist()

            # Build a readable detail line
            snippets = [
                f"{name} ({qty:.0f} / threshold {thr:.0f})"
                for name, qty, thr in zip(
                    crit["name"], crit["quantity_on_hand"], crit["reorder_threshold"]
                )
            ]
            alerts.append(Alert(
                type="stockout",
                title=f"{len(ids)} item{'s' if len(ids)!=1 else ''} below reorder threshold",
                detail="; ".join(snippets[:5]) + ("…" if len(snippets) > 5 else "."),
                product_ids=ids,
            ))
    except Exception as e:
        print(f"[ALERTS] critical_stock error: {e}")

    # ── 2. Sales spikes ───────────────────────────────────────────────────────
    try:
        spikes = get_sales_spikes(threshold_pct=spike_threshold_pct)
        if not spikes.empty:
            ids = spikes["product_id"].tolist()
            snippets = [
                f"{row['name']} (+{row['spike_pct']:.0f}% — {row['recent_avg']:.1f} vs {row['baseline_avg']:.1f} avg)"
                for _, row in spikes.iterrows()
            ]
            alerts.append(Alert(
                type="spike",
                title=f"{len(ids)} product{'s' if len(ids)!=1 else ''} showing unusual sales acceleration",
                detail="; ".join(snippets[:4]) + ("…" if len(snippets) > 4 else "."),
                product_ids=ids,
            ))
    except Exception as e:
        print(f"[ALERTS] sales_spikes error: {e}")

    # ── 3. Dead stock ─────────────────────────────────────────────────────────
    try:
        dead = get_dead_stock(days=dead_stock_days)
        if not dead.empty:
            ids   = dead["product_id"].tolist()
            names = dead["name"].tolist()
            alerts.append(Alert(
                type="dead_stock",
                title=f"{len(ids)} item{'s' if len(ids)!=1 else ''} with no sales in {dead_stock_days} days",
                detail=", ".join(names[:5]) + ("…" if len(names) > 5 else " have had zero sales recently."),
                product_ids=ids,
            ))
    except Exception as e:
        print(f"[ALERTS] dead_stock error: {e}")

    return alerts
