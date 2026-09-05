"""
ClearCart — Database / Deterministic Data Layer
================================================
All numerical truth comes from here. No LLM touches this module.
"""
import os
import sqlite3
import pandas as pd
from datetime import date, timedelta

# Paths
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(_ROOT, "clearcart.db")
DATA_DIR = os.path.join(_ROOT, "data")


# ─── Connection helper ───────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH, check_same_thread=False)


# ─── Initialisation ──────────────────────────────────────────────────────────

def init_db() -> None:
    """Load CSV files into SQLite (idempotent). Called once at startup."""
    con = _conn()
    for table in ("products", "inventory", "sales"):
        csv_path = os.path.join(DATA_DIR, f"{table}.csv")
        if not os.path.exists(csv_path):
            print(f"[DB] WARNING: {csv_path} not found — skipping.")
            continue
        df = pd.read_csv(csv_path)
        df.to_sql(table, con, if_exists="replace", index=False)
        print(f"[DB] Loaded {len(df):>4} rows -> '{table}'")
    con.close()


# ─── Read helpers ────────────────────────────────────────────────────────────

def _read(sql: str, params: tuple = ()) -> pd.DataFrame:
    """Execute a read-only SQL statement and return a DataFrame."""
    con = _conn()
    try:
        return pd.read_sql_query(sql, con, params=params)
    finally:
        con.close()


# ─── Public query API ─────────────────────────────────────────────────────────

def get_inventory_snapshot() -> pd.DataFrame:
    """Full joined view: product + inventory + status derived from threshold."""
    return _read(
        """
        SELECT
            p.product_id,
            p.name,
            p.category,
            p.reorder_threshold,
            i.quantity_on_hand,
            i.last_restocked,
            CASE
                WHEN i.quantity_on_hand <= p.reorder_threshold * 0.4 THEN 'critical'
                WHEN i.quantity_on_hand <= p.reorder_threshold       THEN 'low'
                ELSE 'ok'
            END AS status
        FROM products p
        JOIN inventory i ON p.product_id = i.product_id
        ORDER BY i.quantity_on_hand ASC
        """
    )


def get_critical_stock() -> pd.DataFrame:
    """Products at or below their reorder threshold (sorted by urgency)."""
    return _read(
        """
        SELECT
            p.product_id,
            p.name,
            p.category,
            p.reorder_threshold,
            i.quantity_on_hand,
            i.last_restocked,
            ROUND(CAST(i.quantity_on_hand AS REAL) / p.reorder_threshold * 100, 1) AS pct_of_threshold
        FROM products p
        JOIN inventory i ON p.product_id = i.product_id
        WHERE i.quantity_on_hand <= p.reorder_threshold
        ORDER BY pct_of_threshold ASC
        """
    )


def get_overstocked(multiplier: float = 2.0) -> pd.DataFrame:
    """Products where stock is significantly higher than reorder safety threshold."""
    return _read(
        """
        SELECT
            p.product_id,
            p.name,
            p.category,
            p.reorder_threshold,
            i.quantity_on_hand,
            ROUND(CAST(i.quantity_on_hand AS REAL) / p.reorder_threshold, 1) AS ratio_to_threshold
        FROM products p
        JOIN inventory i ON p.product_id = i.product_id
        WHERE i.quantity_on_hand >= p.reorder_threshold * ?
        ORDER BY i.quantity_on_hand DESC
        """,
        (multiplier,),
    )


def get_product_sales(product_id: str, days: int = 30) -> pd.DataFrame:
    """Daily sales for a specific product over the last N days."""
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    return _read(
        """
        SELECT
            s.date,
            s.quantity_sold,
            s.unit_price,
            ROUND(s.quantity_sold * s.unit_price, 2) AS revenue
        FROM sales s
        WHERE s.product_id = ?
          AND s.date >= ?
        ORDER BY s.date
        """,
        (product_id, cutoff),
    )


def get_sales_summary(product_id: str, days: int = 30) -> dict:
    """Aggregated sales stats for a product over the last N days."""
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    df = _read(
        """
        SELECT
            COUNT(*)                                    AS transactions,
            COALESCE(SUM(quantity_sold), 0)             AS total_units,
            COALESCE(ROUND(AVG(quantity_sold), 2), 0)   AS avg_daily_units,
            COALESCE(ROUND(SUM(quantity_sold * unit_price), 2), 0) AS total_revenue,
            MIN(date)                                   AS first_sale,
            MAX(date)                                   AS last_sale
        FROM sales
        WHERE product_id = ?
          AND date >= ?
        """,
        (product_id, cutoff),
    )
    if df.empty or df["transactions"].iloc[0] == 0:
        return {}
    return df.iloc[0].to_dict()


def get_top_sellers(days: int = 30, limit: int = 5) -> pd.DataFrame:
    """Top products by units sold in the last N days."""
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    return _read(
        """
        SELECT
            p.product_id,
            p.name,
            p.category,
            SUM(s.quantity_sold)                              AS total_units,
            ROUND(SUM(s.quantity_sold * s.unit_price), 2)     AS total_revenue
        FROM sales s
        JOIN products p ON s.product_id = p.product_id
        WHERE s.date >= ?
        GROUP BY s.product_id
        ORDER BY total_units DESC
        LIMIT ?
        """,
        (cutoff, limit),
    )


def get_dead_stock(days: int = 30) -> pd.DataFrame:
    """Products in inventory with ZERO sales in the last N days."""
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    return _read(
        """
        SELECT
            p.product_id,
            p.name,
            p.category,
            i.quantity_on_hand,
            i.last_restocked
        FROM products p
        JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_id NOT IN (
            SELECT DISTINCT product_id FROM sales WHERE date >= ?
        )
        ORDER BY i.quantity_on_hand DESC
        """,
        (cutoff,),
    )


def get_sales_spikes(days: int = 30, threshold_pct: float = 25.0) -> pd.DataFrame:
    """Products where recent daily average is > threshold_pct above overall average."""
    cutoff_recent = (date.today() - timedelta(days=7)).isoformat()
    cutoff_base   = (date.today() - timedelta(days=days)).isoformat()
    return _read(
        """
        WITH base AS (
            SELECT product_id,
                   ROUND(AVG(quantity_sold), 2) AS avg_units
            FROM sales
            WHERE date >= ?
            GROUP BY product_id
        ),
        recent AS (
            SELECT product_id,
                   ROUND(AVG(quantity_sold), 2) AS recent_avg
            FROM sales
            WHERE date >= ?
            GROUP BY product_id
        )
        SELECT
            p.name,
            b.product_id,
            b.avg_units    AS baseline_avg,
            r.recent_avg   AS recent_avg,
            ROUND((r.recent_avg - b.avg_units) / b.avg_units * 100, 1) AS spike_pct
        FROM base b
        JOIN recent r  ON b.product_id = r.product_id
        JOIN products p ON b.product_id = p.product_id
        WHERE (r.recent_avg - b.avg_units) / b.avg_units * 100 > ?
        ORDER BY spike_pct DESC
        """,
        (cutoff_base, cutoff_recent, threshold_pct),
    )


def find_product_by_id(product_id: str) -> dict | None:
    """Fetch a single product row by ID."""
    df = _read(
        "SELECT * FROM products WHERE product_id = ?", (product_id,)
    )
    return df.iloc[0].to_dict() if not df.empty else None


def search_products_by_name(name_fragment: str) -> pd.DataFrame:
    """SQL LIKE search — fast fallback when embeddings aren't loaded."""
    return _read(
        "SELECT * FROM products WHERE name LIKE ?",
        (f"%{name_fragment}%",),
    )
