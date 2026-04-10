"""POST /api/models/inventory — Inventory Reorder & PO Recommendations.

Receives structured outputs from the 4 upstream models (churn, demand, basket,
pricing) and generates Purchase Order recommendations with ML-style risk
scoring, priority assignment, and summary KPIs.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────
ORDERING_COST = 50.0          # £ per purchase order
HOLDING_RATE = 0.25           # 25 % of unit price per year
LEAD_TIME_WEEKS = 4           # typical supplier lead time
WEEKS_PER_YEAR = 52
TOTAL_BUDGET = 2_000_000.0    # £ planning budget

PRIORITY_THRESHOLDS = {
    "Critical": 0.75,
    "High": 0.50,
    "Medium": 0.25,
    # Below 0.25 → Low
}

# Service-level Z-scores (ABC class)
Z_SCORES = {"A": 2.326, "B": 1.645, "C": 1.282}


# ── Request schema ─────────────────────────────────────────────────────────────

class InventoryRequest(BaseModel):
    churn_data: list[dict[str, Any]] = []
    churn_summary: dict[str, Any] = {}
    demand_data: list[dict[str, Any]] = []      # [{date, forecast, actual, lower, upper}, ...]
    demand_summary: dict[str, Any] = {}
    basket_rules: list[dict[str, Any]] = []     # [{antecedent, consequent, support, confidence, lift}, ...]
    basket_summary: dict[str, Any] = {}
    pricing_data: list[dict[str, Any]] = []     # [{product_name, current_price, recommended_price, ...}, ...]
    pricing_summary: dict[str, Any] = {}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _weekly_demand_stats(demand_data: list[dict]) -> tuple[float, float]:
    """Return (mean_weekly_demand, std_weekly_demand) from time-series records."""
    forecasts = [r.get("forecast", 0) for r in demand_data if r.get("forecast") is not None]
    if not forecasts:
        return 100.0, 20.0
    mean = float(np.mean(forecasts))
    std = float(np.std(forecasts)) if len(forecasts) > 1 else mean * 0.2
    return max(mean, 1.0), max(std, 0.1)


def _churn_risk_factor(churn_summary: dict) -> float:
    """Return a 0-1 factor representing overall at-risk customer proportion."""
    total = churn_summary.get("total_customers", 1) or 1
    high_risk = churn_summary.get("high_risk_count", 0)
    return float(np.clip(high_risk / total, 0.0, 1.0))


def _bundle_lift(product_name: str, basket_rules: list[dict]) -> float:
    """Return the max basket lift involving this product (≥ 1.0)."""
    max_lift = 1.0
    for rule in basket_rules:
        antecedents = rule.get("antecedent", [])
        consequents = rule.get("consequent", [])
        if not isinstance(antecedents, list):
            antecedents = [str(antecedents)]
        if not isinstance(consequents, list):
            consequents = [str(consequents)]
        all_products = antecedents + consequents
        if any(product_name.lower() in str(p).lower() for p in all_products):
            lift = float(rule.get("lift", 1.0))
            max_lift = max(max_lift, lift)
    return max_lift


def _abc_class(rank_pct: float) -> str:
    """Assign ABC class from cumulative revenue rank percentage."""
    if rank_pct <= 0.70:
        return "A"
    if rank_pct <= 0.90:
        return "B"
    return "C"


def _eoq(annual_demand: float, unit_price: float) -> float:
    """Economic Order Quantity."""
    holding_cost = unit_price * HOLDING_RATE
    if holding_cost <= 0 or annual_demand <= 0:
        return 100.0
    return math.sqrt(2 * annual_demand * ORDERING_COST / holding_cost)


def _safety_stock(weekly_std: float, z_score: float) -> float:
    """Safety stock based on demand variability and service level."""
    return z_score * weekly_std * math.sqrt(LEAD_TIME_WEEKS)


def _reorder_reason(risk_score: float, weekly_demand: float, safety_stock: float) -> str:
    if risk_score >= PRIORITY_THRESHOLDS["Critical"]:
        return "STOCKOUT_RISK"
    if risk_score >= PRIORITY_THRESHOLDS["High"]:
        return "LOW_STOCK"
    if weekly_demand > 200:
        return "HIGH_VELOCITY"
    return "SCHEDULED_REPLENISHMENT"


# ── Core logic ─────────────────────────────────────────────────────────────────

def _generate_po_recommendations(
    churn_data: list[dict],
    churn_summary: dict,
    demand_data: list[dict],
    basket_rules: list[dict],
    pricing_data: list[dict],
) -> list[dict]:
    """Generate per-SKU PO recommendations from model outputs."""

    # ── Aggregate demand stats ─────────────────────────────────────────────────
    mean_weekly, std_weekly = _weekly_demand_stats(demand_data)
    churn_factor = _churn_risk_factor(churn_summary)

    # ── Estimate category split (used if pricing data has no category) ─────────
    default_categories = ["Electronics", "Apparel", "Home", "Food", "Health"]

    # ── Build per-product records from pricing data ────────────────────────────
    # stock_code: prefer explicit "stock_code" field, fall back to "product_name", then "UNKNOWN"
    # description: prefer "product_name" field, fall back to "stock_code", then "Unknown Product"
    products = []
    for rec in pricing_data:
        stock_code = str(rec.get("stock_code") or rec.get("product_name") or "UNKNOWN")
        description = str(rec.get("product_name") or rec.get("stock_code") or "Unknown Product")
        products.append({
            "stock_code": stock_code,
            "description": description,
            "current_price": float(rec.get("current_price", 50.0)),
            "recommended_price": float(rec.get("recommended_price", rec.get("current_price", 50.0))),
            "action": str(rec.get("recommended_action", "hold")),
            "confidence": float(rec.get("confidence", 0.5)),
        })

    # ── Distribute demand across products ─────────────────────────────────────
    n = len(products)
    rng = np.random.default_rng(seed=42)
    # Demand weights: skewed so top products get more (Pareto-like)
    weights = rng.exponential(scale=1.0, size=n)
    weights = weights / weights.sum()

    # ── Build basket lift lookup ───────────────────────────────────────────────
    lift_map = {
        p["description"]: _bundle_lift(p["description"], basket_rules)
        for p in products
    }

    # ── Assign ABC class via revenue rank ─────────────────────────────────────
    revenues = [weights[i] * mean_weekly * 52 * products[i]["current_price"] for i in range(n)]
    total_revenue = sum(revenues) or 1.0
    sorted_idx = sorted(range(n), key=lambda i: revenues[i], reverse=True)
    cumulative = 0.0
    abc_map: dict[int, str] = {}
    for idx in sorted_idx:
        cumulative += revenues[idx] / total_revenue
        abc_map[idx] = _abc_class(cumulative)

    # ── Generate recommendations ───────────────────────────────────────────────
    po_list: list[dict] = []
    for i, prod in enumerate(products):
        w = float(weights[i])
        unit_price = prod["current_price"]
        category = default_categories[i % len(default_categories)]

        # Per-product weekly demand
        prod_weekly_demand = max(mean_weekly * w * n, 1.0)
        prod_weekly_std = max(std_weekly * w * n, 0.1)

        # Uplift from basket bundles
        lift = lift_map.get(prod["description"], 1.0)
        if lift > 1.2:
            prod_weekly_demand *= min(1.0 + (lift - 1.0) * 0.15, 1.50)

        annual_demand = prod_weekly_demand * WEEKS_PER_YEAR
        abc = abc_map.get(i, "C")
        z = Z_SCORES[abc]

        ss = _safety_stock(prod_weekly_std, z)
        eoq_qty = _eoq(annual_demand, unit_price)

        # Round up EOQ to sensible integer
        order_qty = max(int(math.ceil(eoq_qty)), 1)

        # Days to stockout proxy (synthetic)
        current_stock = max(rng.integers(int(ss * 0.5), int(ss * 3) + 10), 1)
        days_to_stockout = float(current_stock / (prod_weekly_demand / 7))

        # Risk score
        demand_risk = float(np.clip(prod_weekly_std / (prod_weekly_demand + 1e-9), 0, 1))
        stockout_risk = float(np.clip(1.0 - days_to_stockout / 90, 0, 1))
        risk_score = float(np.clip(
            0.4 * stockout_risk + 0.35 * demand_risk + 0.25 * churn_factor,
            0.0, 1.0,
        ))

        # Priority
        if risk_score >= PRIORITY_THRESHOLDS["Critical"]:
            priority = "Critical"
        elif risk_score >= PRIORITY_THRESHOLDS["High"]:
            priority = "High"
        elif risk_score >= PRIORITY_THRESHOLDS["Medium"]:
            priority = "Medium"
        else:
            priority = "Low"

        po_value = round(order_qty * unit_price, 2)
        reason = _reorder_reason(risk_score, prod_weekly_demand, ss)

        po_list.append({
            "stock_code": prod["stock_code"],
            "description": prod["description"],
            "category": category,
            "forecast_demand": round(prod_weekly_demand * LEAD_TIME_WEEKS, 2),
            "order_quantity": order_qty,
            "unit_price": round(unit_price, 2),
            "po_value_gbp": po_value,
            "risk_score": round(risk_score, 4),
            "priority": priority,
            "reason": reason,
            "abc_class": abc,
            "safety_stock": round(ss, 2),
            "eoq": round(eoq_qty, 2),
            "days_to_stockout": round(days_to_stockout, 1),
        })

    # Sort: Critical first, then by risk_score descending
    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    po_list.sort(key=lambda r: (priority_order.get(r["priority"], 4), -r["risk_score"]))

    return po_list


def _build_response(po_list: list[dict], demand_data: list[dict]) -> dict:
    """Build the full structured response."""

    total_skus = len(po_list)
    # Active POs: Critical + High priority
    active_pos = sum(1 for r in po_list if r["priority"] in ("Critical", "High"))
    total_po_value = round(sum(r["po_value_gbp"] for r in po_list), 2)
    avg_risk = round(sum(r["risk_score"] for r in po_list) / max(total_skus, 1), 4)
    critical_count = sum(1 for r in po_list if r["priority"] == "Critical")
    budget_utilization = round((total_po_value / TOTAL_BUDGET) * 100, 2)

    kpis = {
        "total_skus": total_skus,
        "active_pos": active_pos,
        "total_po_value": total_po_value,
        "avg_risk_score": avg_risk,
        "critical_items": critical_count,
        "budget_utilization": budget_utilization,
    }

    # Priority breakdown for chart
    priority_counts: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for r in po_list:
        priority_counts[r["priority"]] = priority_counts.get(r["priority"], 0) + 1

    # Risk distribution histogram (10 buckets 0-1)
    buckets = [0] * 10
    for r in po_list:
        bucket_idx = min(int(r["risk_score"] * 10), 9)
        buckets[bucket_idx] += 1
    risk_distribution = [
        {"range": f"{i / 10:.1f}–{(i + 1) / 10:.1f}", "count": buckets[i]}
        for i in range(10)
    ]

    # Demand forecast chart: pass through time-series data
    demand_chart = [
        {"date": r.get("date", ""), "forecast": r.get("forecast", 0), "actual": r.get("actual")}
        for r in demand_data[-26:]  # last 26 weeks
    ]

    charts = {
        "risk_distribution": risk_distribution,
        "priority_breakdown": priority_counts,
        "demand_forecast_chart": demand_chart,
    }

    # Clean table output (remove internal fields)
    table_columns = [
        "stock_code", "description", "category",
        "forecast_demand", "order_quantity", "unit_price", "po_value_gbp",
        "risk_score", "priority", "reason",
    ]
    po_table = [{col: row[col] for col in table_columns if col in row} for row in po_list]

    return {
        "model": "inventory",
        "status": "success",
        "kpis": kpis,
        "po_table": po_table,
        "charts": charts,
    }


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/models/inventory")
async def run_inventory(request: InventoryRequest):
    # Validate that ALL 4 model outputs are present before executing
    missing: list[str] = []
    if not request.demand_data:
        missing.append("demand")
    if not request.basket_rules:
        missing.append("basket")
    if not request.pricing_data:
        missing.append("pricing")
    if not request.churn_data and not request.churn_summary:
        missing.append("churn")

    if missing:
        sorted_missing = sorted(missing)
        return JSONResponse(
            status_code=422,
            content={
                "status": "error",
                "model": "inventory",
                "message": (
                    f"Missing outputs from model(s): {', '.join(sorted_missing)}. "
                    "All 4 models (Churn, Demand, Basket, Pricing) must complete "
                    "successfully before running inventory analysis."
                ),
                "missing_models": sorted_missing,
            },
        )

    try:
        po_list = _generate_po_recommendations(
            churn_data=request.churn_data,
            churn_summary=request.churn_summary,
            demand_data=request.demand_data,
            basket_rules=request.basket_rules,
            pricing_data=request.pricing_data,
        )
        return _build_response(po_list, request.demand_data)
    except Exception as exc:
        logger.error("Inventory model error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "model": "inventory", "message": "Failed to generate inventory recommendations."},
        )
