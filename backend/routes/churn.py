"""POST /api/models/churn — Customer Churn + RFM Segmentation."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from config import (
    RECENCY_RISK_THRESHOLD,
    CHURN_SIGMOID_K,
    FREQ_RISK_DAMPEN_SCALE,
    FREQ_RISK_DAMPEN_MAX,
    UNIQUE_PROD_RATE,
    UNIQUE_PROD_CAP,
    LIFETIME_RECENCY_PAD,
    MIN_LIFETIME_DAYS,
    DEFAULT_RETURN_RATE,
    DEFAULT_RETURN_COUNT,
    DEFAULT_COUNTRY_FEATURE,
    DEFAULT_CATEGORY_FEATURE,
)
from utils.column_detector import detect_churn
from utils.data_validation import validate_csv, parse_csv
from utils.model_loader import load_pickle
from utils.response_formatter import format_churn_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_COLS = ["RecencyDays", "FrequencyMonths", "MonetaryValue"]

# Segment labels derived from KMeans cluster scores
_SEGMENT_LABELS = [
    "Dormant / Low-Yield",
    "Lapsing High-Potential",
    "Regular Contributors",
    "Core Actives",
]

SEGMENT_RECOMMENDATION = {
    "Core Actives":           "Nurture — offer loyalty perks and early access.",
    "Regular Contributors":   "Upsell — introduce premium tiers and subscriptions.",
    "Lapsing High-Potential": "Re-engage — personalised bundle discounts.",
    "Dormant / Low-Yield":    "Win-back or deprioritise — evaluate CLV vs CAC.",
}


def _build_label_map(kmeans) -> dict[int, str]:
    centers = kmeans.cluster_centers_
    # Score = monetary + frequency − recency (higher = better)
    scores = centers[:, 2] + centers[:, 1] - centers[:, 0]
    sorted_clusters = np.argsort(scores)  # ascending: worst → best
    return {int(sorted_clusters[i]): _SEGMENT_LABELS[i] for i in range(4)}


def _churn_prob(recency: float, frequency: float) -> float:
    base     = 1.0 / (1.0 + np.exp(-CHURN_SIGMOID_K * (recency - RECENCY_RISK_THRESHOLD)))
    freq_mod = 1.0 - min(frequency / FREQ_RISK_DAMPEN_SCALE, FREQ_RISK_DAMPEN_MAX)
    return float(np.clip(base * freq_mod, 0.005, 0.995))


@router.post("/models/churn")
async def run_churn(file: UploadFile = File(...)):
    content = await validate_csv(file)
    df = parse_csv(content)

    detection = detect_churn(df.columns.tolist())
    if not detection.matched:
        return JSONResponse(
            status_code=422,
            content=error_response(
                "churn",
                f"Missing required columns: {', '.join(detection.missing)}",
                required_columns=REQUIRED_COLS,
            ),
        )

    mapped = detection.mapped

    # ── Load models ────────────────────────────────────────────────────────────
    try:
        kmeans      = load_pickle("kmeans")
        rfm_scaler  = load_pickle("rfm_scaler")
        churn_model = load_pickle("churn_model")
    except Exception as exc:
        logger.error("Churn model load error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=error_response("churn", "Failed to load churn model files."),
        )

    label_map = _build_label_map(kmeans)

    # ── Prepare RFM columns ───────────────────────────────────────────────────
    r_col = mapped["RecencyDays"]
    f_col = mapped["FrequencyMonths"]
    m_col = mapped["MonetaryValue"]
    id_col = mapped.get("CustomerID")

    df["_R"] = pd.to_numeric(df[r_col], errors="coerce")
    df["_F"] = pd.to_numeric(df[f_col], errors="coerce")
    df["_M"] = pd.to_numeric(df[m_col], errors="coerce")
    df = df.dropna(subset=["_R", "_F", "_M"])

    if df.empty:
        return JSONResponse(
            status_code=422,
            content=error_response("churn", "No valid rows after parsing RFM columns."),
        )

    rfm_raw  = df[["_R", "_F", "_M"]].values.astype(float)
    rfm_log  = np.log1p(rfm_raw)
    rfm_scaled = rfm_scaler.transform(rfm_log)
    cluster_ids = kmeans.predict(rfm_scaled).astype(int)

    # Build features for XGBoost churn model (12 features matching training)
    def _build_features(r, f, m):
        return [
            r, f, m,
            float(min(max(int(f * UNIQUE_PROD_RATE), 1), UNIQUE_PROD_CAP)),  # UniqueProducts
            float(m / max(f, 1)),                                             # AvgOrderValue
            float(f * 2),                                                     # TotalItems
            float(min(365.0 / max(f, 1), 365.0)),                            # AvgDaysBetweenOrders
            float(max(r + LIFETIME_RECENCY_PAD, MIN_LIFETIME_DAYS)),         # CustomerLifetimeDays
            DEFAULT_RETURN_RATE,
            DEFAULT_RETURN_COUNT,
            DEFAULT_COUNTRY_FEATURE,
            DEFAULT_CATEGORY_FEATURE,
        ]

    features_matrix = np.array([
        _build_features(row["_R"], row["_F"], row["_M"])
        for _, row in df.iterrows()
    ])
    model_probas = churn_model.predict_proba(features_matrix)

    records: list[dict] = []
    seg_dist: dict[str, int] = {}
    total_churn_risk = 0.0
    high_risk_count = 0

    for i, (row_tuple, cluster_id) in enumerate(zip(df.itertuples(index=False), cluster_ids)):
        r = float(row_tuple._R)
        f = float(row_tuple._F)
        m = float(row_tuple._M)

        segment     = label_map.get(int(cluster_id), "Unknown")
        churn_prob  = _churn_prob(r, f)
        churn_risk  = round(churn_prob * 100, 2)
        health_score = round((1 - churn_prob) * 100, 2)

        recommendation = SEGMENT_RECOMMENDATION.get(segment, "Monitor engagement.")

        seg_dist[segment] = seg_dist.get(segment, 0) + 1
        total_churn_risk += churn_risk
        if churn_risk > 60:
            high_risk_count += 1

        cid = (
            str(getattr(row_tuple, id_col.replace(" ", "_"), i + 1))
            if id_col else f"CUST-{i + 1:04d}"
        )

        records.append({
            "customer_id":   cid,
            "segment":       segment,
            "churn_risk":    churn_risk,
            "health_score":  health_score,
            "recommendation": recommendation,
            "recency_days":  r,
            "frequency":     f,
            "monetary":      round(m, 2),
        })

    n = len(records)
    summary = {
        "total_customers":      n,
        "segment_distribution": seg_dist,
        "avg_churn_risk":       round(total_churn_risk / n, 2) if n else 0.0,
        "high_risk_count":      high_risk_count,
    }

    return format_churn_response(records, summary)
