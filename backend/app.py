"""FastAPI main application — Retail Agentic AI backend.

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Or:
    python app.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure the backend/ directory itself is on sys.path so that absolute imports
# like `from config import ...` work whether the app is started from repo root
# or from inside backend/.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import uvicorn  # noqa: E402 (imported after sys.path fix)
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from config import API_PREFIX, CORS_ORIGINS, HOST, PORT  # noqa: E402
from routes.compatible import router as compatible_router  # noqa: E402
from routes.pricing import router as pricing_router  # noqa: E402
from routes.churn import router as churn_router  # noqa: E402
from routes.demand import router as demand_router  # noqa: E402
from routes.basket import router as basket_router  # noqa: E402
from routes.inventory import router as inventory_router  # noqa: E402

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Retail Agentic AI — Backend",
    description="FastAPI backend for Pricing, Churn, Demand and Basket ML models.",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,      # ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(compatible_router, prefix=API_PREFIX)
app.include_router(pricing_router,    prefix=API_PREFIX)
app.include_router(churn_router,      prefix=API_PREFIX)
app.include_router(demand_router,     prefix=API_PREFIX)
app.include_router(basket_router,     prefix=API_PREFIX)
app.include_router(inventory_router,  prefix=API_PREFIX)


# ── Startup event ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def _startup():
    logger.info("🚀 Retail Agentic AI backend starting up…")
    try:
        from utils.model_loader import initialize_models
        status = initialize_models()
        for key, ok in status.items():
            icon = "✅" if ok else "❌"
            logger.info("  %s  %s", icon, key)
    except Exception as exc:
        logger.warning("Model pre-loading skipped: %s", exc)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "message": "Retail Agentic AI — Backend",
        "docs":    "/docs",
        "health":  "/health",
    }


# ── Entry-point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)
