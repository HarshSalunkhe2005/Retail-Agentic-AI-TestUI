# Retail-Agentic-AI

A modular, agentic retail decision-support system powered by machine learning. Each module provides a distinct intelligence layer that feeds actionable recommendations to retail operations teams.

---

## Modules

### 1. 🏷️ Pricing Intelligence
- **Model**: XGBoost Classifier (200–800 trees)
- **Inputs**: Product rating, rating count, current vs competitor price ratio
- **Actions**: `increase` / `discount` / `hold` / `decrease`
- **Logic**: Confidence-weighted price adjustment with ±20% guardrails

### 2. 👥 Customer Health Intelligence *(Unified)*
- **Models**: KMeans Clustering (k=4) + XGBoost Churn Classifier (400 trees)
- **Inputs**: Recency (1–365 days), Frequency (1–500 orders), Monetary (₹1–100 K)
- **Segmentation output**: Core Actives / Regular Contributors / Lapsing High-Potential / Dormant Low-Yield
- **Churn output**: Probability score + risk tier (Safe / Low / Medium / High)
- **Recommendation**: Segment × risk-tier matrix → specific retention action
- **Analytics**: Segment distribution · Churn-by-segment · Feature importance · Risk heat matrix

### 3. 📈 Demand Forecasting
- **Model**: Facebook Prophet (time-series)
- **Output**: Point forecasts + uncertainty intervals, spike detection
- **Use case**: Inventory planning, 4–24 week horizon

---

## Technology Stack

```
Python · Streamlit · Scikit-learn · XGBoost · Prophet · Plotly · Joblib
```

---

## Model Files

| File | Type | Size |
|------|------|------|
| `models/pricing_model.pkl` | XGBoost Classifier | ~904 KB |
| `models/pricing_scaler.pkl` | RobustScaler | ~1 KB |
| `models/kmeans.pkl` | KMeans (k=4) | ~24 KB |
| `models/rfm_scaler.pkl` | RobustScaler | ~1 KB |
| `models/churn_model.pkl` | XGBoost Classifier | ~354 KB |
| `models/forecast_prophet.pkl` | Prophet | ~22 KB |
