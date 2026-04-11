"""POST /api/models/basket — Market Basket Analysis.

Mines association rules directly from the uploaded transaction CSV using FP-Growth
so that any multi-category dataset will automatically produce cross-category rules.
Always analyzes the uploaded data only — never falls back to pre-trained/cached models.
"""

from __future__ import annotations

import logging

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse

from utils.column_detector import detect_basket
from utils.data_validation import validate_csv, parse_csv
from utils.response_formatter import format_basket_response, error_response

logger = logging.getLogger(__name__)
router = APIRouter()

REQUIRED_COLS  = ["Invoice", "ProductName"]
TOP_RULES      = 100
MIN_SUPPORT    = 0.02   # >=2 % of transactions
MIN_CONFIDENCE = 0.20   # >=20 % confidence
MIN_TRANSACTIONS_FOR_MINING = 2   # need at least 2 unique invoices to find associations
MIN_PRODUCTS_FOR_MINING     = 2   # need at least 2 distinct products


# -- helpers ------------------------------------------------------------------

def _safe_list(value: str, sep: str = ",") -> list[str]:
    return [v.strip() for v in str(value).split(sep) if v.strip()]


def _mine_rules_from_csv(
    df: pd.DataFrame,
    invoice_col: str,
    product_col: str,
    category_col: str | None,
) -> pd.DataFrame:
    """Mine association rules from uploaded transaction data using FP-Growth."""
    from mlxtend.frequent_patterns import fpgrowth, association_rules as mlx_assoc_rules

    # Build product -> category lookup
    cat_map: dict[str, str] = {}
    if category_col and category_col in df.columns:
        for _, row in df[[product_col, category_col]].drop_duplicates().iterrows():
            prod = str(row[product_col]).strip()
            cat  = str(row[category_col]).strip()
            if prod and cat and prod.lower() not in ("nan", "") and cat.lower() not in ("nan", ""):
                cat_map[prod] = cat

    # Group rows into per-invoice product lists
    transactions: list[list[str]] = (
        df.groupby(invoice_col)[product_col]
        .apply(lambda x: list(x.dropna().astype(str).str.strip().unique()))
        .tolist()
    )

    # All unique products that appear in at least one transaction
    all_products = sorted({p for tx in transactions for p in tx})
    if len(all_products) < 2:
        return pd.DataFrame()

    # Build boolean one-hot basket matrix
    records: list[dict[str, bool]] = []
    for tx in transactions:
        tx_set = set(tx)
        records.append({p: (p in tx_set) for p in all_products})
    basket_matrix = pd.DataFrame(records, columns=all_products, dtype=bool)

    # Mine frequent itemsets
    try:
        freq_items = fpgrowth(basket_matrix, min_support=MIN_SUPPORT, use_colnames=True)
    except Exception as exc:
        logger.warning("FP-Growth failed: %s", exc)
        return pd.DataFrame()

    if freq_items.empty:
        return pd.DataFrame()

    # Generate association rules
    try:
        rules = mlx_assoc_rules(freq_items, metric="confidence", min_threshold=MIN_CONFIDENCE)
    except Exception as exc:
        logger.warning("Association rules generation failed: %s", exc)
        return pd.DataFrame()

    if rules.empty:
        return pd.DataFrame()

    # Convert frozensets to plain sorted lists
    rules["antecedents_list"] = rules["antecedents"].apply(sorted)
    rules["consequents_list"] = rules["consequents"].apply(sorted)

    # Flag cross-category rules
    def _cats(items: list[str]) -> set[str]:
        return {cat_map[p] for p in items if p in cat_map}

    if cat_map:
        rules["ant_cats"] = rules["antecedents_list"].apply(_cats)
        rules["con_cats"] = rules["consequents_list"].apply(_cats)
        rules["cross_category"] = rules.apply(
            lambda r: (
                bool(r["ant_cats"]) and bool(r["con_cats"])
                and len(r["ant_cats"] & r["con_cats"]) == 0
            ),
            axis=1,
        )
    else:
        rules["cross_category"] = False

    # Sort by lift descending and add sequential rule_id
    rules = rules.sort_values("lift", ascending=False).reset_index(drop=True)
    rules["rule_id"] = rules.index + 1

    return rules


# -- route --------------------------------------------------------------------

@router.post("/models/basket")
async def run_basket(
    file:   UploadFile = File(...),
    limit:  int        = Query(default=10, ge=1, le=100),
    offset: int        = Query(default=0, ge=0),
):
    content = await validate_csv(file)
    df      = parse_csv(content)

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

    mapped       = detection.mapped
    invoice_col  = mapped["Invoice"]
    product_col  = mapped["ProductName"]
    category_col = mapped.get("Category")

    n_invoices = df[invoice_col].nunique()

    # -- Mine rules from the uploaded data ------------------------------------
    rules_df = pd.DataFrame()
    try:
        rules_df = _mine_rules_from_csv(df, invoice_col, product_col, category_col)
    except Exception as exc:
        logger.warning("Rule mining failed: %s", exc)

    # -- If mining produced no rules, return an empty result with explanation --
    if rules_df.empty:
        n_products = df[product_col].nunique()
        if n_invoices < MIN_TRANSACTIONS_FOR_MINING:
            reason = (
                f"Insufficient transactions: only {n_invoices} unique invoice(s) found. "
                f"At least {MIN_TRANSACTIONS_FOR_MINING} transactions are needed to find associations."
            )
        elif n_products < MIN_PRODUCTS_FOR_MINING:
            reason = (
                f"Insufficient products: only {n_products} unique product(s) found. "
                f"At least {MIN_PRODUCTS_FOR_MINING} distinct products are needed to find associations."
            )
        else:
            reason = (
                f"No association rules met the minimum thresholds "
                f"(support ≥ {MIN_SUPPORT:.0%}, confidence ≥ {MIN_CONFIDENCE:.0%}) "
                f"from {n_invoices} transactions and {n_products} products. "
                "Try uploading a larger dataset."
            )
        logger.info(
            "Basket mining produced no rules for uploaded data (%d invoices): %s",
            n_invoices,
            reason,
        )
        summary: dict = {
            "total_rules":          0,
            "cross_category_rules": 0,
            "products_analyzed":    0,
            "message":              reason,
        }
        pagination = {
            "total_count": 0,
            "limit":       limit,
            "offset":      offset,
            "returned":    0,
        }
        return format_basket_response([], summary, pagination=pagination)

    # -- Build response list from freshly mined rules -------------------------
    top_rules  = rules_df.head(TOP_RULES)
    rules_out: list[dict] = []
    for _, row in top_rules.iterrows():
        entry: dict = {
            "antecedent": row["antecedents_list"],
            "consequent": row["consequents_list"],
            "support":    round(float(row.get("support",    0)), 4),
            "confidence": round(float(row.get("confidence", 0)), 4),
            "lift":       round(float(row.get("lift",       0)), 4),
            "rule_id":    int(row["rule_id"]),
        }
        rules_out.append(entry)

    cross_cat_count = int(top_rules["cross_category"].sum())

    # -- Pagination -----------------------------------------------------------
    total_count = len(rules_out)
    paginated   = rules_out[offset: offset + limit]

    # -- Summary --------------------------------------------------------------
    products_analyzed = len(
        {p for row in rules_out for p in row["antecedent"] + row["consequent"]}
    )

    summary: dict = {
        "total_rules":          total_count,
        "cross_category_rules": cross_cat_count,
        "products_analyzed":    products_analyzed,
    }

    pagination = {
        "total_count": total_count,
        "limit":       limit,
        "offset":      offset,
        "returned":    len(paginated),
    }

    return format_basket_response(paginated, summary, pagination=pagination)
