# Data Column Descriptions

Detailed column reference for each sample dataset in this folder.

---

## complete_dataset.csv

All 21 columns — works with **all 4 models**.

| Column | Type | Model(s) | Description |
|--------|------|----------|-------------|
| `InvoiceID` | string | Basket | Unique transaction identifier (`INV-XXXXX`) |
| `Date` | `YYYY-MM-DD` | Demand | Transaction date |
| `ProductID` | string | — | Human-readable product identifier (`Product-XXXX`) |
| `SKU` | string | Basket | Stock-keeping unit code (`SKU-XXXX`) — used as ProductName by Basket model |
| `Category` | string | — | Product category (Books, Sports, Clothing, Electronics, etc.) |
| `OldSegment` | string | — | Legacy customer segment (Premium / Standard / Budget) |
| `NewSegment` | string | — | AI-derived pricing segment (Premium / Standard / Budget / New Discovery) |
| `Quantity` | integer | Demand | Units sold in this transaction |
| `UnitPrice` | float | Pricing | Selling price per unit in USD — maps to `current_price` |
| `CompetitorPrice` | float | Pricing | Synthetic competitor market price in USD — maps to `competitor_price` |
| `Revenue` | float | Demand | Gross revenue after discount (`Quantity × UnitPrice × (1 − Discount)`) |
| `COGS` | float | — | Cost of goods sold (40–65% of revenue) |
| `Discount` | float | — | Discount rate applied (0.00–0.20) |
| `CustomerID` | string | Churn | Unique customer identifier (`CUST-XXXXX`) |
| `Segment` | string | Churn | RFM segment label |
| `LTValue` | float | Churn | Customer lifetime value estimate (USD) |
| `RecencyDays` | integer | Churn | Days since customer's last purchase — maps to `RecencyDays` |
| `FrequencyMonths` | float | Churn | Average purchases per month — maps to `FrequencyMonths` |
| `MonetaryValue` | float | Churn | Average order value (USD) — maps to `MonetaryValue` |
| `ChurnRisk` | float | Churn | Pre-labelled churn probability (0–100%) — informational |
| `HealthScore` | float | Churn | Pre-labelled customer health score (0–100) — informational |

---

## customer_data.csv

8 columns — **Churn model only**.

| Column | Type | Description |
|--------|------|-------------|
| `CustomerID` | string | Unique customer identifier (`CUST-XXXXX`) |
| `Segment` | string | RFM segment (Champions, Loyal Customers, Potential Loyalists, At Risk, Can't Lose Them, Hibernating) |
| `LTValue` | float | Lifetime value estimate (USD) |
| `RecencyDays` | integer | Days since last purchase |
| `FrequencyMonths` | float | Average purchases per month |
| `MonetaryValue` | float | Average order value (USD) |
| `ChurnRisk` | float | Predicted churn probability (0–100%) |
| `HealthScore` | float | Overall customer health score (0–100) |

**Churn model required columns:** `RecencyDays`, `FrequencyMonths`, `MonetaryValue`

---

## retail_sales_data.csv

11 columns — **Demand & Basket models**.

| Column | Type | Model(s) | Description |
|--------|------|----------|-------------|
| `Date` | `YYYY-MM-DD` | Demand | Transaction date |
| `ProductID` | string | — | Human-readable product identifier |
| `SKU` | string | Basket | Stock-keeping unit — matched as ProductName |
| `Category` | string | — | Product category |
| `OldSegment` | string | — | Legacy customer segment |
| `NewSegment` | string | — | AI-derived segment |
| `Quantity` | integer | Demand | Units sold |
| `UnitPrice` | float | — | Selling price per unit (USD) |
| `Revenue` | float | Demand | Gross revenue after discount |
| `COGS` | float | — | Cost of goods sold |
| `Discount` | float | — | Discount rate (0.00–0.20) |

**Demand model required columns:** `Date` + `Revenue` (or `Quantity`)  
**Basket model required columns:** `SKU` (as ProductName) — *note: no InvoiceID column, so Basket model is not compatible with this file alone*

---

## Model Column Requirements

| Model | Required Columns | Matched by |
|-------|-----------------|------------|
| **Churn** | `RecencyDays`, `FrequencyMonths`, `MonetaryValue` | Exact names (fuzzy match) |
| **Demand** | Date column + Sales/Revenue column | Fuzzy match on "date", "revenue", "quantity" |
| **Basket** | Invoice/Order ID column + Product/SKU column | Fuzzy match on "invoice"/"orderid" + "sku"/"product" |
| **Pricing** | Current price + Competitor price | Fuzzy match on "unitprice"/"price" + "competitorprice" |
