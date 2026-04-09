"""POST /api/models/basket — Market Basket Analysis (Model 5 - Updated MBA).

The pre-trained PKL contains association rules mined with FP-Growth.
For uploaded CSV input we:
  1. Build a transaction matrix from Invoice × Product columns.
  2. Return the stored association rules enriched with the composite scoring
     from the updated model, filtered to the products present in the uploaded data
     (if possible) — or fall back to returning all top rules.
"""

from __future__ import annotations

import logging
import re

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse

from utils.column_detector import detect_basket
from utils.data_validation import validate_csv, parse_csv
from utils.model_loader import load_pickle
from utils.response_formatter import format_basket_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_COLS = ["Invoice", "ProductName"]
TOP_RULES     = 100   # max rules to return


def _safe_list(value: str, sep: str = ",") -> list[str]:
    return [v.strip() for v in str(value).split(sep) if v.strip()]


def _build_product_set(df: pd.DataFrame, invoice_col: str, product_col: str) -> set[str]:
    """Collect all unique product identifiers from the uploaded CSV."""
    products: set[str] = set()
    for val in df[product_col].dropna():
        products.add(re.sub(r"\s+", " ", str(val).strip()).upper())
    return products


@router.post("/models/basket")
async def run_basket(
    file: UploadFile = File(...),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    content = await validate_csv(file)
    df = parse_csv(content)

    detection = detect_basket(df.columns.tolist())
    if not detection.matched:
        return JSONResponse(
            status_code=422,
            content=error_response(
                "basket",
                f"Missing required columns: {', '.join(detection.missing)}",
                required_columns=REQUIRED_COLS,
            ),
        )

    mapped = detection.mapped
    invoice_col = mapped["Invoice"]
    product_col = mapped["ProductName"]

    # ── Load pre-trained rules DataFrame ──────────────────────────────────────
    try:
        rules_df: pd.DataFrame = load_pickle("basket")
    except Exception as exc:
        logger.error("Basket model load error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=error_response("basket", "Failed to load basket analysis model."),
        )

    if rules_df is None or rules_df.empty:
        return JSONResponse(
            status_code=500,
            content=error_response("basket", "Basket model contains no rules."),
        )

    # ── Collect products from uploaded CSV for relevance filtering ─────────────
    uploaded_products = _build_product_set(df, invoice_col, product_col)

    # ── Identify available columns ─────────────────────────────────────────────
    rule_cols = rules_df.columns.tolist()
    has_antecedents_str  = "antecedents_str"  in rule_cols
    has_antecedents_desc = "antecedents_desc" in rule_cols
    has_consequents_str  = "consequents_str"  in rule_cols
    has_consequents_desc = "consequents_desc" in rule_cols
    has_composite        = "composite_score"  in rule_cols
    has_revenue          = "revenue_weight"   in rule_cols
    has_rule_id          = "rule_id"          in rule_cols
    has_cross_category   = "cross_category"   in rule_cols

    # ── Sort by composite_score if available, else lift ────────────────────────
    sort_col = "composite_score" if has_composite else "lift"
    if sort_col in rule_cols:
        rules_df = rules_df.sort_values(sort_col, ascending=False)

    # ── Try to filter rules to products in the uploaded CSV ───────────────────
    if uploaded_products and has_antecedents_desc:
        def _rule_overlaps(row) -> bool:
            descs = _safe_list(str(row["antecedents_desc"]), "|")
            codes = _safe_list(str(row["antecedents_str"])) if has_antecedents_str else []
            all_ids = {d.upper() for d in descs} | {c.upper() for c in codes}
            return bool(all_ids & uploaded_products)

        filtered = rules_df[rules_df.apply(_rule_overlaps, axis=1)]
        if not filtered.empty:
            rules_df = filtered

    top_rules = rules_df.head(TOP_RULES)

    # ── Build response rules list ──────────────────────────────────────────────
    rules_out: list[dict] = []
    for _, row in top_rules.iterrows():
        antecedent = (
            _safe_list(str(row["antecedents_desc"]), "|") if has_antecedents_desc
            else _safe_list(str(row.get("antecedents_str", "")))
        )
        consequent = (
            _safe_list(str(row["consequents_desc"]), "|") if has_consequents_desc
            else _safe_list(str(row.get("consequents_str", "")))
        )

        rule_entry: dict = {
            "antecedent":      antecedent,
            "consequent":      consequent,
            "support":         round(float(row.get("support",    0)), 4),
            "confidence":      round(float(row.get("confidence", 0)), 4),
            "lift":            round(float(row.get("lift",       0)), 4),
        }

        if has_composite:
            rule_entry["composite_score"] = round(float(row["composite_score"]), 4)
        if has_revenue:
            rule_entry["revenue_weight"] = round(float(row["revenue_weight"]), 4)
        if has_rule_id:
            rule_entry["rule_id"] = row["rule_id"]

        rules_out.append(rule_entry)

    # ── Pagination ─────────────────────────────────────────────────────────────
    total_count = len(rules_out)
    paginated   = rules_out[offset: offset + limit]

    # ── Summary ────────────────────────────────────────────────────────────────
    cross_cat_count = (
        int(top_rules["cross_category"].sum()) if has_cross_category else 0
    )
    avg_composite = (
        round(float(top_rules["composite_score"].mean()), 4)
        if has_composite else None
    )

    products_analyzed = len(
        {p for row in rules_out for p in row["antecedent"] + row["consequent"]}
    )

    summary: dict = {
        "total_rules":           total_count,
        "cross_category_rules":  cross_cat_count,
        "products_analyzed":     products_analyzed,
    }
    if avg_composite is not None:
        summary["avg_composite_score"] = avg_composite

    pagination = {
        "total_count": total_count,
        "limit":       limit,
        "offset":      offset,
        "returned":    len(paginated),
    }

    return format_basket_response(paginated, summary, pagination=pagination)
