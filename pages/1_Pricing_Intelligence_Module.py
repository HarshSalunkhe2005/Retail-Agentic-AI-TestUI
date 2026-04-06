import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os
import plotly.express as px

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
EMBEDDED_LABEL_MAP = {0: 'decrease', 1: 'discount', 2: 'hold', 3: 'increase'}

BASE_ADJ = {
    'increase': +0.10,
    'decrease': -0.08,
    'discount': -0.15,
    'hold': 0.00,
}

ACTION_COLORS = {
    'increase': '#10b981',
    'decrease': '#ef4444',
    'discount': '#f59e0b',
    'hold': '#6b7280',
}

ACTION_ICONS = {
    'increase': '📈',
    'decrease': '📉',
    'discount': '🏷️',
    'hold': '⏸️',
}

ACTION_DESCRIPTION = {
    'increase': 'Proven demand with headroom — capture margin.',
    'decrease': 'Overpriced or weak rating — reduce to stay competitive.',
    'discount': 'Good product, low traction — discount to boost volume.',
    'hold': 'Balanced signal — maintain current price.',
}

@st.cache_resource
def load_model():
    for base in ["models", ""]:
        model_path = os.path.join(base, "pricing_model.pkl")
        scaler_path = os.path.join(base, "pricing_scaler.pkl")
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                model = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
                return model, scaler
            except Exception as e:
                st.error(f"Failed to load model files: {e}")
                return None, None
    st.error(
        "Model files not found. Ensure `pricing_model.pkl` and "
        "`pricing_scaler.pkl` are present in the `models/` directory."
    )
    return None, None

model, scaler = load_model()

# ─────────────────────────────────────────
# FULL WIDTH FIX
# ─────────────────────────────────────────
st.markdown("""
<style>
.block-container {
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 100%;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────
st.title("🏷️ Price Intelligence Module")
st.caption("Agentic Supply Chain | XGBoost Dynamic Pricing — 4-Action Engine")

# ─────────────────────────────────────────
# LAYOUT
# ─────────────────────────────────────────
left, right = st.columns([1, 2], gap="large")

# ───────── LEFT (INPUTS + ANALYTICS TITLE)
with left:
    st.subheader("Product Parameters")

    rating = st.slider("Product Rating", 1.0, 5.0, 4.2, 0.1)
    rating_count = st.number_input("Rating Count (Volume)", 0, 100000, 120)
    current_price = st.number_input("Current Price (£)", 0.01, 10000.0, 45.0)
    competitor_price = st.number_input("Competitor Price (£)", 0.01, 10000.0, 50.0)

    ratio = current_price / competitor_price if competitor_price > 0 else 0

    if ratio > 1.1:
        pos = "Overpriced"
        color = "#ef4444"
    elif ratio < 0.9:
        pos = "Underpriced"
        color = "#10b981"
    else:
        pos = "Competitive"
        color = "#f59e0b"

    st.markdown(f"<small style='color:{color}'>📍 {pos}</small>", unsafe_allow_html=True)
    st.markdown(f"<small>Price Ratio: {ratio:.3f}</small>", unsafe_allow_html=True)

    run = st.button("Generate Pricing Strategy")

    st.markdown("---")
    st.subheader("Analytics")

# ───────── RIGHT (OUTPUT)
with right:
    if run and model and scaler:

        X = np.array([[rating, rating_count, ratio]])
        X_scaled = scaler.transform(X)

        action_id = int(model.predict(X_scaled)[0])
        probs = model.predict_proba(X_scaled)[0]
        confidence = float(probs.max())
        action = EMBEDDED_LABEL_MAP[action_id]

        if rating < 3 and ratio > 1:
            action = "decrease"

        if action == "hold":
            rec_price = current_price
        else:
            adj = BASE_ADJ[action] * confidence
            rec_price = current_price * (1 + adj)
            rec_price = max(rec_price, current_price * 0.7)
            rec_price = min(rec_price, competitor_price * 1.2)

        delta = rec_price - current_price

        # OUTPUT CARD
        st.markdown(f"""
        <div style="background:#1f2937;padding:25px;border-radius:12px;
                    border-left:6px solid {ACTION_COLORS[action]};">
            <h2 style="color:{ACTION_COLORS[action]}">
                {ACTION_ICONS[action]} {action.upper()}
            </h2>
            <p>{ACTION_DESCRIPTION[action]}</p>
        </div>
        """, unsafe_allow_html=True)

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Current", f"£{current_price:.2f}")
        c2.metric("Competitor", f"£{competitor_price:.2f}")
        c3.metric("Recommended", f"£{rec_price:.2f}", f"{delta:+.2f}")
        c4.metric("Confidence", f"{confidence:.1%}")

    elif run:
        st.error("Model not loaded")

    else:
        st.info("Set parameters and generate strategy")

# ─────────────────────────────────────────
# 🔥 ANALYTICS FULL WIDTH (FIXED)
# ─────────────────────────────────────────
try:
    df = pd.read_csv("powerbi/pricing_data.csv")

    st.markdown("---")

    row1_col1, row1_col2 = st.columns(2)
    row2_col1, row2_col2 = st.columns(2)

    with row1_col1:
        fig1 = px.bar(
            x=["Current", "Competitor", "Recommended"],
            y=[
                df["current_price"].mean(),
                df["competitor_price"].mean(),
                df["recommended_price"].mean()
            ],
            text_auto=True,
            title="Average Price Comparison"
        )
        st.plotly_chart(fig1, use_container_width=True)

    with row1_col2:
        fig2 = px.pie(df, names="action", title="Action Distribution")
        st.plotly_chart(fig2, use_container_width=True)

    with row2_col1:
        fig3 = px.pie(df, names="positioning", title="Market Positioning")
        st.plotly_chart(fig3, use_container_width=True)

    with row2_col2:
        fig4 = px.scatter(
            df,
            x="current_price",
            y="recommended_price",
            color="action",
            title="Price Adjustment Mapping"
        )
        st.plotly_chart(fig4, use_container_width=True)

except FileNotFoundError:
    st.info("Analytics data not available. Place `pricing_data.csv` in the `powerbi/` directory to enable charts.")
except Exception as e:
    st.warning(f"Could not load analytics data: {e}")

st.sidebar.markdown("**SIT Pune | Group 18**")