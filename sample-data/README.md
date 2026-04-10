# Sample Data — Retail Agentic AI

This folder contains sample CSV files for the AI platform. Use `comprehensive_retail_data.csv` to run **all four models at once**, or upload the focused files to test individual models.

---

## Files

| File | Rows | Compatible Model(s) |
|------|------|---------------------|
| `comprehensive_retail_data.csv` | 5,000 | ✅ **ALL 4 models** — **Recommended** |
| `churn_analysis.csv` | 150 | ✅ **Churn** ONLY |
| `demand_forecast.csv` | 104 | ✅ **Demand** ONLY |
| `market_basket.csv` | ~3,700 | ✅ **Basket** ONLY |
| `pricing_optimization.csv` | ~120 | ✅ **Pricing** ONLY |
| `complete_retail_data.csv` | ~155 | ✅ **ALL 4 models** |

---

## Quick Start

1. Start the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app:app --reload
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm install   # first time only
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) → **Launch Wizard**

4. **Step 1 – Upload**: drag-and-drop `comprehensive_retail_data.csv`
   - The app auto-detects which models are compatible
   - All four models will show as ✅ available

5. Follow the wizard steps to run models and view results.

---

## File Details

### `comprehensive_retail_data.csv` — All 4 Models (Recommended) ⭐

5,000 transaction rows spanning 2023–2025, covering 250 unique customers, multiple products per category, and realistic seasonal patterns. **Upload this file once to enable all four AI models simultaneously.**

**Columns:**

| Column | Type | Used by |
|--------|------|---------|
| `InvoiceID` | string | Basket |
| `Date` | YYYY-MM-DD | Demand |
| `CustomerID` | string | Churn |
| `ProductName` | string | Basket, Pricing |
| `Category` | string | Basket, Pricing |
| `SKU` | string | Basket |
| `Revenue` | float | Demand |
| `Quantity` | int | — |
| `UnitPrice` | float | Pricing |
| `RecencyDays` | int | Churn |
| `FrequencyMonths` | float | Churn |
| `MonetaryValue` | float | Churn |
| `CompetitorPrice` | float | Pricing |

**Dataset characteristics:**
- **5,000 rows**, no missing values
- **Date range:** 2023-01-01 – 2025-12-31
- **250 unique customers** across three value segments
- **5 product categories:** Electronics (~25%), Apparel (~25%), Home (~20%), Food (~15%), Health (~15%)
- **Seasonal patterns:** Q4 (Oct–Dec) ~40% higher activity; June–July summer dip ~–10%
- **Customer segments:** High-value (~20%), Medium-value (~50%), Low-value (~30%)
- **Realistic monetary values** – UnitPrice range 100–8,000 ₹ depending on category

**Expected compatibility:**
```
comprehensive_retail_data.csv → Compatible: Churn ✅  Demand ✅  Basket ✅  Pricing ✅
```

---

### `churn_analysis.csv` — Customer Churn Model

150 customer records with RFM (Recency, Frequency, Monetary) metrics across five lifecycle segments.

**Required columns:** `RecencyDays`, `FrequencyMonths`, `MonetaryValue`
**Optional column:** `CustomerID`

**Segments included:**
- **Champion** (~25): Recent buyers, high frequency, high spend
- **Loyal** (~30): Good recency & frequency, solid monetary value
- **CoreActive** (~35): Moderate metrics across the board
- **AtRisk** (~30): Declining recency, lower frequency
- **Dormant** (~30): Haven't purchased in 5–12 months, very low activity

---

### `demand_forecast.csv` — Demand Forecasting Model

104 weekly sales records covering 2 years (2023–2024) with seasonal patterns and an annual upward trend.

**Required columns:** `Date`, `Sales`

**Patterns:**
- Steady upward trend over the 2-year period
- Q4 holiday spike (November–December)
- Natural seasonal oscillation throughout the year

---

### `market_basket.csv` — Market Basket Analysis Model

~3,700 transaction line-items across ~1,400 orders, with strong cross-category purchase patterns.

**Required columns:** `Invoice`, `ProductName`
**Optional column:** `Category`

**Item categories:** Furniture, Kitchen, Decor, Office

**Association patterns built in (with cross-category rules):**
- Sofa → Area Rug, Throw Pillow (Furniture → Decor)
- Office Desk + Office Chair → Desk Lamp (Office → Decor)
- Dining Table + Dining Chair → Dishware Set (Furniture → Kitchen)
- Cookware Set → Utensil Set + Dishware Set (within Kitchen)

**Expected results after upload:**
- Total rules: ~100–130
- Cross-category rules: ~50+ (e.g., Furniture→Decor, Office→Decor)
- High-lift cross-category: Area Rug+Floor Lamp → Bed Frame (lift ~8x)

---

### `pricing_optimization.csv` — Pricing Intelligence Model

~120 products with current price, competitor price, ratings, and categories.

**Required columns:** `current_price`, `competitor_price`
**Optional columns:** `ProductID`, `ProductName`, `rating`, `category`

**Pricing scenarios:**
- **Overpriced** (should decrease): our price > competitor price by >10 %
- **Underpriced** (should increase): competitor price > our price by >10 %
- **Competitive** (hold): prices within ~5–10 % of each other

---

### `complete_retail_data.csv` — All 4 Models (Full Platform Demo)

155 transaction rows spanning 2024, covering 20 customers, 19 products, and 4 categories. Upload this file **once** to enable all four AI models simultaneously.

**Columns:**

| Column | Used by |
|--------|---------|
| `Date` | Demand |
| `CustomerID` | Churn |
| `Invoice` | Basket |
| `ProductName` | Basket, Pricing |
| `Category` | Basket, Pricing |
| `Sales` | Demand |
| `CurrentPrice` | Pricing |
| `CompetitorPrice` | Pricing |
| `Rating` | Pricing |
| `RecencyDays` | Churn |
| `FrequencyMonths` | Churn |
| `MonetaryValue` | Churn |

**Use cases:**
- Full platform demo — show all capabilities in one upload
- Select any subset of models (e.g., Churn + Basket, or all four)
- Cross-category basket rules visible alongside pricing and RFM data

**Expected compatibility:**
```
complete_retail_data.csv → Compatible: Churn ✅  Demand ✅  Basket ✅  Pricing ✅
```

---

## Validation

Upload each focused file and confirm strict model compatibility:

```
comprehensive_retail_data.csv → Compatible: ALL 4 models      ✅ (recommended)
churn_analysis.csv            → Compatible: Churn ONLY         ✅
demand_forecast.csv           → Compatible: Demand ONLY        ✅
market_basket.csv             → Compatible: Basket ONLY        ✅
pricing_optimization.csv      → Compatible: Pricing ONLY       ✅
complete_retail_data.csv      → Compatible: ALL 4 models       ✅
```
