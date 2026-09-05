"""
Basic smoke-tests for the ClearCart data layer.
Run with: pytest tests/
"""
import os
import pytest
import pandas as pd

# Allow imports from project root
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.database import init_db, run_query

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def test_csv_files_exist():
    for name in ("products", "inventory", "sales"):
        path = os.path.join(DATA_DIR, f"{name}.csv")
        assert os.path.exists(path), f"Missing: {path}"


def test_init_db_loads_tables(tmp_path, monkeypatch):
    import src.database as db_module
    monkeypatch.setattr(db_module, "DB_PATH", str(tmp_path / "test.db"))
    init_db()
    df = run_query("SELECT COUNT(*) AS n FROM products")
    assert df["n"].iloc[0] > 0


def test_inventory_has_critical_stock(tmp_path, monkeypatch):
    import src.database as db_module
    monkeypatch.setattr(db_module, "DB_PATH", str(tmp_path / "test.db"))
    init_db()
    df = run_query(
        """
        SELECT i.product_id, i.quantity_on_hand, p.reorder_threshold
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.quantity_on_hand <= p.reorder_threshold
        """
    )
    assert len(df) > 0, "Expected at least one product below reorder threshold"
