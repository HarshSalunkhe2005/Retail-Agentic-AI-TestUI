"""POST /api/models/demand — Demand Forecasting with Prophet."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from config import DEFAULT_FORECAST_WEEKS
from utils.column_detector import detect_demand
from utils.data_validation import validate_csv, parse_csv
from utils.model_loader import load_pickle
from utils.response_formatter import format_demand_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_COLS = ["Date", "Sales"]


@router.post("/models/demand")
async def run_demand(file: UploadFile = File(...)):
    content = await validate_csv(file)
    df = parse_csv(content)

    detection = detect_demand(df.columns.tolist())
    if not detection.matched:
        return JSONResponse(
            status_code=422,
            content=error_response(
                "demand",
                f"Missing required columns: {', '.join(detection.missing)}",
                required_columns=REQUIRED_COLS,
            ),
        )

    mapped = detection.mapped

    # ── Load model ─────────────────────────────────────────────────────────────
    try:
        prophet_model = load_pickle("demand")
    except Exception as exc:
        logger.error("Demand model load error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=error_response("demand", "Failed to load demand forecast model."),
        )

    date_col  = mapped["Date"]
    sales_col = mapped["Sales"]

    # ── Prepare time-series ────────────────────────────────────────────────────
    ts = df[[date_col, sales_col]].copy()
    ts.columns = ["ds", "y"]
    ts["ds"] = pd.to_datetime(ts["ds"], errors="coerce")
    ts["y"]  = pd.to_numeric(ts["y"], errors="coerce")
    ts = ts.dropna()

    if ts.empty:
        return JSONResponse(
            status_code=422,
            content=error_response("demand", "No valid date/sales rows found in the CSV."),
        )

    # ── Fit fresh Prophet model on uploaded data ───────────────────────────────
    try:
        from prophet import Prophet  # type: ignore

        m = Prophet(
            seasonality_mode="multiplicative",
            yearly_seasonality=True,
            weekly_seasonality=True,
        )
        # Suppress Prophet output
        import logging as _lg
        _lg.getLogger("prophet").setLevel(_lg.WARNING)
        _lg.getLogger("cmdstanpy").setLevel(_lg.WARNING)

        m.fit(ts)

        future   = m.make_future_dataframe(periods=DEFAULT_FORECAST_WEEKS, freq="W")
        forecast = m.predict(future)
        forecast["yhat"]       = np.clip(forecast["yhat"],       0, None)
        forecast["yhat_lower"] = np.clip(forecast["yhat_lower"], 0, None)
        forecast["yhat_upper"] = np.clip(forecast["yhat_upper"], 0, None)

    except Exception as exc:
        logger.warning("Fresh Prophet fit failed (%s); falling back to pre-trained model.", exc)
        # Fallback: use the pre-trained model for inference only
        m        = prophet_model
        future   = m.make_future_dataframe(periods=DEFAULT_FORECAST_WEEKS, freq="W")
        forecast = m.predict(future)
        forecast["yhat"]       = np.clip(forecast["yhat"],       0, None)
        forecast["yhat_lower"] = np.clip(forecast["yhat_lower"], 0, None)
        forecast["yhat_upper"] = np.clip(forecast["yhat_upper"], 0, None)

    # ── Build actual-vs-forecast data ──────────────────────────────────────────
    hist_map = dict(zip(ts["ds"].dt.strftime("%Y-%m-%d"), ts["y"]))

    forecast_data: list[dict] = []
    for _, row in forecast.tail(DEFAULT_FORECAST_WEEKS + len(ts)).iterrows():
        date_str = row["ds"].strftime("%Y-%m-%d")
        actual   = hist_map.get(date_str)
        forecast_data.append({
            "date":     date_str,
            "forecast": round(float(row["yhat"]), 2),
            "lower":    round(float(row["yhat_lower"]), 2),
            "upper":    round(float(row["yhat_upper"]), 2),
            "actual":   round(float(actual), 2) if actual is not None else None,
        })

    # Keep only the tail (historical + future forecast)
    forecast_data = forecast_data[-(len(ts) + DEFAULT_FORECAST_WEEKS):]

    # ── Summary ────────────────────────────────────────────────────────────────
    future_forecasts = [r["forecast"] for r in forecast_data if r["actual"] is None]
    trend = "stable"
    if len(future_forecasts) >= 2:
        delta = future_forecasts[-1] - future_forecasts[0]
        if delta > future_forecasts[0] * 0.05:
            trend = "upward"
        elif delta < -future_forecasts[0] * 0.05:
            trend = "downward"

    summary = {
        "training_periods":  len(ts),
        "forecast_periods":  DEFAULT_FORECAST_WEEKS,
        "trend":             trend,
        "seasonality":       "multiplicative",
    }

    return format_demand_response(forecast_data, summary)
