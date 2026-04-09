"""POST /api/models/inventory — Inventory Reorder Analysis (Model 6).

Receives a sales/retail CSV and optional basket rules JSON string from Model 5.
Derives per-SKU demand and inventory metrics, runs ABC classification,
EOQ-based reorder point calculation, ML risk scoring (GBR), and
budget-constrained purchase order selection.

Inputs  : uploaded CSV  (sales/retail data)
          basket_rules  (JSON string, optional — from Model 5)
          budget_limit  (float, optional — max total PO spend, default £500,000)
Outputs : purchase_orders, inventory_analysis, summary, chart_data
"""

from __future__ import annotations

import json
import logging
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Form, UploadFile, File
from fastapi.responses import JSONResponse

from utils.data_validation import validate_csv, parse_csv
from utils.response_formatter import error_response

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Config ─────────────────────────────────────────────────────────────────────
CONFIG: dict[str, Any] = {
    "abc_A_pct": 70,
    "abc_B_pct": 90,
    "service_z": {"A": 2.326, "B": 1.645, "C": 1.282},
    "adi_threshold": 1.32,
    "cv2_threshold": 0.49,
    "ordering_cost": 50.0,
    "holding_cost_rate": 0.25,
    "bundle_lift_threshold": 1.2,
    "bundle_uplift_rate": 0.15,
    "bundle_max_factor": 1.50,
    "priority_high_pct": 90,
    "priority_medium_pct": 70,
    "cold_start_days": 14,
    "budget_default": 500_000.0,
    "lead_time_default": 14,
}


# ── Column detection ────────────────────────────────────────────────────────────

def _detect_columns(df: pd.DataFrame) -> dict[str, str | None]:
    """Best-effort mapping of logical column names to actual DataFrame columns."""
    cols_lower = {c.lower().replace(" ", "").replace("_", ""): c for c in df.columns}

    def _find(*patterns: str) -> str | None:
        for pat in patterns:
            if pat in cols_lower:
                return cols_lower[pat]
        for pat in patterns:
            for k, v in cols_lower.items():
                if pat in k:
                    return v
        return None

    return {
        "date":         _find("date", "time", "period", "week", "month"),
        "product":      _find("productname", "product", "stockcode", "sku", "item", "description"),
        "category":     _find("category", "cat", "department"),
        "sales":        _find("sales", "revenue", "quantity", "qty", "units", "amount"),
        "price":        _find("currentprice", "price", "unitprice", "sellingprice"),
        "customer":     _find("customerid", "customer", "custid"),
        "invoice":      _find("invoice", "orderid", "transaction"),
        "stock":        _find("stockonhand", "stock", "onhand", "inventory", "currentstock"),
        "lead_time":    _find("leadtime", "lead", "supplierleadtime"),
    }


# ── Demand type classification (Syntetos-Boylan) ────────────────────────────────

def _classify_demand(weekly_sales: pd.Series) -> str:
    """Classify demand as Smooth, Intermittent, or Erratic using ADI/CV² logic."""
    non_zero = weekly_sales[weekly_sales > 0]
    if len(non_zero) < 2:
        return "Intermittent"
    total_weeks = max(len(weekly_sales), 1)
    adi = total_weeks / len(non_zero)
    cv2 = (non_zero.std() / max(non_zero.mean(), 1e-9)) ** 2
    if adi < CONFIG["adi_threshold"] and cv2 < CONFIG["cv2_threshold"]:
        return "Smooth"
    elif adi >= CONFIG["adi_threshold"] and cv2 >= CONFIG["cv2_threshold"]:
        return "Erratic"
    else:
        return "Intermittent"


# ── EOQ ────────────────────────────────────────────────────────────────────────

def _eoq(annual_demand: float, unit_price: float) -> int:
    """Economic Order Quantity formula."""
    if annual_demand <= 0 or unit_price <= 0:
        return 1
    h = unit_price * CONFIG["holding_cost_rate"]
    eoq = np.sqrt(2 * annual_demand * CONFIG["ordering_cost"] / max(h, 0.01))
    return max(int(round(eoq)), 1)


# ── ABC classification ──────────────────────────────────────────────────────────

def _assign_abc(df: pd.DataFrame, revenue_col: str) -> pd.Series:
    rev_sorted = df[revenue_col].sort_values(ascending=False)
    cumulative = rev_sorted.cumsum() / max(rev_sorted.sum(), 1e-9) * 100
    abc = pd.Series("C", index=df.index)
    abc[cumulative[cumulative <= CONFIG["abc_A_pct"]].index] = "A"
    between = cumulative[(cumulative > CONFIG["abc_A_pct"]) & (cumulative <= CONFIG["abc_B_pct"])].index
    abc[between] = "B"
    return abc


# ── Route ───────────────────────────────────────────────────────────────────────

@router.post("/models/inventory")
async def run_inventory(
    file: UploadFile = File(...),
    basket_rules: str = Form(default="[]"),
    budget_limit: float = Form(default=CONFIG["budget_default"]),
):
    # ── Parse CSV ──────────────────────────────────────────────────────────────
    content = await validate_csv(file)
    df = parse_csv(content)

    if df.empty:
        return JSONResponse(
            status_code=422,
            content=error_response("inventory", "Uploaded CSV is empty."),
        )

    col = _detect_columns(df)

    if col["product"] is None:
        return JSONResponse(
            status_code=422,
            content=error_response(
                "inventory",
                "Could not find a product/SKU column. "
                "Expected columns like ProductName, StockCode, SKU, or Item.",
            ),
        )

    # ── Parse basket rules ─────────────────────────────────────────────────────
    try:
        rules_list: list[dict] = json.loads(basket_rules) if basket_rules.strip() else []
    except Exception:
        rules_list = []

    # Build SKU → max lift lookup from basket rules
    sku_lift: dict[str, float] = {}
    for rule in rules_list:
        antecedents = rule.get("antecedent", [])
        consequents = rule.get("consequent", [])
        lift = float(rule.get("lift", 1.0))
        for item in antecedents + consequents:
            sku_lift[str(item)] = max(sku_lift.get(str(item), 1.0), lift)

    # ── Numeric coercion ───────────────────────────────────────────────────────
    product_col   = col["product"]
    sales_col     = col["sales"]
    price_col     = col["price"]
    category_col  = col["category"]
    date_col      = col["date"]
    stock_col     = col["stock"]
    lead_col      = col["lead_time"]
    customer_col  = col["customer"]

    # Sales numeric
    if sales_col:
        df["_sales"] = pd.to_numeric(df[sales_col], errors="coerce").fillna(0).clip(lower=0)
    else:
        df["_sales"] = 1.0

    # Price numeric
    if price_col:
        df["_price"] = pd.to_numeric(df[price_col], errors="coerce").fillna(0).clip(lower=0)
    else:
        df["_price"] = 0.0

    # ── Aggregate to SKU level ─────────────────────────────────────────────────
    agg_dict: dict[str, Any] = {"_sales": "sum"}
    if price_col:
        agg_dict["_price"] = "mean"
    if category_col:
        agg_dict[category_col] = "first"

    sku_df = df.groupby(product_col).agg(agg_dict).reset_index()
    sku_df.columns = [
        c if c != product_col else "StockCode"
        for c in sku_df.columns
    ]

    # Rename aggregated columns
    sku_df = sku_df.rename(columns={
        "_sales": "TotalSales",
        "_price": "UnitPrice",
        category_col if category_col else "__na__": "Category",
    })

    if "Category" not in sku_df.columns:
        sku_df["Category"] = "General"

    # ── Demand type (weekly series per SKU) ────────────────────────────────────
    if date_col:
        try:
            df["_date"] = pd.to_datetime(df[date_col], errors="coerce")
            df["_week"] = df["_date"].dt.to_period("W")
            weekly_agg = df.groupby([product_col, "_week"])["_sales"].sum().reset_index()

            demand_types: dict[str, str] = {}
            active_days_map: dict[str, int] = {}
            for sku, grp in weekly_agg.groupby(product_col):
                demand_types[str(sku)] = _classify_demand(grp["_sales"])
                active_days_map[str(sku)] = int(grp["_sales"].gt(0).sum()) * 7
        except Exception as exc:
            logger.warning("Date parsing failed, using defaults: %s", exc)
            demand_types = {}
            active_days_map = {}
    else:
        demand_types = {}
        active_days_map = {}

    sku_df["DemandType"] = sku_df["StockCode"].apply(
        lambda s: demand_types.get(str(s), "Smooth")
    )
    sku_df["ActiveDays"] = sku_df["StockCode"].apply(
        lambda s: active_days_map.get(str(s), 30)
    )

    # ── Annual demand estimate ─────────────────────────────────────────────────
    # Infer date range from dataset; default 90 days if unavailable
    if date_col:
        try:
            df_date = pd.to_datetime(df[date_col], errors="coerce").dropna()
            date_range_days = max((df_date.max() - df_date.min()).days, 1)
        except Exception:
            date_range_days = 90
    else:
        date_range_days = 90

    scale = 365.0 / date_range_days
    sku_df["AnnualDemand"] = (sku_df["TotalSales"] * scale).round(0).astype(int)

    # ── Synthetic inventory metrics ────────────────────────────────────────────
    # Generate realistic but deterministic values seeded by SKU position
    rng = np.random.default_rng(seed=42)
    n = len(sku_df)

    if stock_col:
        df["_stock"] = pd.to_numeric(df[stock_col], errors="coerce").fillna(0).clip(lower=0)
        sku_stock = df.groupby(product_col)["_stock"].mean().reset_index()
        sku_stock.columns = ["StockCode", "Stock_On_Hand"]
        sku_df = sku_df.merge(sku_stock, on="StockCode", how="left")
        sku_df["Stock_On_Hand"] = sku_df["Stock_On_Hand"].fillna(0).clip(lower=0).round(0).astype(int)
    else:
        # Synthetic: 0–180 days of cover, skewed toward low coverage for realism
        daily_demand = (sku_df["AnnualDemand"] / 365.0).clip(lower=0.01)
        cover_days = rng.integers(0, 181, size=n)
        sku_df["Stock_On_Hand"] = (daily_demand * cover_days).round(0).astype(int)

    if lead_col:
        df["_lead"] = pd.to_numeric(df[lead_col], errors="coerce").clip(lower=1)
        sku_lead = df.groupby(product_col)["_lead"].mean().reset_index()
        sku_lead.columns = ["StockCode", "LeadTimeDays"]
        sku_df = sku_df.merge(sku_lead, on="StockCode", how="left")
        sku_df["LeadTimeDays"] = sku_df["LeadTimeDays"].fillna(CONFIG["lead_time_default"]).round(0).astype(int)
    else:
        sku_df["LeadTimeDays"] = rng.integers(7, 29, size=n)

    # ── ABC classification ─────────────────────────────────────────────────────
    sku_df["Revenue"] = sku_df["TotalSales"] * sku_df.get("UnitPrice", pd.Series(1.0, index=sku_df.index)).fillna(1.0)
    sku_df["ABCClass"] = _assign_abc(sku_df, "Revenue")

    # ── Safety stock and reorder point ─────────────────────────────────────────
    daily_demand = (sku_df["AnnualDemand"] / 365.0).clip(lower=0.01)
    demand_std   = daily_demand * 0.3  # 30% coefficient of variation

    z_scores = sku_df["ABCClass"].map(CONFIG["service_z"]).fillna(1.282)
    sku_df["SafetyStock"]   = (z_scores * demand_std * np.sqrt(sku_df["LeadTimeDays"])).round(0).astype(int)
    sku_df["ReorderPoint"]  = (daily_demand * sku_df["LeadTimeDays"] + sku_df["SafetyStock"]).round(0).astype(int)
    sku_df["EOQ"]           = sku_df.apply(
        lambda r: _eoq(r["AnnualDemand"], max(r.get("UnitPrice", 1.0), 1.0)), axis=1
    )

    # ── Days to stockout ───────────────────────────────────────────────────────
    sku_df["DaysToStockout"] = np.where(
        daily_demand > 0,
        (sku_df["Stock_On_Hand"] / daily_demand).round(0).clip(lower=0),
        999,
    ).astype(int)

    # ── Available stock (stock – reserved/committed) ────────────────────────────
    committed = (sku_df["Stock_On_Hand"] * 0.15).round(0).astype(int)
    sku_df["Available_Stock"] = (sku_df["Stock_On_Hand"] - committed).clip(lower=0)

    # ── ML features for risk scoring ───────────────────────────────────────────
    # NOTE: days_to_stockout is NOT included (data leakage prevention — FIX-1)
    ML_FEATURES = [
        "AnnualDemand",
        "Stock_On_Hand",
        "LeadTimeDays",
        "SafetyStock",
        "ReorderPoint",
        "EOQ",
        "Revenue",
    ]

    # Encode demand type and ABC class
    demand_enc = {"Smooth": 0, "Intermittent": 1, "Erratic": 2}
    abc_enc    = {"A": 2, "B": 1, "C": 0}
    sku_df["DemandTypeEnc"] = sku_df["DemandType"].map(demand_enc).fillna(1)
    sku_df["ABCEnc"]        = sku_df["ABCClass"].map(abc_enc).fillna(0)

    X = sku_df[ML_FEATURES + ["DemandTypeEnc", "ABCEnc"]].fillna(0).values.astype(float)

    # Risk target: proxy = reorder_point / max(stock, 1)
    y_risk = np.clip(
        sku_df["ReorderPoint"].values / np.clip(sku_df["Stock_On_Hand"].values + 1, 1, None),
        0, 5,
    )

    # Train a lightweight GBR on the current batch
    try:
        from sklearn.ensemble import GradientBoostingRegressor
        gbr = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
        gbr.fit(X, y_risk)
        raw_scores = gbr.predict(X)
    except Exception as exc:
        logger.warning("GBR failed, falling back to heuristic risk scores: %s", exc)
        raw_scores = y_risk

    # Normalise to [0, 1]
    s_min, s_max = raw_scores.min(), raw_scores.max()
    if s_max > s_min:
        sku_df["RiskScore"] = np.round((raw_scores - s_min) / (s_max - s_min), 4)
    else:
        sku_df["RiskScore"] = 0.5

    # ── Priority assignment ────────────────────────────────────────────────────
    high_thresh   = np.percentile(sku_df["RiskScore"], CONFIG["priority_high_pct"])
    medium_thresh = np.percentile(sku_df["RiskScore"], CONFIG["priority_medium_pct"])

    def _priority(score: float) -> str:
        if score >= high_thresh:
            return "High"
        if score >= medium_thresh:
            return "Medium"
        return "Low"

    sku_df["Priority"] = sku_df["RiskScore"].apply(_priority)

    # ── Urgency (days-to-stockout based) ──────────────────────────────────────
    def _urgency(days: int) -> str:
        if days <= 7:
            return "Critical"
        if days <= 14:
            return "High"
        if days <= 30:
            return "Medium"
        return "Low"

    sku_df["Urgency"] = sku_df["DaysToStockout"].apply(_urgency)

    # ── Basket bundle uplift ───────────────────────────────────────────────────
    def _bundle_uplift(sku: str, eoq: int) -> int:
        lift = sku_lift.get(str(sku), 1.0)
        if lift < CONFIG["bundle_lift_threshold"]:
            return 0
        extra = eoq * CONFIG["bundle_uplift_rate"]
        return min(int(round(extra)), int(eoq * (CONFIG["bundle_max_factor"] - 1)))

    sku_df["BundleExtra"] = sku_df.apply(lambda r: _bundle_uplift(r["StockCode"], r["EOQ"]), axis=1)

    # ── Forecast demand (annual demand * macro multiplier 1.0 default) ─────────
    sku_df["Forecast_Demand"] = sku_df["AnnualDemand"]

    # ── Determine if reorder is needed ────────────────────────────────────────
    # Reorder if: Priority is High or Medium AND available stock <= reorder point
    needs_reorder = (
        (sku_df["Priority"].isin(["High", "Medium"])) &
        (sku_df["Available_Stock"] <= sku_df["ReorderPoint"])
    )
    sku_df["NeedsReorder"] = needs_reorder

    sku_df["Order_Quantity"] = np.where(
        needs_reorder,
        (sku_df["EOQ"] + sku_df["BundleExtra"]).astype(int),
        0,
    )

    sku_df["UnitPrice"] = sku_df.get("UnitPrice", pd.Series(1.0, index=sku_df.index)).fillna(1.0)
    sku_df["PO_Value_GBP"] = (sku_df["Order_Quantity"] * sku_df["UnitPrice"]).round(2)

    # ── Budget-constrained greedy PO selection ─────────────────────────────────
    po_candidates = sku_df[sku_df["NeedsReorder"] & (sku_df["PO_Value_GBP"] > 0)].copy()
    po_candidates = po_candidates.sort_values("RiskScore", ascending=False)

    selected_pks: list[int] = []
    spend = 0.0
    for idx, row in po_candidates.iterrows():
        if spend + row["PO_Value_GBP"] <= budget_limit:
            selected_pks.append(idx)
            spend += row["PO_Value_GBP"]

    sku_df["ActivePO"] = sku_df.index.isin(selected_pks)

    # ── Reason string ──────────────────────────────────────────────────────────
    def _reason(row: pd.Series) -> str:
        parts = []
        if row["DaysToStockout"] <= 7:
            parts.append("Critical stockout risk")
        elif row["DaysToStockout"] <= 14:
            parts.append("Low stock")
        if row["BundleExtra"] > 0:
            parts.append("Basket bundle uplift")
        if row["ABCClass"] == "A":
            parts.append("High-value SKU (ABC-A)")
        if not parts:
            parts.append("Scheduled reorder")
        return "; ".join(parts)

    sku_df["Reason"] = sku_df.apply(_reason, axis=1)

    # ── Cold-start flag ────────────────────────────────────────────────────────
    sku_df["ColdStart"] = sku_df["ActiveDays"] < CONFIG["cold_start_days"]

    # ── Remove duplicates (keep first occurrence per StockCode) ───────────────
    sku_df = sku_df.drop_duplicates(subset=["StockCode"], keep="first").reset_index(drop=True)

    # ── Build output records ───────────────────────────────────────────────────
    all_records: list[dict] = []
    po_records:  list[dict] = []

    for _, row in sku_df.iterrows():
        rec: dict = {
            "StockCode":         str(row["StockCode"]),
            "Description":       str(row["StockCode"]),
            "Category":          str(row.get("Category", "General")),
            "ABCClass":          str(row["ABCClass"]),
            "DemandType":        str(row["DemandType"]),
            "Stock_On_Hand":     int(row["Stock_On_Hand"]),
            "Available_Stock":   int(row["Available_Stock"]),
            "ReorderPoint":      int(row["ReorderPoint"]),
            "SafetyStock":       int(row["SafetyStock"]),
            "EOQ":               int(row["EOQ"]),
            "LeadTimeDays":      int(row["LeadTimeDays"]),
            "Forecast_Demand":   int(row["Forecast_Demand"]),
            "Order_Quantity":    int(row["Order_Quantity"]),
            "PO_Value_GBP":      round(float(row["PO_Value_GBP"]), 2),
            "UnitPrice":         round(float(row["UnitPrice"]), 2),
            "RiskScore":         round(float(row["RiskScore"]), 4),
            "Priority":          str(row["Priority"]),
            "Urgency":           str(row["Urgency"]),
            "Days_To_Stockout":  int(row["DaysToStockout"]),
            "AnnualDemand":      int(row["AnnualDemand"]),
            "ActivePO":          bool(row["ActivePO"]),
            "ColdStart":         bool(row["ColdStart"]),
            "Reason":            str(row["Reason"]),
        }
        all_records.append(rec)
        if row["ActivePO"]:
            po_records.append(rec)

    # ── Summary ────────────────────────────────────────────────────────────────
    total_po_value = round(sum(r["PO_Value_GBP"] for r in po_records), 2)
    avg_risk       = round(float(sku_df["RiskScore"].mean()), 4)

    urgency_counts = sku_df["Urgency"].value_counts().to_dict()
    priority_counts = sku_df["Priority"].value_counts().to_dict()
    abc_counts      = sku_df["ABCClass"].value_counts().to_dict()
    demand_type_counts = sku_df["DemandType"].value_counts().to_dict()

    summary: dict = {
        "total_skus":           len(sku_df),
        "active_pos":           len(po_records),
        "total_po_value_gbp":   total_po_value,
        "avg_risk_score":       avg_risk,
        "budget_limit_gbp":     round(budget_limit, 2),
        "budget_utilised_gbp":  round(spend, 2),
        "urgency_counts":       urgency_counts,
        "priority_counts":      priority_counts,
        "abc_counts":           abc_counts,
        "demand_type_counts":   demand_type_counts,
        "basket_rules_used":    len(rules_list),
        "currency_symbol":      "£",
    }

    # ── Chart data ─────────────────────────────────────────────────────────────
    # Risk distribution histogram (10 bins)
    risk_hist, risk_edges = np.histogram(sku_df["RiskScore"], bins=10, range=(0, 1))
    risk_distribution = [
        {"bin": f"{risk_edges[i]:.1f}–{risk_edges[i+1]:.1f}", "count": int(risk_hist[i])}
        for i in range(len(risk_hist))
    ]

    # Days to stockout histogram (0-7, 8-14, 15-30, 31-60, 61-90, 90+)
    stockout_bins = [
        ("0–7",   sku_df["DaysToStockout"].between(0, 7).sum()),
        ("8–14",  sku_df["DaysToStockout"].between(8, 14).sum()),
        ("15–30", sku_df["DaysToStockout"].between(15, 30).sum()),
        ("31–60", sku_df["DaysToStockout"].between(31, 60).sum()),
        ("61–90", sku_df["DaysToStockout"].between(61, 90).sum()),
        ("90+",   (sku_df["DaysToStockout"] > 90).sum()),
    ]
    stockout_distribution = [{"range": b, "count": int(c)} for b, c in stockout_bins]

    # Category × Priority heatmap
    if "Category" in sku_df.columns:
        heatmap_df = (
            sku_df.groupby(["Category", "Priority"])
            .size()
            .unstack(fill_value=0)
            .reset_index()
        )
        heatmap_data = heatmap_df.to_dict(orient="records")
    else:
        heatmap_data = []

    # PO Value by ABC class
    po_by_abc = sku_df.groupby("ABCClass")["PO_Value_GBP"].sum().round(2).to_dict()

    chart_data: dict = {
        "risk_distribution":      risk_distribution,
        "stockout_distribution":  stockout_distribution,
        "priority_pie":           [{"name": k, "value": int(v)} for k, v in priority_counts.items()],
        "heatmap":                heatmap_data,
        "po_by_abc":              [{"class": k, "value": round(float(v), 2)} for k, v in po_by_abc.items()],
        "demand_type_pie":        [{"name": k, "value": int(v)} for k, v in demand_type_counts.items()],
        "urgency_bar":            [{"name": k, "value": int(v)} for k, v in urgency_counts.items()],
    }

    return {
        "model":               "inventory",
        "status":              "success",
        "purchase_orders":     po_records,
        "inventory_analysis":  all_records,
        "summary":             summary,
        "chart_data":          chart_data,
    }
