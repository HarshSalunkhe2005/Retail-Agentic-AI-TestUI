import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os

st.set_page_config(page_title="Price Intelligence", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #0e1117; }
    .stMetric { background-color: #1f2937; padding: 15px; border-radius: 10px; border: 1px solid #374151; }
    .stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #2563eb; color: white; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

EMBEDDED_LABEL_MAP = {0: 'decrease', 1: 'discount', 2: 'hold', 3: 'increase'}

BASE_ADJ = {
    'increase': +0.10,
    'decrease': -0.08,
    'discount': -0.15,
    'hold'    :  0.00,
}

ACTION_COLORS = {
    'increase': '#10b981',
    'decrease': '#ef4444',
    'discount': '#f59e0b',
    'hold'    : '#6b7280',
}

ACTION_ICONS = {
    'increase': '📈',
    'decrease': '📉',
    'discount': '🏷️',
    'hold'    : '⏸️',
}

ACTION_DESCRIPTION = {
    'increase': 'Proven demand with headroom — capture margin.',
    'decrease': 'Known quality issue or significantly overpriced — reduce to stay competitive.',
    'discount': 'Good product, low market exposure — discount to build volume.',
    'hold'    : 'Insufficient signal or mid-range rating — maintain current price.',
}

@st.cache_resource
def load_pricing_assets():
    for base in [os.path.join("models"), ""]:
        try:
            model  = joblib.load(os.path.join(base, "pricing_model.pkl"))
            scaler = joblib.load(os.path.join(base, "pricing_scaler.pkl"))
            return model, scaler
        except Exception:
            continue
    return None, None

st.title("🏷️ Price Intelligence Module")
st.caption("Agentic Supply Chain | XGBoost Dynamic Pricing — 4-Action Engine")

pricing_model, scaler = load_pricing_assets()

col_params, col_metrics = st.columns([1, 2], gap="large")

with col_params:
    st.subheader("Product Parameters")

    rating = st.slider("Product Rating", 1.0, 5.0, 4.2, 0.1)
    rating_count = st.number_input("Rating Count (Volume)", 0, 100000, 120, 10)
    current_price = st.number_input("Current Price (£)", 0.01, 10000.0, 45.0, 0.5)
    competitor_price = st.number_input("Competitor Price (£)", 0.01, 10000.0, 50.0, 0.5)

    # ✅ FIXED ratio
    price_comp_ratio = round(current_price / competitor_price, 3) if competitor_price > 0 else 0

        # ✅ Price Positioning
    if price_comp_ratio > 1.1:
        positioning = "Overpriced"
        pos_color = "#ef4444"
    elif price_comp_ratio < 0.9:
        positioning = "Underpriced"
        pos_color = "#10b981"
    else:
        positioning = "Competitive"
        pos_color = "#f59e0b"

    st.markdown(
        f"<small style='color:{pos_color}'>📍 Positioning: <b>{positioning}</b></small>",
        unsafe_allow_html=True
    )

    ratio_color = "#10b981" if price_comp_ratio <= 1.0 else "#ef4444"
    st.markdown(
        f"<small style='color:{ratio_color}'>📊 Price Ratio: <b>{price_comp_ratio:.3f}</b></small>",
        unsafe_allow_html=True
    )

    st.divider()
    predict_btn = st.button("🧠 Generate Pricing Strategy")

with col_metrics:
    if predict_btn:
        if pricing_model and scaler:
            with st.spinner("Computing pricing strategy..."):

                input_features = np.array([[rating, rating_count, price_comp_ratio]])
                scaled_input   = scaler.transform(input_features)

                action_id = int(pricing_model.predict(scaled_input)[0])
                probas = pricing_model.predict_proba(scaled_input)[0]
                confidence = float(probas.max())
                action = EMBEDDED_LABEL_MAP.get(action_id, "hold")

                # ✅ RULE OVERRIDE (MAIN FIX)
                if rating < 3 and price_comp_ratio > 1:
                    action = "decrease"

                # ✅ FINAL LOGIC
                if action == "hold":
                    recommended_price = current_price
                    adj_pct = 0.0
                else:
                    adj_pct = round(BASE_ADJ[action] * confidence, 4)
                    recommended_price = round(current_price * (1 + adj_pct), 2)

                    min_price = current_price * 0.70
                    max_price = competitor_price * 1.20

                    recommended_price = max(recommended_price, min_price)
                    recommended_price = min(recommended_price, max_price)
                    recommended_price = round(recommended_price, 2)

                price_delta = recommended_price - current_price
                color = ACTION_COLORS[action]
                icon = ACTION_ICONS[action]

            st.subheader("Agent Output")
            st.markdown(f"""
                <div style="background-color:#1f2937; padding:28px; border-radius:10px;
                            border-left:8px solid {color};">
                    <h2 style="color:{color};">{icon} {action.upper()}</h2>
                    <p><b>Agent Recommendation:</b> {ACTION_DESCRIPTION[action]}</p>
                </div>
            """, unsafe_allow_html=True)

            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Current Price", f"£{current_price:.2f}")
            m2.metric("Competitor Price", f"£{competitor_price:.2f}")
            m3.metric("Recommended Price", f"£{recommended_price:.2f}", f"£{price_delta:+.2f}")
            m4.metric("Confidence", f"{confidence:.1%}")

        else:
            st.error("Model files missing.")

    else:
        st.info("👈 Set parameters and click Generate")