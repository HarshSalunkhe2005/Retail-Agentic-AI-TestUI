# Sample Data for Retail Agentic AI TestUI

This folder contains ready-to-use CSV files for testing the Retail Agentic AI UI application. Each file can be uploaded directly through the wizard without any modification.

---

## Files

| File | Rows | Purpose |
|------|------|---------|
| `retail_sales_data.csv` | 520 | Sales & revenue history |
| `inventory_data.csv` | 110 | Inventory status & reorder signals |
| `customer_data.csv` | 210 | Customer segmentation & health |

---

## retail_sales_data.csv

Daily sales transactions covering the last 12 months with realistic seasonal patterns (holiday spikes in November/December, summer lift in July/August).

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `Date` | `YYYY-MM-DD` | Transaction date |
| `ProductID` | string | Human-readable product identifier |
| `SKU` | string | Stock-keeping unit (`SKU-XXXX`) |
| `Category` | string | Product category (Electronics, Clothing, Food & Beverage, Home & Garden, Sports, Beauty, Toys, Books) |
| `OldSegment` | string | Legacy customer segment (Premium / Standard / Budget) |
| `NewSegment` | string | New AI-derived segment (Premium / Standard / Budget / New Discovery) |
| `Quantity` | integer | Units sold in the transaction |
| `UnitPrice` | float | Selling price per unit (USD) |
| `Revenue` | float | Gross revenue after discount (`Quantity × UnitPrice × (1 − Discount)`) |
| `COGS` | float | Cost of goods sold (40–65% of revenue) |
| `Discount` | float | Discount rate applied (0.00–0.20) |

### Data generation notes
- Prices are category-anchored (e.g. Electronics baseline ~$150, Books baseline ~$20) with ±15 % variation.
- Seasonal multipliers applied per month (December = 1.40×, February = 0.80×).
- `NewSegment` includes a "New Discovery" class (~15 % of rows) that carries a slightly higher discount.

---

## inventory_data.csv

Snapshot of 110 SKUs with current stock levels, reorder thresholds, and urgency classification.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `SKU` | string | Stock-keeping unit (`SKU-XXXX`) |
| `ProductName` | string | Descriptive product name |
| `Category` | string | Same category taxonomy as sales data |
| `CurrentStock` | integer | Units on hand right now |
| `ReorderPoint` | integer | Trigger level for placing a replenishment order |
| `SafetyStock` | integer | Minimum buffer to absorb demand variability |
| `LeadTime` | integer | Supplier lead time in days |
| `DemandForecast` | float | Projected weekly demand (units) |
| `ABCClass` | string | ABC inventory classification (A = high-value, C = low-value) |
| `UrgencyLevel` | string | Reorder urgency (Critical / High / Medium / Low) |

### Urgency rules
| Level | Condition |
|-------|-----------|
| **Critical** | `CurrentStock ≤ SafetyStock` |
| **High** | `SafetyStock < CurrentStock ≤ ReorderPoint` |
| **Medium** | `ReorderPoint < CurrentStock ≤ ReorderPoint × 1.5` |
| **Low** | `CurrentStock > ReorderPoint × 1.5` |

### ABC distribution
- **A class** (~20%): high-velocity, high-value items — tight stock control.
- **B class** (~30%): moderate movers.
- **C class** (~50%): slow movers — bulk stock held.

---

## customer_data.csv

210 customer records across six RFM-based segments with churn risk and health scores.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `CustomerID` | string | Unique customer identifier (`CUST-XXXXX`) |
| `Segment` | string | RFM segment label (see below) |
| `LTValue` | float | Lifetime value estimate (USD) |
| `RecencyDays` | integer | Days since last purchase |
| `FrequencyMonths` | float | Average purchases per month |
| `MonetaryValue` | float | Average order value (USD) |
| `ChurnRisk` | float | Predicted churn probability (0–100%) |
| `HealthScore` | float | Overall customer health (0–100) |

### Segments & approximate distribution

| Segment | Share | Churn Risk | Health |
|---------|-------|-----------|--------|
| Champions | 15% | 0–15% | 80–100 |
| Loyal Customers | 25% | 5–25% | 65–90 |
| Potential Loyalists | 20% | 15–40% | 55–80 |
| At Risk | 15% | 50–80% | 25–55 |
| Can't Lose Them | 10% | 40–70% | 30–60 |
| Hibernating | 15% | 70–95% | 5–35 |

---

## Usage — Testing the UI

1. Start the dev server:
   ```bash
   cd frontend
   npm install   # first time only
   npm run dev
   ```
2. Open [http://localhost:5173](http://localhost:5173) in your browser.
3. Click **Launch Wizard** on the home screen.
4. **Step 1 – Upload**: drag-and-drop (or browse for) **`retail_sales_data.csv`**.
5. **Step 2 – Preview**: inspect the first 10 rows and toggle the customer segments you want to analyse.
6. **Step 3 – Select Models**: choose one or more AI models (Pricing Intelligence, Customer Churn, Demand Forecasting, Market Basket Analysis, Inventory Reorder).
7. **Step 4 – Execute**: watch the skeleton-card progress while models run.
8. **Step 5 – Results**: explore KPI cards, segment comparison charts, and the inventory urgency matrix.

> **Tip:** You can also upload `inventory_data.csv` or `customer_data.csv` to exercise the data-preview table with different column sets.
