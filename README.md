# Retail Agentic AI

A multi-agent retail decision-support system powered by five machine learning models. The platform accepts a single CSV upload, runs up to five specialised AI models in parallel, and surfaces actionable recommendations across pricing, customer health, demand forecasting, market basket analysis, and inventory reorder planning.

---

## Group Details

Project Title: Retail Agentic AI — Production Test UI

Repository: HarshSalunkhe2005/Retail-Agentic-AI-TestUI

Contact: Harsh Salunkhe — github.com/HarshSalunkhe2005

---

## Introduction

Retail businesses generate enormous volumes of transaction data every day. Acting on that data quickly and accurately is the difference between retaining a high-value customer and losing them to a competitor, between avoiding a stockout and disappointing an entire product category. Traditional rule-based dashboards surface numbers but stop short of prescribing actions.

Retail Agentic AI bridges that gap. It is a full-stack application that combines a FastAPI Python backend with a React TypeScript frontend. A user uploads a single CSV file, the system inspects the column schema to determine which of the five models are compatible, and the user selects which models to run. Results are displayed through an interactive dashboard with KPI cards, time-series charts, ranked tables, and plain-language recommendations.

---

## Problem Statement

Retail operations teams typically work with isolated tools: one spreadsheet for pricing reviews, another for cohort analysis, a third for inventory planning. There is no unified interface that ingests a single dataset and generates coordinated intelligence across all four operational domains simultaneously.

Additionally, deploying machine learning models in production requires a stable API layer, a clean data-ingestion contract, and a frontend capable of rendering model outputs without bespoke per-model code. Building and maintaining this infrastructure for five separate models, with automatic column detection, currency inference, and graceful fallback behaviour, is the core engineering challenge this project addresses.

---

## Objectives

1. Deliver a single-file CSV ingestion workflow that automatically detects which AI models are compatible with the uploaded data.
2. Expose each model as an independent REST API endpoint so the frontend and any third-party client can call models individually or in combination.
3. Implement five production-grade ML pipelines covering pricing optimisation, customer churn prediction, demand forecasting, market basket mining, and inventory reorder planning.
4. Build a React frontend that guides users through a five-step wizard and renders results as interactive dashboards.
5. Make the entire stack deployable on Railway with a single configuration file.

---

## Methodology

The project is divided into two phases.

Phase 1 covers model training, which took place offline using Python notebooks. Each model was trained on a synthetic retail dataset that mirrors real-world distributions. The trained artefacts were serialised to disk as pickle files and committed to the models directory. The notebooks are retained at the repository root as model5_basket_analysis_v5.py and model6_finalv.py for reproducibility.

Phase 2 covers inference, which happens at request time. When a user uploads a CSV, the FastAPI backend reads the file, applies a column-detection utility to map the uploaded headers to the expected feature names, scales or encodes features to match the training distribution, calls the loaded model, and formats the prediction into a structured JSON response. The React frontend receives the JSON and renders charts, KPI cards, and recommendation text.

---

## The Five AI Models

### Model 1 — Pricing Intelligence

Algorithm: XGBoost Classifier trained on product rating, review count, and the ratio of current price to competitor price. The classifier predicts one of four discrete price actions: increase, decrease, discount, or hold.

Business logic overlays are applied on top of the model prediction. If the current price is more than ten percent above the competitor price, the action is forced to decrease regardless of the model output. If the current price is more than ten percent below the competitor price, the action is forced to increase. If a product has a rating below 3.5 and is already priced above the competitor, the action is forced to discount.

The recommended price is derived from the base action and the model confidence score, with a floor of 70 percent of the current price and a ceiling of 120 percent of the competitor price.

Model file: models/pricing_model.pkl (XGBoost Classifier, approximately 904 KB)
Scaler file: models/pricing_scaler.pkl (StandardScaler, approximately 1 KB)

API endpoint: POST /api/models/pricing

Required CSV columns: current_price, competitor_price
Optional CSV columns: product_name, rating, rating_count

Output per product: recommended action, recommended price, confidence score, and a summary with counts of each action type.

### Model 2 — Customer Health Intelligence

This module combines two models into a single unified pipeline.

Step 1 — Segmentation: RFM features (Recency in days, Frequency in orders per month, Monetary value in the detected currency) are log-transformed and then scaled with a RobustScaler. A KMeans model with four clusters assigns each customer to a segment. The clusters are ranked by a composite score of monetary value plus frequency minus recency so that the four labels are always assigned in a stable order: Core Actives, Regular Contributors, Lapsing High-Potential, and Dormant / Low-Yield.

Step 2 — Churn Scoring: The same RFM values are used to construct a twelve-feature vector that also includes derived fields such as average order value, estimated lifetime days, and placeholder values for return rate and country. An XGBoost churn classifier with 400 trees produces a probability score. A sigmoid-based formula is applied to convert recency and frequency into a final churn risk percentage.

Segment-specific recommendations are generated from a lookup matrix that maps each segment to a retention action.

Model files: models/kmeans.pkl (KMeans k=4, approximately 24 KB), models/rfm_scaler.pkl (RobustScaler, approximately 1 KB), models/churn_model.pkl (XGBoost Classifier 400 trees, approximately 354 KB)

API endpoint: POST /api/models/churn

Required CSV columns: RecencyDays, FrequencyMonths, MonetaryValue
Optional CSV columns: CustomerID

Output per customer: segment label, churn risk percentage, health score, and a retention recommendation.

### Model 3 — Demand Forecasting

Algorithm: Facebook Prophet, a decomposable time-series model that captures trend, yearly seasonality, and weekly seasonality. Prophet is well-suited to retail data because it handles irregular holiday spikes and supports both additive and multiplicative seasonality modes.

The workflow first attempts to fit a fresh Prophet model on the uploaded data. Outlier rows beyond the first and ninety-ninth percentile are capped before fitting to prevent extreme spikes from distorting the trend. The fitted model then generates a twelve-week forward forecast with upper and lower confidence bands. If the fresh fit fails for any reason, the endpoint falls back to the pre-trained pickle file.

The response includes the full historical series aligned with forecast values plus the twelve future weeks.

Model file: models/forecast_prophet.pkl (pre-trained Prophet, approximately 22 KB)

API endpoint: POST /api/models/demand

Required CSV columns: Date, Sales

Output: per-week forecast values, lower and upper bounds, trend direction, and a summary of training period length.

### Model 4 — Market Basket Analysis

Algorithm: FP-Growth (Frequent Pattern Growth) via the mlxtend library. FP-Growth mines frequent itemsets from transaction data without candidate generation, making it significantly faster than Apriori on large datasets.

The workflow groups uploaded rows by invoice identifier to build a list of per-transaction product sets. A one-hot basket matrix is constructed and passed to FP-Growth with a minimum support threshold of two percent. Association rules are then generated from the frequent itemsets with a minimum confidence threshold of 20 percent. Rules are sorted by lift descending. If the uploaded data has fewer than ten unique invoices, the endpoint falls back to the pre-trained pickle which contains over one thousand pre-mined rules.

Cross-category rules are flagged separately when the antecedent and consequent items belong to different product categories.

Model file: models/model5_basket_analysis.pkl (pre-trained association rules, approximately 158 KB)

API endpoint: POST /api/models/basket

Required CSV columns: Invoice, ProductName
Optional CSV columns: Category

Output: ranked association rules with antecedent, consequent, support, confidence, lift, and a cross-category flag. Supports pagination via limit and offset query parameters.

### Model 5 — Inventory Reorder System

This model acts as an orchestration layer. It consumes the structured outputs of all four upstream models and generates purchase order recommendations for each SKU in the pricing dataset.

The core algorithm combines three operations. First, EOQ (Economic Order Quantity) is calculated using the standard Wilson formula with a fixed ordering cost and a 25 percent annual holding rate. Second, safety stock is calculated using the service-level Z-score for the ABC class of the product. ABC classification assigns products to class A (top 70 percent of revenue), class B (next 20 percent), and class C (remaining 10 percent). Third, a composite risk score is computed from three factors: proximity to stockout based on estimated current stock and daily demand rate, demand variability measured as the coefficient of variation of weekly demand, and churn factor measured as the proportion of high-risk customers in the churn output.

Each SKU is assigned a priority of Critical, High, Medium, or Low based on risk score thresholds, and a reorder reason of STOCKOUT_RISK, LOW_STOCK, HIGH_VELOCITY, or SCHEDULED_REPLENISHMENT.

The LightGBM-based training notebook (model6_finalv.py) at the repository root provides the model training approach for supervised classification of reorder urgency, complementing the rule-based EOQ engine in the API.

API endpoint: POST /api/models/inventory (accepts JSON body containing outputs from all four upstream models)

Output: per-SKU purchase orders with order quantity, PO value, risk score, priority, ABC class, safety stock, and EOQ. Also includes KPI summary cards and chart data for risk distribution, priority breakdown, and demand forecast.

---

## Architecture Overview

The application follows a clean separation between backend inference and frontend presentation.

Backend (FastAPI, Python):

The backend lives in the backend directory. It is a FastAPI application that exposes six REST endpoints under the /api prefix. On startup, all pickle model files are loaded into memory to avoid per-request disk I/O. A column detection utility inspects the uploaded CSV headers against a set of known aliases for each expected feature name, allowing users to upload files with slightly different column naming conventions. A currency detection utility scans the price columns for symbol prefixes or suffixes and returns the detected symbol so the frontend can display prices in the correct currency.

Each model route follows the same pattern: validate the uploaded file, detect columns, load model, build feature matrix, call model, post-process predictions, format response.

Frontend (React, TypeScript, Vite):

The frontend lives in the frontend directory. It is a React 19 application using TypeScript, Vite as the build tool, TailwindCSS v4 for styling, Framer Motion for animations, Recharts for charting, and Zustand for global state management.

The application has three pages. The Home page introduces the platform. The Wizard page guides the user through five sequential steps: upload a CSV, preview the parsed data, select which models to run, watch the models execute with real-time status updates, and explore the results dashboard. The Inventory page is a dedicated view that displays the purchase order table, priority matrix, risk distribution chart, and demand forecast chart generated by the inventory model.

Communication between the frontend and backend uses the browser fetch API via a typed api.ts utility. The backend URL is configured through the VITE_API_URL environment variable, defaulting to http://localhost:8000/api for local development.

Data Flow:

1. User uploads a CSV file through the Wizard upload step.
2. The frontend parses the file in-browser using PapaParse and stores the rows and headers in the Zustand wizard store.
3. The column compatibility check is performed client-side by inspecting the headers against the expected columns for each model.
4. On the Execute step, the frontend sends the raw CSV file as a multipart form POST to each selected model endpoint.
5. Each endpoint returns a JSON response. The results are stored in the wizard store under the corresponding model key.
6. After all four base models complete, the inventory model is called automatically with the four model outputs as the request body.
7. The Results step and the Inventory page render the stored results as interactive dashboards.

---

## Technology Stack

Backend:
- Python 3.11
- FastAPI 0.110 — REST API framework
- Uvicorn — ASGI server
- Pandas 2.x — data ingestion and manipulation
- NumPy 1.26 — numerical operations
- Scikit-learn 1.4 — KMeans, RobustScaler, StandardScaler
- XGBoost 2.x — pricing and churn classification
- Prophet 1.1 — time-series forecasting
- mlxtend 0.22 — FP-Growth association rule mining
- Joblib — model serialisation
- python-multipart — file upload support
- python-dotenv — environment variable loading

Frontend:
- React 19 with TypeScript
- Vite 8 — build tool and dev server
- TailwindCSS v4 — utility-first CSS framework
- Framer Motion 12 — animation library
- Recharts 3 — composable charting library
- Zustand 5 — lightweight global state management
- React Router v7 — client-side routing
- Lucide React — icon library
- PapaParse 5 — in-browser CSV parsing

Deployment:
- Railway — cloud platform (railway.json)
- Procfile — alternative deployment configuration

---

## Project Structure

```
Retail-Agentic-AI-TestUI/
  backend/
    app.py                   FastAPI application entry point
    config.py                Configuration constants and model paths
    requirements.txt         Python dependencies
    .env.example             Environment variable template
    routes/
      pricing.py             Pricing Intelligence endpoint
      churn.py               Customer Health Intelligence endpoint
      demand.py              Demand Forecasting endpoint
      basket.py              Market Basket Analysis endpoint
      inventory.py           Inventory Reorder endpoint
      compatible.py          Column compatibility check endpoint
    utils/
      column_detector.py     CSV header-to-feature-name mapper
      currency_detector.py   Price column currency symbol detector
      data_validation.py     CSV file size and parse validation
      model_loader.py        Lazy pickle loader with caching
      response_formatter.py  Standardised JSON response builders
  frontend/
    src/
      App.tsx                Root component with routing
      main.tsx               Vite entry point
      pages/
        Home.tsx             Landing page
        Wizard.tsx           Five-step wizard page
        Inventory.tsx        Dedicated inventory results page
      components/
        Common/              Navbar, Sidebar, Button, Pagination, SkeletonCard
        Wizard/              StepUpload, StepPreview, StepSelectModels,
                             StepExecute, StepResults
        Dashboard/           KPICard, PricingDashboard, ChurnDashboard,
                             DemandDashboard, BasketDashboard
        Inventory/           InventoryKPIs, POTable, InventoryFilters,
                             PriorityMatrix, RiskDistributionChart,
                             DemandForecastChart
      store/
        wizardStore.ts       Zustand store for wizard state and model results
      hooks/
        useWizard.ts         Step navigation helpers
        useDataProcessing.ts Model execution and result processing logic
      utils/
        api.ts               Typed fetch wrappers for each model endpoint
        csvParser.ts         Column compatibility detection utilities
        chartUtils.ts        Recharts data transformation helpers
    package.json
    vite.config.ts
    tsconfig.json
  models/
    pricing_model.pkl        XGBoost Classifier (pricing)
    pricing_scaler.pkl       StandardScaler (pricing)
    kmeans.pkl               KMeans k=4 (customer segmentation)
    rfm_scaler.pkl           RobustScaler (RFM features)
    churn_model.pkl          XGBoost Classifier (churn)
    forecast_prophet.pkl     Facebook Prophet (demand)
    model5_basket_analysis.pkl  Pre-trained association rules
  sample-data/
    comprehensive_retail_data.csv   1000-row all-models test dataset
    churn_test.csv                  100-row churn-only test dataset
    demand_test.csv                 100-row demand-only test dataset
    basket_test.csv                 80-row basket-only test dataset
    pricing_test.csv                60-row pricing-only test dataset
    inventory_test.csv              100-row end-to-end test dataset
    README.md                       Sample data documentation
  model5_basket_analysis_v5.py     Basket model training notebook
  model6_finalv.py                  Inventory model training notebook
  requirements.txt                  Legacy Streamlit dependencies (reference)
  Procfile                          Heroku/Railway single-service deploy config
  railway.json                      Railway multi-service deploy config
  .gitignore
```

---

## Installation and Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher and npm
- Git

### Clone the Repository

```bash
git clone https://github.com/HarshSalunkhe2005/Retail-Agentic-AI-TestUI.git
cd Retail-Agentic-AI-TestUI
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Copy the environment variable template and edit if needed:

```bash
cp .env.example .env
```

The default configuration works without any changes. The backend reads model files from the models directory at the repository root. The HOST defaults to 0.0.0.0 and PORT defaults to 8000.

### Frontend Setup

```bash
cd frontend
npm install
```

Copy the environment variable template:

```bash
cp .env.example .env
```

The default VITE_API_URL is http://localhost:8000/api, which matches the default backend address.

---

## Running the Application

### Start the Backend

From the repository root or from inside the backend directory:

```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at http://localhost:8000. Interactive API documentation is served automatically at http://localhost:8000/docs.

### Start the Frontend

From inside the frontend directory:

```bash
cd frontend
npm run dev
```

The application will be available at http://localhost:5173.

To build for production:

```bash
npm run build
npm run preview
```

### Verify the Setup

Open http://localhost:8000/health in a browser or with curl to confirm the backend is running. The response should be:

```json
{"status": "ok"}
```

Then open http://localhost:5173 to see the frontend home page.

---

## Sample Data

The sample-data directory contains six CSV files for testing.

comprehensive_retail_data.csv is the recommended file for full integration testing. It contains 1000 rows covering a full calendar year (2024-01-01 to 2024-12-31) with 25 unique customers across 56 products in five categories. Every column required by all four base models is present in a single file. When this file is uploaded, all five models (including inventory) will be available for selection.

Column schema of the comprehensive dataset:

- Date — transaction date in YYYY-MM-DD format (used by Demand Forecasting)
- Invoice — invoice identifier in INV-XXXXX format (used by Market Basket Analysis)
- ProductName — product description string (used by Basket and Pricing)
- Category — product category string (Electronics, Apparel, Home, Food, Health)
- Quantity — integer transaction quantity
- Sales — numeric sales value without currency symbols (used by Demand Forecasting)
- current_price — numeric current selling price in lowercase snake case (used by Pricing)
- competitor_price — numeric competitor reference price in lowercase snake case (used by Pricing)
- Rating — float product rating between 1 and 5 (used by Pricing)
- CustomerID — customer identifier in CUST-XXX format (used by Churn)
- RecencyDays — integer days since last purchase (used by Churn)
- FrequencyMonths — float average orders per month (used by Churn)
- MonetaryValue — numeric lifetime spend value (used by Churn)

Important: current_price and competitor_price must be lowercase and snake case for the pricing model column detector to recognise them. Do not add currency symbols to any numeric column.

The five individual test datasets (churn_test.csv, demand_test.csv, basket_test.csv, pricing_test.csv, inventory_test.csv) are designed for isolated model testing and contain only the columns relevant to their respective model.

---

## Usage Workflow

Step 1 — Upload: Click Launch Wizard on the home page. Drag and drop one of the sample CSV files onto the upload zone, or click to browse. The application parses the file in the browser and displays a confirmation message.

Step 2 — Preview: The wizard advances to a data preview grid showing the first rows of the uploaded file and a list of detected column names.

Step 3 — Select Models: The compatibility check runs automatically. Models for which the required columns are present are shown as available with a green indicator. Models with missing required columns are shown as unavailable. The user can deselect any available model. All compatible models are selected by default.

Step 4 — Execute: Clicking Run Analysis sends the CSV file to each selected model endpoint. A skeleton loader animates while each model is running. Status indicators update in real time as each model completes. After all four base models finish, the inventory model is called automatically.

Step 5 — Results: Individual model dashboards are shown in tabs. Each dashboard contains KPI cards, one or more charts, and a ranked results table. A link to the dedicated Inventory page is provided at the bottom of the results step.

Inventory Page: The inventory page displays the purchase order table with filtering by priority and category, a priority matrix chart, a risk distribution histogram, and the demand forecast chart from the demand model output.

---

## Deployment

### Railway (Recommended)

The railway.json file at the repository root configures a two-service deployment.

The backend service uses the backend directory as its root and starts with:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port $PORT
```

The frontend service uses the frontend directory as its root, builds with npm install and npm run build, and starts with npm run preview.

Set the VITE_API_URL environment variable on the frontend service to the Railway-assigned URL of the backend service. Set PORT on the backend service to whatever port Railway allocates (Railway sets this automatically).

### Procfile (Single-Service)

The Procfile at the repository root is provided for platforms that expect a single web process. It installs backend dependencies and starts the uvicorn server:

```
web: cd backend && pip install -r requirements.txt && python -m uvicorn app:app --host 0.0.0.0 --port $PORT
```

When using the Procfile for single-service deployment, the frontend must be built separately and served as static files, or deployed as a separate service.

---

## Testing and Validation

### Manual Integration Testing

The most straightforward validation approach is to upload comprehensive_retail_data.csv through the wizard, run all five models, and verify that each dashboard renders results without errors. The sample-data/README.md provides a validation checklist for this workflow.

### API Testing with the Interactive Docs

The FastAPI automatic documentation at http://localhost:8000/docs exposes a Try It Out button for each endpoint. This allows sending test requests directly from the browser with the bundled sample CSV files.

Each individual model endpoint can be tested independently with its corresponding test CSV:

- POST /api/models/pricing with pricing_test.csv
- POST /api/models/churn with churn_test.csv
- POST /api/models/demand with demand_test.csv
- POST /api/models/basket with basket_test.csv
- POST /api/models/inventory with the JSON body produced by the four upstream models

### Column Compatibility Validation

The column detector utility maps a wide range of aliases for each expected feature name. For example, the Demand model recognises the date column as Date, date, transaction_date, order_date, or sale_date, and the sales column as Sales, sales, Revenue, revenue, Amount, amount, or Value. This tolerance means that real-world CSV exports from different retail POS systems are likely to work without manual column renaming.

### Model Output Validation

Each response formatter enforces a consistent JSON schema regardless of the input data size. Required keys are always present; optional keys such as product_name or customer_id are present only when the corresponding input column was found. All numeric values are rounded to a fixed number of decimal places. The churn endpoint deduplicates customers by CustomerID so the output never contains duplicate rows for the same customer.

---

## Industry Relevance and Use Cases

Pricing Intelligence is directly applicable to e-commerce retailers and marketplace sellers who need to respond to competitor price changes faster than a manual review cycle allows. The model can be retrained weekly on fresh price data to keep the decision boundary current.

Customer Health Intelligence addresses the universal retail problem of customer attrition. The RFM segmentation approach is well-established in the CRM industry, and combining it with a gradient-boosted churn classifier produces both interpretable segment labels and a numeric risk score that can be used to prioritise marketing spend.

Demand Forecasting with Prophet is suitable for any retailer with weekly sales history. The model handles multiple seasonality patterns automatically and produces uncertainty bounds that can be used directly in safety stock calculations.

Market Basket Analysis with FP-Growth is used by supermarkets and online retailers for shelf placement optimisation, cross-sell recommendation engines, and promotional bundle design. The cross-category flag in the output highlights rules that span category boundaries, which are often the most actionable for store layout decisions.

Inventory Reorder Planning integrates the outputs of all four upstream models into a coherent procurement recommendation. The combination of EOQ, safety stock, ABC classification, and basket lift scoring creates a prioritised purchase order list that reflects both supply-side economics and demand-side customer behaviour simultaneously.

Together, the five models cover the complete retail decision cycle: set the right price, identify which customers are at risk, forecast how much product will be needed, understand which products are bought together, and ensure the right stock is ordered at the right time.

---

## Contributing

1. Fork the repository and create a branch from main.
2. Make changes in the backend or frontend directory as appropriate.
3. For backend changes, run the API locally with uvicorn and test the affected endpoint using the interactive docs.
4. For frontend changes, run npm run dev and verify the wizard workflow end-to-end.
5. Ensure that column detection and response formatting remain consistent with the existing JSON schema so that the frontend dashboards continue to render without modification.
6. Open a pull request with a clear description of the change and the model or UI area it affects.

Code style conventions:
- Python: follow the existing module structure with one route file per model. Keep business logic in the route file and shared utilities in the utils directory.
- TypeScript: use Zustand useShallow selectors for component subscriptions and useWizardStore.getState() inside callbacks to avoid re-render loops.
- All numeric outputs must be rounded to two or four decimal places using the response_formatter utilities.

---

## Model Files Reference

The following pickle files must be present in the models directory at the repository root for the backend to start without warnings:

- models/pricing_model.pkl — XGBoost Classifier for pricing action prediction (approximately 904 KB)
- models/pricing_scaler.pkl — StandardScaler fitted on rating, rating count, and price ratio features (approximately 1 KB)
- models/kmeans.pkl — KMeans clustering model with four clusters fitted on log-transformed RFM features (approximately 24 KB)
- models/rfm_scaler.pkl — RobustScaler fitted on log-transformed RFM features (approximately 1 KB)
- models/churn_model.pkl — XGBoost Classifier with 400 trees for churn probability prediction (approximately 354 KB)
- models/forecast_prophet.pkl — Facebook Prophet model trained on retail sales time-series data (approximately 22 KB)
- models/model5_basket_analysis.pkl — Pre-trained association rules DataFrame used as fallback when uploaded data has too few transactions (approximately 158 KB)

The inventory model (Model 5) does not use a pickle file. It operates entirely on the structured JSON outputs of the four upstream models using EOQ and safety stock formulas.

---

## Project Outcome Status

All five models are fully operational. The FastAPI backend serves all six endpoints. The React frontend completes the full five-step wizard workflow. The comprehensive sample dataset enables end-to-end testing of all models in a single session. The application is configured for one-command deployment on Railway.

The model training notebooks are retained in the repository root to document the offline training process. The inventory model training notebook (model6_finalv.py) demonstrates the LightGBM-based supervised classification approach that underpins the urgency scoring logic in the inventory API route.

---

## Conclusion

Retail Agentic AI demonstrates how a small number of well-chosen machine learning models, connected through a clean REST API and presented through an intuitive wizard UI, can turn a raw transaction CSV into a coordinated set of actionable recommendations covering pricing, customer retention, demand planning, cross-sell opportunities, and procurement. The modular architecture makes it straightforward to add new models, update existing model artefacts, or extend the frontend to display new result types without breaking the existing pipelines.
