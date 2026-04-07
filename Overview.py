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

**Demand Forecasting** *(Historical Reference)*
- Time-series demand prediction using a pre-trained Prophet model  
- Detection of seasonal trends and demand spikes  
- Inventory planning support  

**Live Forecasting** *(New — Upload Your Data)*
- Upload any sales CSV and train a fresh Prophet model in real time  
- Forecast from today (2026-04-07) into the future (4–52 weeks)  
- Agentic spike detection and inventory recommendations  
- Download forecast CSV for use in Excel or Tableau  

---

### System Workflow

Input Data → Parallel ML Models → Business Rules → Unified Actionable Recommendations

---

### Technology Stack

Python · Scikit-learn · XGBoost · Prophet · Streamlit · Plotly

---

Use the sidebar to navigate between modules.
""")