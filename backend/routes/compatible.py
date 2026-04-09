"""GET /api/compatible-models — detect which models can work with the uploaded CSV."""

from __future__ import annotations

import logging

from fastapi import APIRouter, UploadFile, File

from utils.column_detector import detect_pricing, detect_churn, detect_demand, detect_basket
from utils.data_validation import validate_csv, parse_csv

logger = logging.getLogger(__name__)
router = APIRouter()

DETECTORS = {
    "pricing": detect_pricing,
    "churn":   detect_churn,
    "demand":  detect_demand,
    "basket":  detect_basket,
}


@router.get("/compatible-models")
async def compatible_models(file: UploadFile = File(...)):
    content = await validate_csv(file)
    df = parse_csv(content)
    cols = df.columns.tolist()

    compatible: list[str] = []
    missing_cols: dict[str, list[str]] = {}

    for model_key, detector in DETECTORS.items():
        result = detector(cols)
        if result.matched:
            compatible.append(model_key)
        else:
            missing_cols[model_key] = result.missing

    return {
        "compatible_models": compatible,
        "missing_columns": missing_cols,
        "detected_columns": cols,
    }
