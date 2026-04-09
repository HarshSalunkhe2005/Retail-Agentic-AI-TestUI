import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR.parent / "models"   # repo-level models/ directory

# ── Server ─────────────────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ORIGINS = ["*"]

# ── Upload ─────────────────────────────────────────────────────────────────────
UPLOAD_MAX_SIZE = 100 * 1024 * 1024  # 100 MB in bytes

# ── API ────────────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

# ── Model file names ───────────────────────────────────────────────────────────
MODEL_FILES = {
    "pricing_model":  "pricing_model.pkl",
    "pricing_scaler": "pricing_scaler.pkl",
    "churn_model":    "churn_model.pkl",
    "kmeans":         "kmeans.pkl",
    "rfm_scaler":     "rfm_scaler.pkl",
    "demand":         "forecast_prophet.pkl",
    "basket":         "model5_basket_analysis.pkl",
}

# ── Pricing ────────────────────────────────────────────────────────────────────
PRICING_LABEL_MAP = {0: "decrease", 1: "discount", 2: "hold", 3: "increase"}
PRICING_BASE_ADJ  = {
    "increase":  0.10,
    "decrease": -0.08,
    "discount": -0.15,
    "hold":      0.00,
}

# ── Churn ──────────────────────────────────────────────────────────────────────
RECENCY_RISK_THRESHOLD   = 90
CHURN_SIGMOID_K          = 0.07
FREQ_RISK_DAMPEN_SCALE   = 250.0
FREQ_RISK_DAMPEN_MAX     = 0.12
UNIQUE_PROD_RATE         = 0.7
UNIQUE_PROD_CAP          = 50
LIFETIME_RECENCY_PAD     = 90.0
MIN_LIFETIME_DAYS        = 180.0

# ── Demand ─────────────────────────────────────────────────────────────────────
DEFAULT_FORECAST_WEEKS = 12

# ── Churn feature defaults (for columns absent from uploaded CSV) ──────────────
DEFAULT_RETURN_RATE      = 0.0
DEFAULT_RETURN_COUNT     = 0.0
DEFAULT_COUNTRY_FEATURE  = 0.0
DEFAULT_CATEGORY_FEATURE = 0.0
