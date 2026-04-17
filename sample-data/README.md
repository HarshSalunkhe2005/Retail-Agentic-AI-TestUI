# Sample Data for Retail Agentic AI

Test datasets for validating each AI model individually and all models together.

## Files

| File | Purpose | Compatible Models | Rows |
|------|---------|-------------------|------|
| `pricing_test.csv` | Pricing intelligence testing (includes discount-triggering products) | Pricing only | 38 products |
| `churn_test.csv` | Customer health & churn analysis | Churn only | 50 customers |
| `demand_test.csv` | Demand forecasting | Demand only | 51 weeks |
| `basket_test.csv` | Market basket analysis | Basket only | 93 rows, 35 invoices |
| `comprehensive_retail_data.csv` | **All models at once** (Sales trend upward) | Pricing + Churn + Demand + Basket | 120+ rows |

## Column Mappings

### Pricing Model
- `CurrentPrice` / `current_price` → Current selling price
- `CompetitorPrice` / `competitor_price` → Competitor price
- `Rating` → Product rating (optional)
- `RatingCount` / `rating_count` → Number of ratings (optional)

### Churn Model
- `CustomerID` → Unique customer identifier (optional)
- `RecencyDays` → Days since last purchase
- `FrequencyMonths` → Purchase frequency (months)
- `MonetaryValue` → Total monetary value

### Demand Model
- `Date` → Date (weekly granularity recommended)
- `Sales` → Sales value for that period

### Basket Model
- `Invoice` → Transaction/invoice ID
- `ProductName` → Product name or description
- `Category` → Product category (optional, enables cross-category analysis)

## Usage

1. **Individual testing**: Upload the model-specific CSV to test one model at a time
2. **Full pipeline**: Upload `comprehensive_retail_data.csv` to run all 4 models + inventory
3. The wizard auto-detects which models are compatible with the uploaded file
