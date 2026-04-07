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

RECOMMENDATION_MATRIX = {
    ("Core Actives", "Safe"):   "Highly engaged VIP — nurture loyalty tier, offer early access to new products.",
    ("Core Actives", "Low"):    "Strong customer showing mild drift — maintain exclusive benefits, send personalised 'thank you' offers.",
    ("Core Actives", "Medium"): "Valuable customer cooling off — trigger a surprise bonus offer or premium bundle before disengagement.",
    ("Core Actives", "High"):   "🚨 VIP at critical risk. Immediate personal outreach: exclusive 3-month premium tier + dedicated account manager + personalised product bundle (–20%).",

    ("Regular Contributors", "Safe"):   "Solid performer — upsell premium products, introduce subscription plan.",
    ("Regular Contributors", "Low"):    "Stable contributor with slight risk — launch cross-sell campaign aligned to purchase history.",
    ("Regular Contributors", "Medium"): "Engagement declining — deploy bundle discounts and category-specific promotions.",
    ("Regular Contributors", "High"):   "Win-back urgency — limited-time offer (15% off + free shipping) with personalised outreach.",

    ("Lapsing High-Potential", "Safe"):   "Unusual pattern — verify data quality; if valid, gentle nurture with personalised content.",
    ("Lapsing High-Potential", "Low"):    "Early lapse signal — gentle re-engagement email with personalised product recommendations.",
    ("Lapsing High-Potential", "Medium"): "Reactivation required — personalised email campaign with 10% loyalty credit + 'We miss you' message.",
    ("Lapsing High-Potential", "High"):   "🚨 Aggressive win-back: 30% discount + free shipping + personalised product bundle. Act within 72 hours.",

    ("Dormant / Low-Yield", "Safe"):   "Low-cost nurture — budget retention emails, seasonal content.",
    ("Dormant / Low-Yield", "Low"):    "Seasonal re-engagement opportunity — clearance offers, holiday promotions.",
    ("Dormant / Low-Yield", "Medium"): "Consider clearance or category-specific flash sale to re-activate.",
    ("Dormant / Low-Yield", "High"):   "Evaluate retention economics — if CAC < CLV, attempt one final win-back; otherwise shift budget to acquisition.",
}


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
    """Return (probability, risk_tier) for RFM input."""
    avg_order_value        = monetary / max(frequency, 1)
    total_items            = frequency * 2
    unique_products        = min(frequency, 10)
    avg_days_between       = 365.0 / max(frequency, 1)
    customer_lifetime_days = max(float(recency), 180.0)

    features = np.array([[
        recency, frequency, monetary,
        unique_products, avg_order_value, total_items,
        avg_days_between, customer_lifetime_days,
        0.0, 0,   # ReturnRate, ReturnCount
        0, 0      # CountryEnc, CategoryEnc
    ]])

    prob = float(churn_model.predict_proba(features)[0][1])

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

        recommendation = RECOMMENDATION_MATRIX[(segment, risk_tier)]
        confidence     = float(churn_model.predict_proba(
            np.array([[
                recency, frequency, monetary,
                min(frequency, 10),
                monetary / max(frequency, 1),
                frequency * 2,
                365.0 / max(frequency, 1),
                max(float(recency), 180.0),
                0.0, 0, 0, 0
            ]])
        )[0].max())

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
            <p style="color:#d1d5db;margin:0"><b style="color:#f3f4f6">🎯 Agent Recommendation:</b><br>{recommendation}</p>
        </div>
        """, unsafe_allow_html=True)

        # ── 2×2 Metrics grid
        c1, c2 = st.columns(2)
        c3, c4 = st.columns(2)
        c1.metric("📅 Recency",           f"{recency} days")
        c2.metric("🔄 Frequency",          f"{frequency} orders")
        c3.metric("💰 Monetary",           f"₹{monetary:,}")
        c4.metric("🔮 Churn Confidence",   f"{confidence:.1%}")

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

# Representative cluster-size proportions (Core / Regular / Lapsing / Dormant)
# derived from typical retail RFM distributions; used only for analytics charts.
SYNTHETIC_DIST = [0.30, 0.35, 0.20, 0.15]

np.random.seed(42)
N_SAMPLES = 400
synth_records = []
for cid in range(kmeans.n_clusters):
    n = int(N_SAMPLES * SYNTHETIC_DIST[cid])
    c = centers[cid]
    for _ in range(n):
        r = max(1, np.random.normal(c[0], 0.4))
        f = max(1, np.random.normal(c[1], 0.3))
        m = max(1, np.random.normal(c[2], 0.4))
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
