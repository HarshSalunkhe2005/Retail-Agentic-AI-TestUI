import streamlit as st
import pandas as pd
import numpy as np
import io
import plotly.graph_objects as go

st.set_page_config(page_title="Live Forecasting", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #0e1117; }
    .stMetric { background-color: #1f2937; padding: 15px; border-radius: 10px; border: 1px solid #374151; }
    .stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #2563eb; color: white; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

st.title("🚀 Live Forecasting Module")
st.caption("Upload your own sales data · Train a fresh Prophet model · Forecast from today")

# ── Layout ────────────────────────────────────────────────────────────────────
col_left, col_right = st.columns([1, 2], gap="large")

# ── Left panel: upload + settings ─────────────────────────────────────────────
with col_left:
    st.subheader("📂 Data Upload")
    uploaded_file = st.file_uploader(
        "Upload CSV (date + revenue columns)",
        type=["csv"],
        help="CSV must contain a date column and a numeric revenue/sales column.",
    )

    st.markdown("**Not sure? Use the sample dataset:**")
    try:
        with open("sample_data/sales_timeseries_2024_2026.csv", "rb") as f:
            st.download_button(
                "⬇️ Download Sample CSV",
                data=f,
                file_name="sales_timeseries_2024_2026.csv",
                mime="text/csv",
            )
    except FileNotFoundError:
        st.info("Sample dataset not found locally.")

    st.divider()
    st.subheader("⚙️ Model Settings")
    horizon_weeks = st.slider("Forecast Horizon (Weeks)", min_value=4, max_value=52, value=12, step=1)
    seasonality_mode = st.selectbox("Seasonality Mode", ["multiplicative", "additive"])
    yearly_seasonality = st.checkbox("Yearly Seasonality", value=True)
    weekly_seasonality = st.checkbox("Weekly Seasonality", value=False)
    changepoint_prior = st.slider(
        "Changepoint Sensitivity",
        min_value=0.01, max_value=0.5, value=0.15, step=0.01,
        help="Higher = more flexible trend; lower = smoother trend.",
    )

    run_btn = st.button("🔮 Train & Forecast")

# ── Helper: detect date and revenue columns ───────────────────────────────────

def _detect_columns(df: pd.DataFrame):
    """Return (date_col, revenue_col) guessed from column names/types."""
    date_col = None
    revenue_col = None

    date_keywords = ["date", "ds", "week", "time", "period", "day", "month"]
    rev_keywords = ["revenue", "sales", "y", "amount", "value", "turnover", "income"]

    cols_lower = {c: c.lower() for c in df.columns}

    for col, lower in cols_lower.items():
        if any(k in lower for k in date_keywords):
            date_col = col
            break
    for col, lower in cols_lower.items():
        if any(k in lower for k in rev_keywords):
            revenue_col = col
            break

    # fallback: try to infer from dtypes
    if date_col is None:
        for col in df.columns:
            try:
                pd.to_datetime(df[col])
                date_col = col
                break
            except Exception:
                pass

    if revenue_col is None:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_cols:
            revenue_col = numeric_cols[0]

    return date_col, revenue_col


# ── Right panel: results ───────────────────────────────────────────────────────
with col_right:
    if run_btn:
        if uploaded_file is None:
            st.error("Please upload a CSV file first.")
            st.stop()

        # ── Load CSV ──────────────────────────────────────────────────────────
        try:
            df_raw = pd.read_csv(uploaded_file)
        except Exception as exc:
            st.error(f"Failed to read CSV: {exc}")
            st.stop()

        if df_raw.empty or df_raw.shape[1] < 2:
            st.error("CSV must have at least two columns (date and revenue).")
            st.stop()

        date_col, revenue_col = _detect_columns(df_raw)

        if date_col is None or revenue_col is None:
            st.error(
                "Could not auto-detect date or revenue columns. "
                "Please rename them to `date` and `revenue`."
            )
            st.stop()

        # ── Parse & clean ─────────────────────────────────────────────────────
        try:
            df_raw[date_col] = pd.to_datetime(df_raw[date_col])
        except Exception:
            st.error(f"Column '{date_col}' could not be parsed as dates.")
            st.stop()

        df_prophet = df_raw[[date_col, revenue_col]].rename(
            columns={date_col: "ds", revenue_col: "y"}
        ).dropna().sort_values("ds").reset_index(drop=True)

        df_prophet["y"] = pd.to_numeric(df_prophet["y"], errors="coerce")
        df_prophet.dropna(subset=["y"], inplace=True)

        if len(df_prophet) < 10:
            st.error("Need at least 10 valid rows to train a forecast model.")
            st.stop()

        # ── Train Prophet ─────────────────────────────────────────────────────
        with st.spinner("Training Prophet model on your data…"):
            try:
                from prophet import Prophet  # type: ignore
            except ImportError:
                st.error("Prophet is not installed. Add `prophet` to requirements.txt.")
                st.stop()

            model = Prophet(
                seasonality_mode=seasonality_mode,
                yearly_seasonality=yearly_seasonality,
                weekly_seasonality=weekly_seasonality,
                changepoint_prior_scale=changepoint_prior,
                interval_width=0.80,
            )
            model.fit(df_prophet)

        # ── Forecast from today forward ───────────────────────────────────────
        today = pd.Timestamp("2026-04-07")

        # make_future_dataframe extends the training period by horizon_weeks weeks,
        # giving us historical + future rows. We then filter to rows >= today.
        future_df = model.make_future_dataframe(periods=horizon_weeks, freq="W")

        forecast = model.predict(future_df)
        forecast["yhat"] = np.clip(forecast["yhat"], 0, None)
        forecast["yhat_lower"] = np.clip(forecast["yhat_lower"], 0, None)
        forecast["yhat_upper"] = np.clip(forecast["yhat_upper"], 0, None)

        # Only the truly future rows
        future_forecast = forecast[forecast["ds"] >= today].reset_index(drop=True)

        peak_idx = future_forecast["yhat"].idxmax()
        peak_date = future_forecast.loc[peak_idx, "ds"].strftime("%Y-%m-%d")
        peak_value = future_forecast.loc[peak_idx, "yhat"]
        avg_historical = df_prophet["y"].mean()

        # ── Metrics ───────────────────────────────────────────────────────────
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric("Training Rows", len(df_prophet))
        with m2:
            st.metric("Forecast Weeks", horizon_weeks)
        with m3:
            st.metric("Peak Demand Date", peak_date)
        with m4:
            st.metric("Peak Revenue", f"£{peak_value:,.0f}")

        st.divider()

        # ── Agent recommendation ───────────────────────────────────────────────
        spike_ratio = peak_value / avg_historical if avg_historical > 0 else 1.0

        if spike_ratio > 1.5:
            st.markdown(f"""
                <div style="background-color:#1f2937;padding:20px;border-radius:10px;
                            border-left:5px solid #f59e0b;margin-bottom:20px;">
                    <h3 style="color:#f59e0b;margin-top:0;">⚠️ High Demand Spike Detected</h3>
                    <p style="font-size:1.1em;margin-bottom:0;">
                        <b>Agent Recommendation:</b> Peak revenue of <b>£{peak_value:,.0f}</b>
                        ({spike_ratio:.1f}× historical average) expected around <b>{peak_date}</b>.
                        Initiate pre-emptive inventory scaling, accelerate supplier orders
                        and prepare fulfilment capacity 3–4 weeks in advance.
                    </p>
                </div>
            """, unsafe_allow_html=True)
        elif spike_ratio > 1.2:
            st.markdown(f"""
                <div style="background-color:#1f2937;padding:20px;border-radius:10px;
                            border-left:5px solid #3b82f6;margin-bottom:20px;">
                    <h3 style="color:#3b82f6;margin-top:0;">📈 Moderate Demand Uplift</h3>
                    <p style="font-size:1.1em;margin-bottom:0;">
                        <b>Agent Recommendation:</b> Moderate uplift ({spike_ratio:.1f}× average)
                        expected around <b>{peak_date}</b>.
                        Review reorder quantities and adjust safety stock by ~20%.
                    </p>
                </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
                <div style="background-color:#1f2937;padding:20px;border-radius:10px;
                            border-left:5px solid #10b981;margin-bottom:20px;">
                    <h3 style="color:#10b981;margin-top:0;">✅ Stable Demand Outlook</h3>
                    <p style="font-size:1.1em;margin-bottom:0;">
                        <b>Agent Recommendation:</b> Forecast within normal bounds.
                        Maintain standard reorder protocols and monitor weekly actuals.
                    </p>
                </div>
            """, unsafe_allow_html=True)

        # ── Forecast chart ────────────────────────────────────────────────────
        st.subheader("Forecast Trajectory (from today)")

        fig = go.Figure()

        # Historical actuals
        fig.add_trace(go.Scatter(
            x=df_prophet["ds"], y=df_prophet["y"],
            mode="markers+lines", name="Historical Actuals",
            marker=dict(color="gray", size=5),
            line=dict(color="rgba(128,128,128,0.4)"),
        ))

        # Uncertainty band
        fig.add_trace(go.Scatter(
            x=pd.concat([future_forecast["ds"], future_forecast["ds"][::-1]]),
            y=pd.concat([future_forecast["yhat_upper"], future_forecast["yhat_lower"][::-1]]),
            fill="toself",
            fillcolor="rgba(59,130,246,0.2)",
            line=dict(color="rgba(255,255,255,0)"),
            name="80% Confidence Band",
        ))

        # Forecast line
        fig.add_trace(go.Scatter(
            x=future_forecast["ds"], y=future_forecast["yhat"],
            mode="lines", name="Prophet Forecast",
            line=dict(color="#3b82f6", width=3),
        ))

        # Peak marker
        fig.add_trace(go.Scatter(
            x=[pd.to_datetime(peak_date)], y=[peak_value],
            mode="markers", name="Peak Event",
            marker=dict(color="#f59e0b", size=13, symbol="star"),
        ))

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor="#0e1117",
            plot_bgcolor="#0e1117",
            xaxis_title="Date",
            yaxis_title="Revenue (£)",
            hovermode="x unified",
            legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01),
            margin=dict(l=0, r=0, b=0, t=10),
        )

        st.plotly_chart(fig, use_container_width=True)

        # ── Download forecast CSV ─────────────────────────────────────────────
        st.divider()
        st.subheader("📥 Download Forecast")

        download_df = future_forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
        download_df.columns = ["date", "forecast_revenue", "lower_bound", "upper_bound"]
        download_df["date"] = download_df["date"].dt.strftime("%Y-%m-%d")
        download_df = download_df.round(2)

        csv_bytes = download_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            "⬇️ Download Forecast CSV",
            data=csv_bytes,
            file_name=f"forecast_{horizon_weeks}w.csv",
            mime="text/csv",
        )

    else:
        st.info("👈 Upload a CSV and click **Train & Forecast** to get started.")
        st.markdown("""
        **What this module does:**
        - 📂 Accepts any CSV with date + revenue columns
        - 🤖 Trains a fresh Prophet model on your data (in memory)
        - 📅 Generates forecasts from **today (2026-04-07)** into the future
        - 🔔 Flags demand spikes and gives actionable inventory recommendations
        - 📥 Provides a downloadable forecast CSV

        **Supported column names (auto-detected):**
        - Date: `date`, `ds`, `week`, `time`, `period`, `day`, `month`
        - Revenue: `revenue`, `sales`, `y`, `amount`, `value`, `turnover`
        """)

st.sidebar.markdown("**SIT Pune | Group 18**")
