"""Consistent JSON response formatters for every model."""

from __future__ import annotations

from typing import Any


def _success(model: str, **kwargs) -> dict[str, Any]:
    return {"model": model, "status": "success", **kwargs}


def error_response(model: str, message: str, **kwargs) -> dict[str, Any]:
    return {"status": "error", "model": model, "message": message, **kwargs}


# ── Pricing ────────────────────────────────────────────────────────────────────

def format_pricing_response(records: list[dict], summary: dict) -> dict:
    return _success("pricing", data=records, summary=summary)


# ── Churn ──────────────────────────────────────────────────────────────────────

def format_churn_response(records: list[dict], summary: dict) -> dict:
    return _success("churn", data=records, summary=summary)


# ── Demand ─────────────────────────────────────────────────────────────────────

def format_demand_response(forecast_data: list[dict], summary: dict) -> dict:
    return _success("demand", forecast_data=forecast_data, summary=summary)


# ── Basket ─────────────────────────────────────────────────────────────────────

def format_basket_response(rules: list[dict], summary: dict) -> dict:
    return _success("basket", rules=rules, summary=summary)
