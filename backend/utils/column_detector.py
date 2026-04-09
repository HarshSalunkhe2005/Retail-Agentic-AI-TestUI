"""Strict column detection for each model's required fields."""

from __future__ import annotations

import re
from typing import NamedTuple

# ── helpers ────────────────────────────────────────────────────────────────────

def _norm(name: str) -> str:
    """Lowercase and remove all non-alphanumeric characters."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _match(col: str, patterns: list[str], excludes: list[str] | None = None) -> bool:
    """Return True if the normalised column matches any include pattern but no exclude pattern."""
    nc = _norm(col)
    # Reject the column if it matches any exclude pattern
    if excludes and any(e in nc for e in excludes):
        return False
    return any(nc.startswith(p) or p in nc for p in patterns)


# ── per-model detection ────────────────────────────────────────────────────────

class DetectionResult(NamedTuple):
    matched: bool
    mapped: dict[str, str]   # logical_name -> actual_col
    missing: list[str]        # logical names not found


def detect_pricing(columns: list[str]) -> DetectionResult:
    """Detect columns for pricing model.

    Requires a current price column and a competitor price column.
    Patterns are strict to avoid matching monetary/churn-related fields.
    """
    required = {
        "current_price":    ["currentprice", "price", "sellingprice", "unitprice"],
        "competitor_price": ["competitorprice", "competitiveprice", "marketprice"],
    }
    optional = {
        "product_name": ["productname", "productdesc", "name", "title", "item"],
        "rating":       ["rating"],
        "rating_count": ["ratingcount", "ratingvol", "reviewcount", "numratings"],
        "category":     ["category", "cat", "productcat"],
    }
    return _detect(columns, required, optional)


def detect_churn(columns: list[str]) -> DetectionResult:
    """Detect columns for churn/RFM model.

    Requires RecencyDays, FrequencyMonths, and MonetaryValue columns.
    Patterns are distinct to avoid overlap with demand or basket fields.
    """
    required = {
        "RecencyDays":     ["recency", "daysincelast", "lastpurchase", "inactivedays"],
        "FrequencyMonths": ["frequency", "orders", "purchasecount", "ordercount"],
        "MonetaryValue":   ["monetary", "ltvalue", "totalspend", "clv"],
    }
    optional = {
        "CustomerID": ["customerid", "custid", "customer", "userid", "clientid"],
    }
    return _detect(columns, required, optional)


def detect_demand(columns: list[str]) -> DetectionResult:
    """Detect columns for demand forecasting model.

    Requires a date/time column and a sales/quantity column.
    Monetary-related column names (monetary, ltvalue, lifetime, spend, balance, total)
    are excluded from the Sales match to prevent false positives with churn datasets.
    """
    # Patterns that should NOT be matched as the sales column (overlap with churn/RFM)
    _sales_excludes = ["monetary", "ltvalue", "lifetime", "spend", "balance", "total"]

    required = {
        "Date":  ["date", "time", "timestamp", "period", "week", "month", "year"],
        "Sales": ["sales", "revenue", "quantity", "qty", "units", "amount", "income"],
    }
    excludes = {
        "Sales": _sales_excludes,
    }
    return _detect(columns, required, {}, excludes)


def detect_basket(columns: list[str]) -> DetectionResult:
    """Detect columns for market-basket analysis model.

    Requires a transaction/invoice identifier and a product name/SKU column.
    """
    required = {
        "Invoice":     ["invoice", "orderid", "transactionid", "orderno"],
        "ProductName": ["product", "sku", "stockcode", "item"],
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
    excludes: dict[str, list[str]] | None = None,
) -> DetectionResult:
    mapped: dict[str, str] = {}
    missing: list[str] = []
    excludes = excludes or {}

    for logical, patterns in {**required, **optional}.items():
        col_excludes = excludes.get(logical)
        found = next((c for c in columns if _match(c, patterns, col_excludes)), None)
        if found:
            mapped[logical] = found
        elif logical in required:
            missing.append(logical)

    matched = len(missing) == 0
    return DetectionResult(matched=matched, mapped=mapped, missing=missing)
