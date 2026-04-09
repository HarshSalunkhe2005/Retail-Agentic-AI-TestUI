# Sample Data — Retail Agentic AI

This folder contains four focused CSV files — one per AI model. Each dataset is designed to be compatible with **exactly one** model, preventing false positives during auto-detection.

---

## Files

| File | Rows | Compatible Model |
|------|------|-----------------|
| `churn_analysis.csv` | 150 | ✅ **Churn** ONLY |
| `demand_forecast.csv` | 104 | ✅ **Demand** ONLY |
| `market_basket.csv` | ~670 | ✅ **Basket** ONLY |
| `pricing_optimization.csv` | ~120 | ✅ **Pricing** ONLY |

> **Rule:** Upload a file and only its matching model will show as compatible — no false positives.

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

4. **Step 1 – Upload**: drag-and-drop any of the four CSVs
   - The app auto-detects which model is compatible
   - Only the matching model should show as ✅ available

5. Follow the wizard steps to run the model and view results.

---

## File Details

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

~670 transaction line-items across 400 orders, with cross-category purchase patterns.

**Required columns:** `Invoice`, `ProductName`  
**Optional column:** `Category`

**Item categories:** Electronics, Accessories, Office, Mobile, Home  
**Association patterns built in:**
- Laptop → USB-C Cable, Laptop Bag, Mouse, Keyboard
- Monitor → Monitor Riser, HDMI Cable
- Wireless Charger → Power Bank, Phone Case
- Smart Bulb → Smart Plug, Extension Cord

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

## Validation

To verify strict model compatibility, upload each file and confirm:

```
churn_analysis.csv        → Compatible: Churn ONLY   ✅
demand_forecast.csv       → Compatible: Demand ONLY  ✅
market_basket.csv         → Compatible: Basket ONLY  ✅
pricing_optimization.csv  → Compatible: Pricing ONLY ✅
```

No other model should appear as compatible for any file.

