"""Fuzzy column detection for each model's required fields."""

from __future__ import annotations

import re
from typing import NamedTuple

# ── helpers ────────────────────────────────────────────────────────────────────

def _norm(name: str) -> str:
    """Lowercase and strip non-alphanumeric characters."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _match(col: str, patterns: list[str]) -> bool:
    """Return True if the normalised column name starts-with or contains any pattern."""
    nc = _norm(col)
    return any(nc.startswith(p) or p in nc for p in patterns)


# ── per-model detection ────────────────────────────────────────────────────────

class DetectionResult(NamedTuple):
    matched: bool
    mapped: dict[str, str]   # logical_name -> actual_col
    missing: list[str]        # logical names not found


def detect_pricing(columns: list[str]) -> DetectionResult:
    required = {
        "current_price":     ["currentprice", "price", "sellingprice", "unitprice", "saleprice"],
        "competitor_price":  ["competitorprice", "competitiveprice", "marketprice", "comprice"],
    }
    optional = {
        "rating":       ["rating"],
        "rating_count": ["ratingcount", "ratingvol", "reviewcount", "numratings"],
        "category":     ["category", "cat", "productcat"],
    }
    return _detect(columns, required, optional)


def detect_churn(columns: list[str]) -> DetectionResult:
    required = {
        "RecencyDays":     ["recency", "daysincelast", "dayssince", "lastpurchase", "inactivedays"],
        "FrequencyMonths": ["frequency", "orders", "purchasecount", "numorders", "ordercount", "freq"],
        "MonetaryValue":   ["monetary", "ltvalue", "totalspend", "revenue", "avgorder", "clv", "ltv"],
    }
    optional = {
        "CustomerID": ["customerid", "custid", "customer", "userid", "clientid"],
    }
    return _detect(columns, required, optional)


def detect_demand(columns: list[str]) -> DetectionResult:
    required = {
        "Date":  ["date", "ds", "week", "time", "period", "day", "month", "orderdate", "transactiondate"],
        "Sales": ["sales", "revenue", "quantity", "qty", "y", "amount", "value", "turnover", "income", "units"],
    }
    return _detect(columns, required, {})


def detect_basket(columns: list[str]) -> DetectionResult:
    required = {
        "Invoice":     ["invoice", "orderid", "transactionid", "orderno", "basketid", "receiptid"],
        "ProductName": ["product", "item", "sku", "stockcode", "description", "productname", "itemname"],
    }
    optional = {
        "Category": ["category", "cat", "department", "productcat"],
    }
    return _detect(columns, required, optional)


# ── shared logic ───────────────────────────────────────────────────────────────

def _detect(
    columns: list[str],
    required: dict[str, list[str]],
    optional: dict[str, list[str]],
) -> DetectionResult:
    mapped: dict[str, str] = {}
    missing: list[str] = []

    for logical, patterns in {**required, **optional}.items():
        found = next((c for c in columns if _match(c, patterns)), None)
        if found:
            mapped[logical] = found
        elif logical in required:
            missing.append(logical)

    matched = len(missing) == 0
    return DetectionResult(matched=matched, mapped=mapped, missing=missing)
