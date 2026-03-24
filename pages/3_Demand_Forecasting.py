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
def load_model():
    try:
        return joblib.load(os.path.join("models", "forecast_prophet.pkl"))
    except:
        return None

st.title("📈 Demand Forecasting Module")
st.caption("Agentic Supply Chain | Prophet Time Series Inference")

col_params, col_metrics = st.columns([1, 2], gap="large")

with col_params:
    st.subheader("Forecast Parameters")
    horizon_weeks = st.slider("Forecast Horizon (Weeks)", min_value=4, max_value=24, value=12, step=1)
    history_weeks = st.slider("Historical Context (Weeks)", min_value=12, max_value=106, value=52, step=4)
    show_intervals = st.checkbox("Show Uncertainty Intervals", value=True)
    
    predict_btn = st.button("🔮 Generate Agentic Forecast")

model = load_model()

if predict_btn:
    if model:
        future = model.make_future_dataframe(periods=horizon_weeks, freq='W')
        forecast = model.predict(future)
        
        forecast['yhat'] = np.clip(forecast['yhat'], 0, None)
        forecast['yhat_lower'] = np.clip(forecast['yhat_lower'], 0, None)
        forecast['yhat_upper'] = np.clip(forecast['yhat_upper'], 0, None)
        
        peak_row = forecast.loc[forecast['yhat'].idxmax()]
        peak_date = peak_row['ds'].strftime('%Y-%m-%d')
        peak_value = peak_row['yhat']
        
        history_df = model.history.tail(history_weeks)
        avg_historical = history_df['y'].mean()
        
        with col_metrics:
            m1, m2, m3 = st.columns(3)
            with m1:
                st.metric("Active Model", "Prophet")
            with m2:
                st.metric("Peak Demand Event", peak_date)
            with m3:
                st.metric("Max Projected Volume", f"£{peak_value:,.0f}")
        
        st.divider()
        
        st.subheader("Agent Output")
        if avg_historical > 0 and peak_value > avg_historical * 1.5:
            st.markdown(f"""
                <div style="background-color: #1f2937; padding: 20px; border-radius: 10px; border-left: 5px solid #f59e0b; margin-bottom: 20px;">
                    <h3 style="color: #f59e0b; margin-top: 0;">⚠️ High Demand Spike Detected</h3>
                    <p style="font-size: 1.2em; margin-bottom: 0;"><b>Agent Recommendation:</b> Initiate preemptive inventory scaling and supplier orders for peak period around {peak_date}.</p>
                </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
                <div style="background-color: #1f2937; padding: 20px; border-radius: 10px; border-left: 5px solid #10b981; margin-bottom: 20px;">
                    <h3 style="color: #10b981; margin-top: 0;">✅ Stable Demand Forecast</h3>
                    <p style="font-size: 1.2em; margin-bottom: 0;"><b>Agent Recommendation:</b> Trajectory within normal bounds. Maintain standard reorder protocols.</p>
                </div>
            """, unsafe_allow_html=True)
        
        st.subheader("Forecast Trajectory & Uncertainty")
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=history_df['ds'], y=history_df['y'],
            mode='markers+lines', name='Historical Actuals',
            marker=dict(color='gray', size=6),
            line=dict(color='rgba(128,128,128,0.4)')
        ))
        
        if show_intervals:
            fig.add_trace(go.Scatter(
                x=pd.concat([forecast['ds'].tail(horizon_weeks + history_weeks), forecast['ds'].tail(horizon_weeks + history_weeks)[::-1]]),
                y=pd.concat([forecast['yhat_upper'].tail(horizon_weeks + history_weeks), forecast['yhat_lower'].tail(horizon_weeks + history_weeks)[::-1]]),
                fill='toself', fillcolor='rgba(59, 130, 246, 0.2)',
                line=dict(color='rgba(255,255,255,0)'),
                name='Uncertainty Interval'
            ))
        
        fig.add_trace(go.Scatter(
            x=forecast['ds'].tail(horizon_weeks + 1), y=forecast['yhat'].tail(horizon_weeks + 1),
            mode='lines', name='Prophet Forecast',
            line=dict(color='#3b82f6', width=3)
        ))
        
        fig.add_trace(go.Scatter(
            x=[pd.to_datetime(peak_date)], y=[peak_value],
            mode='markers', name='Peak Event',
            marker=dict(color='#f59e0b', size=12, symbol='star')
        ))
        
        fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='#0e1117',
            plot_bgcolor='#0e1117',
            xaxis_title="Date",
            yaxis_title="Revenue (£)",
            hovermode="x unified",
            legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01),
            margin=dict(l=0, r=0, b=0, t=0)
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
    else:
        st.error("Intelligence Core missing. Please ensure `forecast_prophet.pkl` is in the `models/` folder.")

st.sidebar.markdown("**SIT Pune | Group 18**")