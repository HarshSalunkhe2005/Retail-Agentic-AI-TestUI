import streamlit as st
import numpy as np
import pandas as pd
import joblib
import plotly.graph_objects as go
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
.stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #2563eb; color: white; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def load_models():
    try:
        kmeans = joblib.load(os.path.join("models", "kmeans.pkl"))
        scaler = joblib.load(os.path.join("models", "rfm_scaler.pkl"))
        return kmeans, scaler
    except:
        return None, None

kmeans, scaler = load_models()

# ─────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────
st.title("👥 Customer Segmentation Module")
st.caption("Agentic Pattern Recognition | RFM Clustering")

if kmeans and scaler:

    m1, m2, m3 = st.columns(3)
    m1.metric("Optimal Clusters (k)", int(kmeans.n_clusters))
    m2.metric("Model Inertia", f"{kmeans.inertia_:,.2f}")
    m3.metric("Scaling Engine", "RobustScaler")

    st.divider()

    left, right = st.columns([1, 2], gap="large")

    # ───────── INPUTS
    with left:
        st.subheader("Simulated Customer (RFM)")

        recency = st.number_input("Recency (Days since last purchase)", min_value=1, value=30)
        frequency = st.number_input("Frequency (Total orders)", min_value=1, value=5)
        monetary = st.number_input("Monetary (Total spent ₹)", min_value=1.0, value=1200.0)

        predict_btn = st.button("Execute Segmentation Analysis")

        st.markdown("---")
        st.subheader("Analytics")

    # ───────── OUTPUT
    with right:
        if predict_btn:

            raw_input = np.array([[recency, frequency, monetary]])
            log_input = np.log1p(raw_input)
            scaled_input = scaler.transform(log_input)

            cluster_id = kmeans.predict(scaled_input)[0]

            centers = kmeans.cluster_centers_
            scores = centers[:, 2] + centers[:, 1] - centers[:, 0]
            sorted_clusters = np.argsort(scores)

            label_map = {
                sorted_clusters[3]: ("Core Actives", "Enroll in VIP Loyalty Tier.", "#10b981"),
                sorted_clusters[2]: ("Consistent Contributors", "Send Volume-Based Upsell.", "#3b82f6"),
                sorted_clusters[1]: ("Lapsing High-Potential", "Trigger Win-Back Campaign.", "#f59e0b"),
                sorted_clusters[0]: ("Dormant / Low-Yield", "Move to Low-Cost Retention.", "#ef4444")
            }

            segment, recommendation, color = label_map[cluster_id]

            st.markdown(f"""
            <div style="background:#1f2937;padding:25px;border-radius:12px;
                        border-left:6px solid {color};">
                <h2 style="color:{color}">{segment}</h2>
                <p><b>Agent Recommendation:</b> {recommendation}</p>
            </div>
            """, unsafe_allow_html=True)

            # 3D Plot
            fig = go.Figure()

            for cid in range(kmeans.n_clusters):
                name, _, c = label_map[cid]
                fig.add_trace(go.Scatter3d(
                    x=[centers[cid, 0]],
                    y=[centers[cid, 1]],
                    z=[centers[cid, 2]],
                    mode='markers+text',
                    marker=dict(size=15, color=c, opacity=0.6),
                    text=[name],
                    name=name
                ))

            fig.add_trace(go.Scatter3d(
                x=[scaled_input[0][0]],
                y=[scaled_input[0][1]],
                z=[scaled_input[0][2]],
                mode='markers',
                marker=dict(size=10, color='white', symbol='diamond'),
                name="Customer"
            ))

            fig.update_layout(
                scene=dict(
                    xaxis_title="Recency",
                    yaxis_title="Frequency",
                    zaxis_title="Monetary",
                    bgcolor="#0e1117"
                ),
                paper_bgcolor="#0e1117",
                margin=dict(l=0, r=0, b=0, t=0)
            )

            st.plotly_chart(fig, use_container_width=True)

        else:
            st.info("Provide inputs and run segmentation")

    # ─────────────────────────────────────────
    # 🔥 ANALYTICS (WITH REAL LABELS)
    # ─────────────────────────────────────────
    st.markdown("<div style='margin-top:-20px'></div>", unsafe_allow_html=True)
    st.markdown("---")

    centers = kmeans.cluster_centers_
    scores = centers[:, 2] + centers[:, 1] - centers[:, 0]
    sorted_clusters = np.argsort(scores)

    segment_names = {
        sorted_clusters[3]: "Core",
        sorted_clusters[2]: "Regular",
        sorted_clusters[1]: "Lapsing",
        sorted_clusters[0]: "Dormant"
    }

    df_centers = pd.DataFrame(centers, columns=["Recency", "Frequency", "Monetary"])
    df_centers["Segment"] = [segment_names[i] for i in range(len(df_centers))]
    df_centers = df_centers.set_index("Segment")

    # Normalize
    df_norm = (df_centers - df_centers.min()) / (df_centers.max() - df_centers.min())

    # KPI
    k1, k2, k3 = st.columns(3)
    k1.metric("Top Spending Segment", df_centers["Monetary"].idxmax())
    k2.metric("Most Frequent Segment", df_centers["Frequency"].idxmax())
    k3.metric("Most Recent Segment", df_centers["Recency"].idxmin())

    # ROW 1
    c1, c2 = st.columns(2)

    with c1:
        st.markdown("**Monetary Strength**")
        st.bar_chart(df_centers["Monetary"])

    with c2:
        st.markdown("**Frequency Strength**")
        st.bar_chart(df_centers["Frequency"])

    # ROW 2
    c3, c4 = st.columns(2)

    with c3:
        st.markdown("**RFM Comparison**")
        fig = go.Figure()

        for col in df_norm.columns:
            fig.add_trace(go.Bar(
                name=col,
                x=df_norm.index,
                y=df_norm[col]
            ))

        fig.update_layout(barmode='group')
        st.plotly_chart(fig, use_container_width=True)

    with c4:
        st.markdown("**Segment Profiles (Radar)**")

        fig = go.Figure()

        for i in range(len(df_norm)):
            fig.add_trace(go.Scatterpolar(
                r=df_norm.iloc[i].values,
                theta=["Recency", "Frequency", "Monetary"],
                fill='toself',
                name=df_norm.index[i]
            ))

        fig.update_layout(polar=dict(radialaxis=dict(visible=True)))
        st.plotly_chart(fig, use_container_width=True)

else:
    st.error("Model files missing.")