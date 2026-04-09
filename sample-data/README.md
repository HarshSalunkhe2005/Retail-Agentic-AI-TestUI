# Sample Data — Retail Agentic AI

This folder contains ready-to-use CSV files for testing the Retail Agentic AI UI. Upload any file directly through the wizard — compatible models are auto-detected.

---

## Files

| File | Rows | Compatible Models |
|------|------|-------------------|
| `complete_dataset.csv` | 520 | ✅ **ALL 4 models** (Churn, Demand, Basket, Pricing) |
| `customer_data.csv` | 210 | ✅ Churn only |
| `retail_sales_data.csv` | 520 | ✅ Demand, Basket |

> **Tip:** Use `complete_dataset.csv` to test all four AI models in a single run.

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

4. **Step 1 – Upload**: drag-and-drop `complete_dataset.csv`
   - The app auto-detects which models are compatible
   - All 4 models should show as ✅ available

5. **Step 2 – Preview**: inspect the data columns

6. **Step 3 – Select Models**: all compatible models are pre-selected

7. **Step 4 – Execute**: models run in parallel with real-time progress

8. **Step 5 – Results**: results displayed in order:
   - 👥 Customer Churn
   - 📊 Demand Forecasting
   - 🛒 Market Basket Analysis
   - 📈 Pricing Intelligence

---

## File Details

### complete_dataset.csv — Use with ALL models

520 rows combining retail sales data with customer RFM metrics.
Each row represents one sales transaction linked to a customer.

**Columns added beyond retail_sales_data.csv:**
- `InvoiceID` — transaction identifier (for Basket model)
- `CompetitorPrice` — competitor pricing (for Pricing model)
- `CustomerID`, `Segment`, `LTValue`, `RecencyDays`, `FrequencyMonths`, `MonetaryValue`, `ChurnRisk`, `HealthScore` — from customer_data.csv (for Churn model)

---

### customer_data.csv — Churn model only

210 customer records with RFM (Recency, Frequency, Monetary) metrics and health scores.

**Required columns for Churn model:** `RecencyDays`, `FrequencyMonths`, `MonetaryValue`

---

### retail_sales_data.csv — Demand & Basket models

520 daily sales transactions with product, category, pricing and revenue data.

**Required columns:**
- Demand model: `Date`, `Revenue` (or `Quantity`)
- Basket model: `SKU` (ProductName), `ProductID` + any invoice column

---

See `data_descriptions.md` for full column-by-column reference.

