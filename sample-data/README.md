# Sample Data — Retail Agentic AI

This folder contains a single comprehensive CSV file compatible with **all four AI models** simultaneously.

---

## Files

| File | Rows | Compatible Model(s) |
|------|------|---------------------|
| `comprehensive_retail_data.csv` | 1,000 | ✅ **ALL 4 models** — **Recommended** |

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

### `comprehensive_retail_data.csv` — All 4 Models ⭐

1,000 transaction rows spanning the full year 2024, covering 25 unique customers across 56 products in 5 categories with realistic seasonal patterns. **Upload this file once to enable all four AI models simultaneously.**

**Columns:**

| Column | Type | Used by |
|--------|------|---------|
| `Date` | YYYY-MM-DD | Demand |
| `Invoice` | INV-XXXXX | Basket |
| `ProductName` | string | Basket, Pricing |
| `Category` | string | All models |
| `Quantity` | int | Demand |
| `Sales` | float | Demand |
| `current_price` | float | Pricing (**lowercase**) |
| `competitor_price` | float | Pricing (**lowercase**) |
| `Rating` | float (1–5) | Pricing |
| `CustomerID` | CUST-XXX | Churn |
| `RecencyDays` | int | Churn |
| `FrequencyMonths` | float | Churn |
| `MonetaryValue` | float | Churn |

> ⚠️ **Important:** `current_price` and `competitor_price` are **snake_case** (all lowercase). This is required for the Pricing model to detect them correctly.

**Dataset characteristics:**
- **1,000 rows**, no missing values, no currency symbols
- **Date range:** 2024-01-01 – 2024-12-31
- **25 unique customers** (CUST-001 to CUST-025)
- **56 unique products** across 5 categories
- **5 product categories:** Electronics (~25%), Apparel (~25%), Home (~20%), Food (~15%), Health (~15%)
- **Price range:** ₹100 – ₹5,000 (numeric values only, no symbols)
- **Seasonal patterns:** Q4 (Oct–Dec) ~40–50% higher sales; June–July summer dip ~–15%
- **Cross-category basket associations:** Sofa→Rug→Throw Pillow, Keyboard→Mouse→Hub, Yoga Mat→Resistance Bands, etc.
- **Valid RFM values:** Recency 1–120 days, Frequency 1–15/month, Monetary ₹2,000–₹40,000

**Expected compatibility:**
```
comprehensive_retail_data.csv → Compatible: Churn ✅  Demand ✅  Basket ✅  Pricing ✅  Inventory ✅
```

---

## Validation Checklist

After uploading `comprehensive_retail_data.csv`:

- ✅ Only ONE CSV file in sample-data folder
- ✅ 1,000 rows of data
- ✅ Column names are EXACT (`current_price`, `competitor_price` lowercase)
- ✅ Date range: 2024-01-01 to 2024-12-31
- ✅ No currency symbols in numeric columns
- ✅ Churn model runs ✅
- ✅ Demand model runs ✅
- ✅ Basket model runs ✅
- ✅ Pricing model runs ✅
- ✅ Inventory model runs ✅ (all 4 upstream models complete)
