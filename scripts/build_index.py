"""
scripts/build_index.py
======================
Run this ONCE locally to build the FAISS product embedding index.
The generated files (data/faiss.index, data/faiss_meta.json) must be
committed to the repository so `python app.py` starts within 90 seconds.

Usage:
    set GEMINI_API_KEY=your_key_here     (Windows)
    export GEMINI_API_KEY=your_key_here  (Mac/Linux)
    python scripts/build_index.py
"""
import sys
import os

# Make project root importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from src.embeddings import build_index

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

if __name__ == "__main__":
    products_csv = os.path.join(DATA_DIR, "products.csv")
    if not os.path.exists(products_csv):
        print(f"ERROR: {products_csv} not found.")
        sys.exit(1)

    df = pd.read_csv(products_csv)
    print(f"Building FAISS index for {len(df)} products …")
    build_index(df)
    print("Done. Commit data/faiss.index and data/faiss_meta.json to git.")
