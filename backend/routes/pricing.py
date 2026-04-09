"""POST /api/models/pricing — Pricing Intelligence."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from config import PRICING_LABEL_MAP, PRICING_BASE_ADJ
from utils.column_detector import detect_pricing
from utils.data_validation import validate_csv, parse_csv
from utils.model_loader import load_pickle
from utils.response_formatter import format_pricing_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_COLS = ["current_price", "competitor_price"]


@router.post("/models/pricing")
async def run_pricing(file: UploadFile = File(...)):
    content = await validate_csv(file)
    df = parse_csv(content)

    detection = detect_pricing(df.columns.tolist())
    if not detection.matched:
        return JSONResponse(
            status_code=422,
            content=error_response(
                "pricing",
                f"Missing required columns: {', '.join(detection.missing)}",
                required_columns=REQUIRED_COLS,
            ),
        )

    mapped = detection.mapped

    # ── Load models ────────────────────────────────────────────────────────────
    try:
        model  = load_pickle("pricing_model")
        scaler = load_pickle("pricing_scaler")
    except Exception as exc:
        logger.error("Pricing model load error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=error_response("pricing", "Failed to load pricing model files."),
        )

    # ── Prepare features ───────────────────────────────────────────────────────
    current_price_col    = mapped["current_price"]
    competitor_price_col = mapped["competitor_price"]
    rating_col           = mapped.get("rating")
    rating_count_col     = mapped.get("rating_count")

    df["_current_price"]    = pd.to_numeric(df[current_price_col], errors="coerce")
    df["_competitor_price"] = pd.to_numeric(df[competitor_price_col], errors="coerce")
    df["_rating"]           = (
        pd.to_numeric(df[rating_col], errors="coerce") if rating_col else 3.5
    )
    df["_rating_count"] = (
        pd.to_numeric(df[rating_count_col], errors="coerce") if rating_count_col else 100
    )
    df["_ratio"] = df["_current_price"] / df["_competitor_price"].replace(0, np.nan)

    # Drop rows with NaN in critical cols
    df = df.dropna(subset=["_current_price", "_competitor_price", "_ratio"])

    if df.empty:
        return JSONResponse(
            status_code=422,
            content=error_response("pricing", "No valid rows after parsing numeric columns."),
        )

    X = df[["_rating", "_rating_count", "_ratio"]].fillna(
        {"_rating": 3.5, "_rating_count": 100}
    ).values
    X_scaled = scaler.transform(X)

    # ── Predict ────────────────────────────────────────────────────────────────
    action_ids = model.predict(X_scaled).astype(int)
    probas     = model.predict_proba(X_scaled)

    records: list[dict] = []
    action_counts: dict[str, int] = {"increase": 0, "decrease": 0, "discount": 0, "hold": 0}
    total_confidence = 0.0

    for i, (_, row) in enumerate(df.iterrows()):
        action_id  = int(action_ids[i])
        probs      = probas[i]
        confidence = float(probs.max())
        action     = PRICING_LABEL_MAP[action_id]

        cur  = float(row['_current_price'])
        comp = float(row['_competitor_price'])
        rat  = float(row['_rating'])

        # Business override: low rating + overpriced → force decrease
        if rat < 3.0 and (cur / comp if comp > 0 else 1.0) > 1.0:
            action = "decrease"

        if action == "hold":
            rec_price = cur
        else:
            adj       = PRICING_BASE_ADJ[action] * confidence
            rec_price = cur * (1 + adj)
            rec_price = max(rec_price, cur * 0.70)
            rec_price = min(rec_price, comp * 1.20)

        product_id = str(i + 1)
        action_counts[action] = action_counts.get(action, 0) + 1
        total_confidence += confidence

        records.append({
            "product_id":         product_id,
            "current_price":      round(cur, 2),
            "competitor_price":   round(comp, 2),
            "recommended_action": action,
            "recommended_price":  round(rec_price, 2),
            "confidence":         round(confidence, 4),
        })

    n = len(records)
    summary = {
        "total_products":  n,
        "increase_count":  action_counts.get("increase", 0),
        "decrease_count":  action_counts.get("decrease", 0),
        "discount_count":  action_counts.get("discount", 0),
        "hold_count":      action_counts.get("hold", 0),
        "avg_confidence":  round(total_confidence / n, 4) if n else 0.0,
    }

    return format_pricing_response(records, summary)
