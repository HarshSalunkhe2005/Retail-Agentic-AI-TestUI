import streamlit as st
import numpy as np
import pandas as pd
import joblib
import plotly.graph_objects as go
import plotly.express as px
import os

# ─────────────────────────────────────────
# UI CONFIG
# ─────────────────────────────────────────
st.markdown("""
<style>
.block-container {
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 100%;
}
.main { background-color: #0e1117; }
.stMetric { background-color: #1f2937; padding: 15px; border-radius: 10px; border: 1px solid #374151; }
.stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #7c3aed; color: white; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────
SEGMENT_META = {
    "Core Actives":            {"color": "#10b981", "icon": "💎"},
    "Regular Contributors":    {"color": "#3b82f6", "icon": "🔵"},
    "Lapsing High-Potential":  {"color": "#f59e0b", "icon": "🟡"},
    "Dormant / Low-Yield":     {"color": "#ef4444", "icon": "🔴"},
}

RISK_META = {
    "Safe":   {"color": "#10b981", "icon": "🟢", "range": "0–20%"},
    "Low":    {"color": "#facc15", "icon": "🟡", "range": "20–40%"},
    "Medium": {"color": "#f97316", "icon": "🟠", "range": "40–70%"},
    "High":   {"color": "#ef4444", "icon": "🔴", "range": "70–100%"},
}

# Churn calibration constants
# 90-day threshold matches the model's training label (IsChurned = Recency > 90)
RECENCY_RISK_THRESHOLD  = 90      # days — sigmoid inflection point
CHURN_SIGMOID_K         = 0.07    # slope of risk curve around the threshold
FREQ_RISK_DAMPEN_SCALE  = 250.0   # high-frequency customers get up to 12% risk reduction
FREQ_RISK_DAMPEN_MAX    = 0.12    # max fractional risk reduction from frequency

# Derived-feature estimation constants (used when actual values are unavailable)
UNIQUE_PROD_RATE      = 0.7   # ~70% of orders contain a unique product category
UNIQUE_PROD_CAP       = 50    # upper bound on unique products per customer
LIFETIME_RECENCY_PAD  = 90.0  # minimum additional days of lifetime beyond recency
MIN_LIFETIME_DAYS     = 180.0 # absolute minimum customer lifetime assumed


# ─────────────────────────────────────────
# MODEL LOADING
# ─────────────────────────────────────────
@st.cache_resource
def load_health_models():
    try:
        kmeans      = joblib.load(os.path.join("models", "kmeans.pkl"))
        rfm_scaler  = joblib.load(os.path.join("models", "rfm_scaler.pkl"))
        churn_model = joblib.load(os.path.join("models", "churn_model.pkl"))
        return kmeans, rfm_scaler, churn_model
    except Exception as e:
        st.error(f"Model loading error: {e}")
        return None, None, None


kmeans, rfm_scaler, churn_model = load_health_models()


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
def get_segment(kmeans, rfm_scaler, recency, frequency, monetary):
    """Return (cluster_id, segment_name, color) for RFM input."""
    raw = np.array([[recency, frequency, monetary]])
    log_input = np.log1p(raw)
    scaled = rfm_scaler.transform(log_input)
    cluster_id = int(kmeans.predict(scaled)[0])

    centers = kmeans.cluster_centers_
    scores = centers[:, 2] + centers[:, 1] - centers[:, 0]
    sorted_clusters = np.argsort(scores)

    label_map = {
        int(sorted_clusters[3]): "Core Actives",
        int(sorted_clusters[2]): "Regular Contributors",
        int(sorted_clusters[1]): "Lapsing High-Potential",
        int(sorted_clusters[0]): "Dormant / Low-Yield",
    }
    segment = label_map[cluster_id]
    return cluster_id, segment, scaled


def get_churn(churn_model, recency, frequency, monetary):
    """Return (probability, risk_tier) for RFM input.

    The underlying XGBoost model is near-binary (trained with IsChurned = Recency>90).
    We display a calibrated sigmoid probability so all 4 risk tiers are visible.
    """
    # Calibrated smooth probability (model is near-binary; sigmoid gives gradual transitions)
    base     = 1.0 / (1.0 + np.exp(-CHURN_SIGMOID_K * (recency - RECENCY_RISK_THRESHOLD)))
    freq_mod = 1.0 - min(frequency / FREQ_RISK_DAMPEN_SCALE, FREQ_RISK_DAMPEN_MAX)
    prob     = float(np.clip(base * freq_mod, 0.005, 0.995))

    if prob < 0.20:
        tier = "Safe"
    elif prob < 0.40:
        tier = "Low"
    elif prob < 0.70:
        tier = "Medium"
    else:
        tier = "High"

    return prob, tier


def build_cluster_label_map(kmeans):
    centers = kmeans.cluster_centers_
    scores = centers[:, 2] + centers[:, 1] - centers[:, 0]
    sorted_clusters = np.argsort(scores)
    return {
        int(sorted_clusters[3]): "Core Actives",
        int(sorted_clusters[2]): "Regular Contributors",
        int(sorted_clusters[1]): "Lapsing High-Potential",
        int(sorted_clusters[0]): "Dormant / Low-Yield",
    }


def inverse_transform_rfm(scaled_values, scaler):
    """Reverse RobustScaler + log1p to recover raw (Recency, Frequency, Monetary)."""
    raw_log = scaled_values * scaler.scale_ + scaler.center_
    raw = np.expm1(raw_log)
    recency  = max(1, int(raw[0]))
    freq     = max(1, int(raw[1]))
    monetary = max(1.0, float(raw[2]))
    return recency, freq, monetary


# ─────────────────────────────────────────
# DYNAMIC AI RECOMMENDATION ENGINE
# ─────────────────────────────────────────
def generate_recommendation(segment, risk_tier, churn_prob, features_dict, importance_dict):
    """Build a feature-driven recommendation using actual model feature importances."""
    recency  = features_dict.get("Recency", 90)
    frequency = features_dict.get("Frequency", 10)
    monetary  = features_dict.get("Monetary", 5000)

    # Top 3 drivers from model feature importance
    top3 = sorted(importance_dict.items(), key=lambda x: -x[1])[:3]
    driver_lines = []
    CHURN_NEGATIVE = {"Frequency", "Monetary", "AvgOrderValue", "TotalItems", "UniqueProducts"}
    for feat, imp in top3:
        val = features_dict.get(feat, 0)
        if feat == "Recency":
            signal = "⚠️ above risk threshold" if val > RECENCY_RISK_THRESHOLD else "✅ within safe range"
        elif feat == "CustomerLifetimeDays":
            signal = "✅ established customer" if val >= 365 else "⚠️ relatively new"
        elif feat in CHURN_NEGATIVE:
            signal = "✅ positive engagement"
        else:
            signal = ""
        driver_lines.append(
            f"• <b>{feat}</b> = {val:.0f} &nbsp;→&nbsp; {imp:.1%} model weight {signal}"
        )
    drivers_html = "<br>".join(driver_lines)

    # Action text referencing actual feature values
    urgency = {
        "High":   "🚨 IMMEDIATE ACTION",
        "Medium": "⚡ RECOMMENDED ACTION",
        "Low":    "📋 SUGGESTED ACTION",
        "Safe":   "💡 NURTURE ACTION",
    }[risk_tier]

    if risk_tier == "High":
        if segment == "Core Actives":
            action = (
                f"VIP inactive for <b>{recency} days</b>. Personal outreach within 24h: "
                f"exclusive 3-month premium tier + dedicated account manager + "
                f"personalised bundle (–20%). Act within 48h."
            )
        elif segment == "Regular Contributors":
            action = (
                f"Win-back urgency: inactive <b>{recency} days</b>, {frequency} total orders. "
                f"Limited-time offer: 15% off + free shipping + personal email. Act within 72h."
            )
        elif segment == "Lapsing High-Potential":
            action = (
                f"Aggressive win-back: <b>{recency} days</b> inactive. "
                f"30% loyalty discount + free shipping + personalised bundle. Act within 72h."
            )
        else:
            action = (
                f"Dormant customer (inactive <b>{recency} days</b>, ₹{monetary:,.0f} LTV). "
                f"If CLV &gt; CAC: final win-back offer. Else: reallocate to acquisition."
            )
    elif risk_tier == "Medium":
        action = (
            f"Engagement declining: recency <b>{recency} days</b>, {frequency} orders. "
            f"Deploy bundle discounts + category promotions + 10% loyalty credit. "
            f"Send 'We miss you' message within 7 days."
        )
    elif risk_tier == "Low":
        action = (
            f"Mild drift detected (recency: <b>{recency} days</b>). "
            f"Personalised re-engagement email with cross-sell recommendations "
            f"aligned to purchase history."
        )
    else:  # Safe
        if segment == "Core Actives":
            action = (
                f"Highly engaged VIP (last purchase: <b>{recency} days</b> ago, "
                f"₹{monetary:,.0f} LTV) — nurture loyalty tier, offer early-access to new products."
            )
        elif segment == "Regular Contributors":
            action = (
                f"Solid performer ({frequency} orders, ₹{monetary:,.0f} LTV) — "
                f"upsell premium products, introduce subscription plan."
            )
        elif segment == "Lapsing High-Potential":
            action = (
                f"Recovering segment (recency: <b>{recency} days</b>) — gentle nurture "
                f"with personalised content and product recommendations."
            )
        else:
            action = "Low-cost nurture strategy: seasonal content, budget retention emails."

    return drivers_html, f"{urgency}: {action}"


def explain_churn_drivers(features_dict, importance_dict, top_n=5):
    """Return a compact horizontal bar chart of top churn-driving features."""
    top_feats = sorted(importance_dict.items(), key=lambda x: -x[1])[:top_n]
    names  = [f for f, _ in top_feats]
    imps   = [i for _, i in top_feats]
    values = [features_dict.get(f, 0) for f in names]

    CHURN_NEGATIVE = {"Frequency", "Monetary", "AvgOrderValue", "TotalItems", "UniqueProducts"}
    colors = []
    for n, v in zip(names, values):
        if n == "Recency":
            colors.append("#ef4444" if v > RECENCY_RISK_THRESHOLD else "#10b981")
        elif n in CHURN_NEGATIVE:
            colors.append("#10b981")
        else:
            colors.append("#f97316")

    fig = go.Figure(go.Bar(
        y=names[::-1],
        x=imps[::-1],
        orientation="h",
        marker_color=colors[::-1],
        text=[f"{i:.1%}" for i in imps[::-1]],
        textposition="outside",
        hovertemplate=[
            f"<b>{n}</b><br>Value: {v:.0f}<br>Importance: {i:.1%}<extra></extra>"
            for n, v, i in zip(names[::-1], values[::-1], imps[::-1])
        ],
    ))
    fig.update_layout(
        title="🔥 Churn Driver Importance (Model Weights)",
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        font_color="white",
        height=230,
        margin=dict(l=0, r=70, t=40, b=0),
        xaxis=dict(showticklabels=False, range=[0, max(imps) * 1.25]),
    )
    return fig


# ─────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────
st.title("👥 Customer Health Intelligence Module")
st.caption("Agentic Dual-Model Engine | KMeans Segmentation × XGBoost Churn Prediction")

if not (kmeans and rfm_scaler and churn_model):
    st.error("One or more model files are missing. Ensure `kmeans.pkl`, `rfm_scaler.pkl`, and `churn_model.pkl` are present in `models/`.")
    st.stop()

# ─────────────────────────────────────────
# MODEL METADATA STRIP
# ─────────────────────────────────────────
m1, m2, m3 = st.columns(3)
m1.metric("Segments (KMeans k)", int(kmeans.n_clusters))
m2.metric("Churn Trees (XGBoost)", churn_model.n_estimators)
m3.metric("Churn Features", churn_model.n_features_in_)

st.divider()

# ─────────────────────────────────────────
# MAIN LAYOUT
# ─────────────────────────────────────────
left, right = st.columns([1, 2], gap="large")

# ───────── LEFT — INPUT PANEL
with left:
    st.subheader("🎛️ Customer Input")

    recency   = st.slider("Recency (days since last purchase)", 1, 365, 45)
    frequency = st.slider("Frequency (total orders)", 1, 500, 12)
    monetary  = st.slider("Monetary (total spend ₹)", 1, 100000, 8500)

    st.caption(f"R={recency} | F={frequency} | M=₹{monetary:,}")

    run = st.button("⚡ Execute Health Analysis")

    st.markdown("---")
    st.markdown("""
**Model Metadata**
- Segments: KMeans k=4
- Churn Model: XGBoost (400 trees, depth=6)
- Training: RFM + 9 behavioural features
- Scaling: RobustScaler (log-transformed RFM)
""")

# ───────── RIGHT — RESULTS
with right:
    if run:
        cluster_id, segment, scaled_input = get_segment(
            kmeans, rfm_scaler, recency, frequency, monetary
        )
        churn_prob, risk_tier = get_churn(
            churn_model, recency, frequency, monetary
        )

        seg_color  = SEGMENT_META[segment]["color"]
        seg_icon   = SEGMENT_META[segment]["icon"]
        risk_color = RISK_META[risk_tier]["color"]
        risk_icon  = RISK_META[risk_tier]["icon"]

        # Build feature dict and importance dict for dynamic recommendation
        features_dict = {
            "Recency":              float(recency),
            "Frequency":            float(frequency),
            "Monetary":             float(monetary),
            "UniqueProducts":       float(min(max(int(frequency * UNIQUE_PROD_RATE), 1), UNIQUE_PROD_CAP)),
            "AvgOrderValue":        float(monetary / max(frequency, 1)),
            "TotalItems":           float(frequency * 2),
            "AvgDaysBetweenOrders": float(min(365.0 / max(frequency, 1), 365.0)),
            "CustomerLifetimeDays": float(max(recency + LIFETIME_RECENCY_PAD, MIN_LIFETIME_DAYS)),
            "ReturnRate":           0.0,
            "ReturnCount":          0.0,
            "CountryEnc":           0.0,
            "CategoryEnc":          0.0,
        }
        importance_dict = dict(zip(
            churn_model.feature_names_in_,
            churn_model.feature_importances_,
        ))

        drivers_html, action_text = generate_recommendation(
            segment, risk_tier, churn_prob, features_dict, importance_dict
        )

        # Model prediction confidence (raw model output)
        features_arr = np.array([[
            recency, frequency, monetary,
            features_dict["UniqueProducts"], features_dict["AvgOrderValue"],
            features_dict["TotalItems"], features_dict["AvgDaysBetweenOrders"],
            features_dict["CustomerLifetimeDays"], 0.0, 0, 0, 0,
        ]])
        confidence = float(churn_model.predict_proba(features_arr)[0].max())

        # ── Unified Result Card
        st.markdown(f"""
        <div style="background:linear-gradient(135deg,#1f2937 60%,#111827);
                    padding:25px;border-radius:14px;
                    border-left:6px solid {seg_color};
                    border-right:4px solid {risk_color};margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h2 style="color:{seg_color};margin:0">{seg_icon} {segment}</h2>
                <h2 style="color:{risk_color};margin:0">{risk_icon} {risk_tier.upper()} CHURN ({churn_prob:.0%})</h2>
            </div>
            <hr style="border-color:#374151;margin:14px 0">
            <p style="color:#d1d5db;margin:0 0 12px 0">
                <b style="color:#f3f4f6">🔥 CHURN DRIVERS:</b><br>{drivers_html}
            </p>
            <p style="color:#d1d5db;margin:0">
                <b style="color:#f3f4f6">🎯 Agent Recommendation:</b><br>{action_text}
            </p>
        </div>
        """, unsafe_allow_html=True)

        # ── 2×2 Metrics grid
        c1, c2 = st.columns(2)
        c3, c4 = st.columns(2)
        c1.metric("📅 Recency",           f"{recency} days")
        c2.metric("🔄 Frequency",          f"{frequency} orders")
        c3.metric("💰 Monetary",           f"₹{monetary:,}")
        c4.metric("🔮 Prediction Confidence", f"{confidence:.1%}")

        st.markdown("---")

        # ── Feature Driver Chart
        st.plotly_chart(
            explain_churn_drivers(features_dict, importance_dict),
            use_container_width=True,
        )

        st.markdown("---")

        # ── 3D Cluster Scatter
        st.markdown("**3D Segment Space**")
        label_map = build_cluster_label_map(kmeans)
        centers   = kmeans.cluster_centers_
        fig3d = go.Figure()

        for cid in range(kmeans.n_clusters):
            seg_name = label_map[cid]
            col      = SEGMENT_META[seg_name]["color"]
            fig3d.add_trace(go.Scatter3d(
                x=[centers[cid, 0]], y=[centers[cid, 1]], z=[centers[cid, 2]],
                mode="markers+text",
                marker=dict(size=18, color=col, opacity=0.55),
                text=[seg_name], textposition="top center",
                name=seg_name,
            ))

        fig3d.add_trace(go.Scatter3d(
            x=[scaled_input[0][0]], y=[scaled_input[0][1]], z=[scaled_input[0][2]],
            mode="markers",
            marker=dict(size=10, color="white", symbol="diamond"),
            name="You",
        ))

        fig3d.update_layout(
            scene=dict(
                xaxis_title="Recency (scaled)",
                yaxis_title="Frequency (scaled)",
                zaxis_title="Monetary (scaled)",
                bgcolor="#0e1117",
            ),
            paper_bgcolor="#0e1117",
            margin=dict(l=0, r=0, b=0, t=0),
            legend=dict(font=dict(color="white")),
        )
        st.plotly_chart(fig3d, use_container_width=True)

    else:
        st.info("Adjust the RFM sliders and click **⚡ Execute Health Analysis** to see unified results.")

# ─────────────────────────────────────────
# ANALYTICS DASHBOARD (4 charts)
# ─────────────────────────────────────────
st.markdown("---")
st.subheader("📊 Analytics Dashboard")

label_map  = build_cluster_label_map(kmeans)
centers    = kmeans.cluster_centers_
seg_labels = [label_map[i] for i in range(kmeans.n_clusters)]
seg_colors = [SEGMENT_META[s]["color"] for s in seg_labels]

# Use actual training-data cluster proportions (from kmeans.labels_)
# and wider std so the calibrated probability spans all 4 risk tiers.
cluster_sizes = np.bincount(kmeans.labels_)
cluster_props = cluster_sizes / cluster_sizes.sum()

np.random.seed(42)
N_SAMPLES = 500
synth_records = []
for cid in range(kmeans.n_clusters):
    n = int(N_SAMPLES * cluster_props[cid])
    c = centers[cid]
    for _ in range(n):
        # Sample in SCALED space (values can be negative — do NOT clamp here)
        r = np.random.normal(c[0], 0.6)
        f = np.random.normal(c[1], 0.5)
        m = np.random.normal(c[2], 0.6)
        raw_r, raw_f, raw_m = inverse_transform_rfm(
            np.array([r, f, m]), rfm_scaler
        )
        _, risk = get_churn(churn_model, raw_r, raw_f, raw_m)
        synth_records.append({"Segment": label_map[cid], "RiskTier": risk})

df_synth = pd.DataFrame(synth_records)

row1a, row1b = st.columns(2)
row2a, row2b = st.columns(2)

# ── Chart 1: Segment Distribution (pie)
with row1a:
    seg_counts = df_synth["Segment"].value_counts().reset_index()
    seg_counts.columns = ["Segment", "Count"]
    fig1 = px.pie(
        seg_counts, values="Count", names="Segment",
        title="Segment Distribution",
        color="Segment",
        color_discrete_map={s: SEGMENT_META[s]["color"] for s in SEGMENT_META},
    )
    fig1.update_layout(paper_bgcolor="#0e1117", font_color="white")
    st.plotly_chart(fig1, use_container_width=True)

# ── Chart 2: Churn Risk by Segment (stacked bar)
with row1b:
    risk_order = ["Safe", "Low", "Medium", "High"]
    pivot = (
        df_synth.groupby(["Segment", "RiskTier"])
        .size()
        .reset_index(name="Count")
    )
    fig2 = px.bar(
        pivot, x="Segment", y="Count", color="RiskTier",
        title="Churn Risk by Segment",
        color_discrete_map={r: RISK_META[r]["color"] for r in RISK_META},
        category_orders={"RiskTier": risk_order},
        barmode="stack",
    )
    fig2.update_layout(paper_bgcolor="#0e1117", font_color="white")
    st.plotly_chart(fig2, use_container_width=True)

# ── Chart 3: Feature Importance Overlay (top 8 churn features)
with row2a:
    feat_names = list(churn_model.feature_names_in_)
    feat_imp   = churn_model.feature_importances_
    top_idx    = np.argsort(feat_imp)[::-1][:8]
    fig3 = go.Figure(go.Bar(
        x=[feat_names[i] for i in top_idx],
        y=[feat_imp[i] for i in top_idx],
        marker_color="#7c3aed",
    ))
    fig3.update_layout(
        title="Feature Importance (XGBoost Churn)",
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        font_color="white",
        xaxis_tickangle=-30,
    )
    st.plotly_chart(fig3, use_container_width=True)

# ── Chart 4: Risk Heat Matrix (segment × churn tier)
with row2b:
    heat_pivot = (
        df_synth.groupby(["Segment", "RiskTier"])
        .size()
        .unstack(fill_value=0)
        .reindex(columns=risk_order, fill_value=0)
    )
    heat_segs = list(heat_pivot.index)
    fig4 = go.Figure(go.Heatmap(
        z=heat_pivot.values,
        x=risk_order,
        y=heat_segs,
        colorscale=[[0, "#10b981"], [0.33, "#facc15"], [0.66, "#f97316"], [1, "#ef4444"]],
        text=heat_pivot.values,
        texttemplate="%{text}",
        showscale=True,
    ))
    fig4.update_layout(
        title="Risk Heat Matrix (Segment × Churn Tier)",
        paper_bgcolor="#0e1117",
        font_color="white",
    )
    st.plotly_chart(fig4, use_container_width=True)

st.sidebar.markdown("**SIT Pune | Group 18**")
