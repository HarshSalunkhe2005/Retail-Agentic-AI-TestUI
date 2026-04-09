import streamlit as st
import pandas as pd
import numpy as np
import joblib
import plotly.graph_objects as go
import os

st.set_page_config(page_title="Demand Forecasting", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #0e1117; }
    .stMetric { background-color: #1f2937; padding: 15px; border-radius: 10px; border: 1px solid #374151; }
    .stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #2563eb; color: white; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)


@st.cache_resource
def load_historical_model():
    try:
        return joblib.load(os.path.join("models", "forecast_prophet.pkl"))
    except Exception:
        return None


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


# ── Sidebar: settings only ────────────────────────────────────────────────────
st.sidebar.title("⚙️ Forecast Settings")

forecast_mode = st.sidebar.selectbox(
    "Forecast Mode",
    ["Historical Data (2010)", "Upload & Train New"],
    help="Historical: uses the pre-trained 2010 Prophet model as a reference.\n"
         "Upload & Train New: train a fresh Prophet model on your own CSV and forecast from today.",
)

horizon_weeks = st.sidebar.slider("Forecast Horizon (Weeks)", min_value=4, max_value=24, value=12, step=1)

seasonality_mode = st.sidebar.selectbox(
    "Seasonality Mode",
    ["multiplicative", "additive"],
    help=(
        "Multiplicative — Percentage-based scaling. Use for growing retail businesses where "
        "seasonal peaks get bigger as revenue scales. ✓ Recommended.\n\n"
        "Additive — Linear addition. Use for stable, flat-growing businesses where seasonal "
        "swings stay at a fixed absolute amount."
    ),
)

yearly_seasonality = st.sidebar.checkbox(
    "Yearly Seasonality",
    value=True,
    help="Detect annual patterns (holidays, seasons). Keep ON for retail.",
)

uploaded_file = None
if forecast_mode == "Upload & Train New":
    uploaded_file = st.sidebar.file_uploader(
        "Upload CSV (date + revenue columns)",
        type=["csv"],
        help="CSV must contain a date column and a numeric revenue/sales column.",
    )

run_btn = st.sidebar.button("🔮 Train Model" if forecast_mode == "Upload & Train New" else "🔮 Generate Forecast")

st.sidebar.markdown("---")
st.sidebar.markdown("**SIT Pune | Group 18**")

# ── Main area ─────────────────────────────────────────────────────────────────
st.title("📈 Demand Forecasting")
st.caption("Agentic Supply Chain | Prophet Time Series Inference")

if not run_btn:
    if forecast_mode == "Historical Data (2010)":
        st.info("👈 Adjust settings and click **Generate Forecast** to view the historical demand model.")
    else:
        st.info("👈 Upload a CSV and click **Train Model** to forecast from today (2026-04-07).")
    st.stop()

# ── HISTORICAL MODE ───────────────────────────────────────────────────────────
if forecast_mode == "Historical Data (2010)":
    model = load_historical_model()
    if model is None:
        st.error("Intelligence Core missing. Please ensure `forecast_prophet.pkl` is in the `models/` folder.")
        st.stop()

    future = model.make_future_dataframe(periods=horizon_weeks, freq="W")
    forecast = model.predict(future)
    forecast["yhat"] = np.clip(forecast["yhat"], 0, None)
    forecast["yhat_lower"] = np.clip(forecast["yhat_lower"], 0, None)
    forecast["yhat_upper"] = np.clip(forecast["yhat_upper"], 0, None)

    history_weeks_display = 52
    history_df = model.history.tail(history_weeks_display)
    avg_historical = history_df["y"].mean()

    peak_row = forecast.loc[forecast["yhat"].idxmax()]
    peak_date = peak_row["ds"].strftime("%Y-%m-%d")
    peak_value = peak_row["yhat"]

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric("Model", "Prophet (2010)")
    with m2:
        st.metric("Forecast Weeks", horizon_weeks)
    with m3:
        st.metric("Peak Date", peak_date)
    with m4:
        st.metric("Peak Revenue", f"£{peak_value:,.0f}")

    st.divider()

    spike_ratio = peak_value / avg_historical if avg_historical > 0 else 1.0
    if spike_ratio > 1.5:
        st.markdown(f"""
            <div style="background-color:#1f2937;padding:20px;border-radius:10px;
                        border-left:5px solid #f59e0b;margin-bottom:20px;">
                <h3 style="color:#f59e0b;margin-top:0;">⚠️ High Demand Spike Detected</h3>
                <p style="font-size:1.1em;margin-bottom:0;">
                    <b>Agent Recommendation:</b> Peak revenue of <b>£{peak_value:,.0f}</b>
                    ({spike_ratio:.1f}× historical average) projected around <b>{peak_date}</b>.
                    Initiate pre-emptive inventory scaling and accelerate supplier orders 3–4 weeks ahead.
                </p>
            </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
            <div style="background-color:#1f2937;padding:20px;border-radius:10px;
                        border-left:5px solid #10b981;margin-bottom:20px;">
                <h3 style="color:#10b981;margin-top:0;">✅ Stable Demand Forecast</h3>
                <p style="font-size:1.1em;margin-bottom:0;">
                    <b>Agent Recommendation:</b> Trajectory within normal bounds.
                    Maintain standard reorder protocols and monitor weekly actuals.
                </p>
            </div>
        """, unsafe_allow_html=True)

    st.subheader("Forecast Trajectory & Uncertainty")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=history_df["ds"], y=history_df["y"],
        mode="markers+lines", name="Historical Actuals",
        marker=dict(color="gray", size=6),
        line=dict(color="rgba(128,128,128,0.4)"),
    ))
    fig.add_trace(go.Scatter(
        x=pd.concat([
            forecast["ds"].tail(horizon_weeks + history_weeks_display),
            forecast["ds"].tail(horizon_weeks + history_weeks_display)[::-1],
        ]),
        y=pd.concat([
            forecast["yhat_upper"].tail(horizon_weeks + history_weeks_display),
            forecast["yhat_lower"].tail(horizon_weeks + history_weeks_display)[::-1],
        ]),
        fill="toself", fillcolor="rgba(59,130,246,0.2)",
        line=dict(color="rgba(255,255,255,0)"),
        name="Uncertainty Band",
    ))
    fig.add_trace(go.Scatter(
        x=forecast["ds"].tail(horizon_weeks + 1), y=forecast["yhat"].tail(horizon_weeks + 1),
        mode="lines", name="Prophet Forecast",
        line=dict(color="#3b82f6", width=3),
    ))
    fig.add_trace(go.Scatter(
        x=[pd.to_datetime(peak_date)], y=[peak_value],
        mode="markers", name="Peak Event",
        marker=dict(color="#f59e0b", size=12, symbol="star"),
    ))
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        xaxis_title="Date",
        yaxis_title="Revenue (£)",
        hovermode="x unified",
        legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01),
        margin=dict(l=0, r=0, b=0, t=0),
    )
    st.plotly_chart(fig, use_container_width=True)

# ── LIVE MODE ─────────────────────────────────────────────────────────────────
else:
    if uploaded_file is None:
        st.error("Please upload a CSV file first.")
        st.stop()

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

    try:
        df_raw[date_col] = pd.to_datetime(df_raw[date_col])
    except Exception:
        st.error(f"Column '{date_col}' could not be parsed as dates.")
        st.stop()

    df_prophet = (
        df_raw[[date_col, revenue_col]]
        .rename(columns={date_col: "ds", revenue_col: "y"})
        .dropna()
        .sort_values("ds")
        .reset_index(drop=True)
    )
    df_prophet["y"] = pd.to_numeric(df_prophet["y"], errors="coerce")
    df_prophet.dropna(subset=["y"], inplace=True)

    if len(df_prophet) < 10:
        st.error("Need at least 10 valid rows to train a forecast model.")
        st.stop()

    with st.spinner("Training Prophet model on your data…"):
        try:
            from prophet import Prophet  # type: ignore
        except ImportError:
            st.error("Prophet is not installed. Add `prophet` to requirements.txt.")
            st.stop()

        live_model = Prophet(
            seasonality_mode=seasonality_mode,
            yearly_seasonality=yearly_seasonality,
            weekly_seasonality=False,
            changepoint_prior_scale=0.15,
            interval_width=0.80,
        )
        live_model.fit(df_prophet)

    today = pd.Timestamp("2026-04-07")
    future_df = live_model.make_future_dataframe(periods=horizon_weeks, freq="W")
    forecast = live_model.predict(future_df)
    forecast["yhat"] = np.clip(forecast["yhat"], 0, None)
    forecast["yhat_lower"] = np.clip(forecast["yhat_lower"], 0, None)
    forecast["yhat_upper"] = np.clip(forecast["yhat_upper"], 0, None)

    future_forecast = forecast[forecast["ds"] >= today].reset_index(drop=True)
    if future_forecast.empty:
        st.error("No forecast rows found beyond today. Check your CSV date range.")
        st.stop()

    peak_idx = future_forecast["yhat"].idxmax()
    peak_date = future_forecast.loc[peak_idx, "ds"].strftime("%Y-%m-%d")
    peak_value = future_forecast.loc[peak_idx, "yhat"]
    avg_historical = df_prophet["y"].mean()
    spike_ratio = peak_value / avg_historical if avg_historical > 0 else 1.0

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric("Training Rows", len(df_prophet))
    with m2:
        st.metric("Forecast Weeks", horizon_weeks)
    with m3:
        st.metric("Peak Date", peak_date)
    with m4:
        st.metric("Peak Revenue", f"£{peak_value:,.0f}")

    st.divider()

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

    st.subheader("Forecast Trajectory (from today)")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df_prophet["ds"], y=df_prophet["y"],
        mode="markers+lines", name="Historical Actuals",
        marker=dict(color="gray", size=5),
        line=dict(color="rgba(128,128,128,0.4)"),
    ))
    fig.add_trace(go.Scatter(
        x=pd.concat([future_forecast["ds"], future_forecast["ds"][::-1]]),
        y=pd.concat([future_forecast["yhat_upper"], future_forecast["yhat_lower"][::-1]]),
        fill="toself",
        fillcolor="rgba(59,130,246,0.2)",
        line=dict(color="rgba(255,255,255,0)"),
        name="80% Confidence Band",
    ))
    fig.add_trace(go.Scatter(
        x=future_forecast["ds"], y=future_forecast["yhat"],
        mode="lines", name="Prophet Forecast",
        line=dict(color="#3b82f6", width=3),
    ))
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