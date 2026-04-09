import streamlit as st;

st.title("Retail Agentic AI System")

st.markdown("""
A data-driven decision support system designed to optimize retail operations through intelligent pricing, customer health intelligence, and demand forecasting.

---

### Problem Context

Retail decision-making involves multiple interdependent factors such as pricing strategy, customer behavior, and demand variability.  
Traditional approaches often rely on static rules or manual judgment, leading to inefficiencies and missed optimization opportunities.

This system addresses these challenges by combining machine learning models with business logic to generate actionable insights.

---

### System Capabilities

**Pricing Intelligence**
- Dynamic price recommendations based on market conditions  
- Competitive positioning analysis  
- Margin-aware decision logic  

**Customer Health Intelligence** *(Unified Module)*
- RFM-based KMeans clustering → behavioural segment (Core / Regular / Lapsing / Dormant)  
- XGBoost churn risk prediction → probability score and risk tier (Safe / Low / Medium / High)  
- Single RFM input feeds both models in parallel for a unified retention recommendation  
- 4-chart analytics dashboard: segment distribution, churn-by-segment, feature importance, risk heat matrix  

**Demand Forecasting** *(Historical + Live)*
- Historical mode: time-series demand prediction using the pre-trained Prophet model  
- Live mode: upload any sales CSV and train a fresh Prophet model in real time  
- Forecast from today (2026-04-07) into the future (4–24 weeks)  
- Agentic spike detection and inventory recommendations  
- Seasonality mode selector (Additive / Multiplicative) with guidance tooltips  

---

### System Workflow

Input Data → Parallel ML Models → Business Rules → Unified Actionable Recommendations

---

### Technology Stack

Python · Scikit-learn · XGBoost · Prophet · Streamlit · Plotly

---

Use the sidebar to navigate between modules.
""")