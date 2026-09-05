TRACK_ID=PS6

# ClearCart — Retail Sales & Inventory Copilot

> A grounded AI assistant that helps retail store managers make fast, accurate decisions from local sales and inventory data — without hallucinating a single number.

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/AI-Gemini_1.5-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

---

## What it does

ClearCart is a retail copilot for store managers. It combines:

- **Natural-language Q&A** grounded in local SQLite/Pandas data — every answer cites the exact figures used
- **Proactive alerts** for stock-outs, sales spikes, and dead stock, computed deterministically before the manager even asks
- **Semantic product search** using Gemini embeddings + FAISS, so "running low on the Italian oil" resolves to the right product
- **Principled refusal** — out-of-scope questions (payroll, HR, etc.) are explicitly refused; missing-data situations are reported honestly, never fabricated

The AI layer (Gemini 1.5 Flash) handles only *intent classification* and *response formatting*. All numerical values come from SQLite/Pandas. This separation is enforced in code, not just by prompt.

---

## Authentication & Shop Registration

ClearCart features a built-in authentication page for store managers and shop owners.

### 📝 Shop Account Registration (Sign Up)
To register your store, switch to the **"Create Shop Account"** tab and provide:
1. **Name** — Store Manager / Owner Name
2. **Shop Name** — Retail store branch / store name
3. **Shop Description** — Retail specialty / inventory scope
4. **Mail ID** — Contact email address
5. **Password** — Account security password

### 🔑 Sign In
Once registered, store managers can sign in using their **User ID / Email** and **Password**.

---

### 1. Set your Gemini API key

```bash
# Windows PowerShell
$env:GEMINI_API_KEY = "your_key_here"

# Mac / Linux
export GEMINI_API_KEY="your_key_here"
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the application

```bash
python app.py
```

Open **http://localhost:8000** in your browser. The app is ready within 10 seconds.

> **One command. No second terminal. No build step.**
> The React frontend is pre-built and committed; FastAPI serves it directly.

---

## Architecture

```
python app.py  (port 8000)
│
├── GET  /              → React SPA (frontend/dist/)
├── POST /api/chat      → 6-stage grounded AI pipeline
├── GET  /api/alerts    → deterministic alert engine (pure Pandas)
└── GET  /api/data      → joined inventory + product snapshot
```

### 6-stage pipeline (`src/ai_agent.py`)

| Stage | Responsibility | Grounding rule |
|---|---|---|
| 1. Capture | Preserve raw question | Unchanged input for traceability |
| 2. Classify | Gemini identifies intent + product name | Structured JSON output only |
| 3. Retrieve | Dispatch to SQLite/Pandas via `src/database.py` | All numbers from data layer |
| 4. Validate | Check result is non-empty and usable | Missing history stays missing |
| 5. Explain | Gemini formats answer from exact rows | Must cite figures returned in Stage 3 |
| 6. Escalate | Hard-coded refusal for out-of-scope / empty | LLM not involved in this decision |

---

## Data and documents

All data is generated and lives in `data/`:

| File | Description |
|---|---|
| `data/products.csv` | 20-product catalog with names, categories, descriptions, and reorder thresholds |
| `data/inventory.csv` | Current on-hand quantities; deliberately seeded with critical-stock and dead-stock conditions |
| `data/sales.csv` | 60-day transaction log with engineered patterns: P014 Sparkling Water spike (+140% over baseline), P008 Coffee seasonal drop, P009/P012/P018 zero-sales dead stock |
| `data/faiss.index` | Pre-built FAISS flat index (gemini-embedding-001 vectors or hash fallback) |
| `data/faiss_meta.json` | Product ID → name mapping for the FAISS index |

### Rebuilding the embedding index

If you change `products.csv`, regenerate the index (requires `GEMINI_API_KEY`):

```bash
python scripts/build_index.py
```

Commit the updated `data/faiss.index` and `data/faiss_meta.json`.

---

## Demo scenarios

| Scenario | Expected behaviour |
|---|---|
| "What is running out?" | Lists critical-stock items with exact quantities and thresholds |
| "How has sparkling water sold this month?" | Returns 30-day sales summary with figures cited |
| "What should I reorder first?" | Ranked reorder list based on threshold proximity + velocity |
| "Which items have no sales?" | Dead-stock list with on-hand quantities |
| "What is our employee payroll?" | Explicit refusal — outside supported data scope |
| "Show me rice" | FAISS resolves to "Basmati Rice 5kg" and returns its sales/stock data |

---

## Demo video

📹 **[Watch the demo](#)** *(replace this link with your Devfolio video URL before submission)*

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Gemini API key — never committed to the repo |

---

## Project structure

```
ClearCart/
├── app.py                   # FastAPI entry point — python app.py starts everything
├── requirements.txt         # Python dependencies
├── README.md                # This file (TRACK_ID=PS6 on line 1)
├── data/
│   ├── products.csv         # 20-product catalog
│   ├── inventory.csv        # Current stock levels
│   ├── sales.csv            # 60-day transaction log
│   ├── faiss.index          # Pre-built embedding index (committed)
│   └── faiss_meta.json      # Index metadata
├── src/
│   ├── ai_agent.py          # 6-stage grounded pipeline
│   ├── database.py          # Deterministic SQLite/Pandas layer
│   ├── embeddings.py        # gemini-embedding-001 + FAISS
│   └── alerts.py            # Pure Pandas alert engine
├── scripts/
│   └── build_index.py       # One-off FAISS index builder
└── frontend/
    ├── dist/                # Pre-built React files (committed — served by FastAPI)
    └── src/                 # React source (components, hooks, pages)
```

---

## License

MIT
