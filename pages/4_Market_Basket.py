import os
import pickle
import random

import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st

# ─────────────────────────────────────────
# PAGE CONFIG / STYLES
# ─────────────────────────────────────────
st.markdown("""
<style>
.block-container {
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 100%;
}
.main { background-color: #0e1117; }
.stMetric {
    background-color: #1f2937;
    padding: 15px;
    border-radius: 10px;
    border: 1px solid #374151;
}
.stButton>button {
    width: 100%;
    border-radius: 5px;
    height: 3em;
    background-color: #7c3aed;
    color: white;
    font-weight: bold;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────
# STRENGTH CONFIG
# ─────────────────────────────────────────
MAX_CHART_LABEL_LEN = 20

STRENGTH_META = {
    "Very Strong": {"icon": "🟢", "color": "#10b981"},
    "Strong":      {"icon": "🔵", "color": "#3b82f6"},
    "Moderate":    {"icon": "🟡", "color": "#f59e0b"},
    "Weak":        {"icon": "🔴", "color": "#ef4444"},
}


# ─────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────
@st.cache_resource
def load_basket_data():
    """Load association rules from pkl and build product lookup."""
    for base in ["models", ""]:
        path = os.path.join(base, "model5_basket_analysis.pkl")
        if os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    rules_df = pickle.load(f)
                # Build product lookup: code -> description
                lookup = {}
                for _, row in rules_df.iterrows():
                    ant_codes = [c.strip() for c in str(row["antecedents_str"]).split(",")]
                    ant_descs = [d.strip() for d in str(row["antecedents_desc"]).split("|")]
                    for code, desc in zip(ant_codes, ant_descs):
                        if code and code not in lookup:
                            lookup[code] = desc
                    con_codes = [c.strip() for c in str(row["consequents_str"]).split(",")]
                    con_descs = [d.strip() for d in str(row["consequents_desc"]).split("|")]
                    for code, desc in zip(con_codes, con_descs):
                        if code and code not in lookup:
                            lookup[code] = desc
                return rules_df, lookup
            except Exception as e:
                st.error(f"Failed to load basket model: {e}")
                return None, {}
    st.error(
        "Model file not found. Ensure `model5_basket_analysis.pkl` "
        "is present in the `models/` directory."
    )
    return None, {}


rules_df, product_lookup = load_basket_data()

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def label_strength(lift: float) -> str:
    if lift > 5:
        return "Very Strong"
    if lift > 3:
        return "Strong"
    if lift > 2:
        return "Moderate"
    return "Weak"


def get_recommendations(query_codes: list, min_lift: float, top_n: int, rules: pd.DataFrame):
    """
    1. Find all rules where antecedent ⊆ query_basket
    2. Filter by min_lift
    3. Extract consequents not already in query basket
    4. Deduplicate, rank by lift desc
    5. Return top_n
    """
    query_set = set(query_codes)
    matched_rules = []

    for _, row in rules.iterrows():
        ant_codes = frozenset(c.strip() for c in str(row["antecedents_str"]).split(","))
        # Antecedent must be subset of query basket
        if not ant_codes.issubset(query_set):
            continue
        if row["lift"] < min_lift:
            continue
        con_codes = [c.strip() for c in str(row["consequents_str"]).split(",")]
        con_descs = [d.strip() for d in str(row["consequents_desc"]).split("|")]
        for code, desc in zip(con_codes, con_descs):
            if code and code not in query_set:
                matched_rules.append({
                    "product_code": code,
                    "description": desc,
                    "support": row["support"],
                    "confidence": row["confidence"],
                    "lift": row["lift"],
                    "strength": row.get("strength", label_strength(row["lift"])),
                    "triggered_by": str(row["antecedents_desc"]),
                    "rule_id": row["rule_id"],
                })

    if not matched_rules:
        return pd.DataFrame()

    rec_df = pd.DataFrame(matched_rules)
    # Deduplicate: keep highest-lift rule per product code
    rec_df = rec_df.sort_values("lift", ascending=False).drop_duplicates("product_code")
    # Add category stub (not in pkl, derive from description)
    rec_df["category"] = rec_df["description"].apply(
        lambda d: d.split()[0].title() if d and d.split() else "Unknown"
    )
    rec_df = rec_df.head(top_n).reset_index(drop=True)
    rec_df.insert(0, "rank", range(1, len(rec_df) + 1))
    return rec_df


def build_agent_text(query_codes, recs_df, avg_lift):
    n = len(query_codes)
    if recs_df.empty:
        return (
            "⚠️ **No strong recommendations found.**  "
            "Try lowering the Min Lift threshold or adding more products to your basket."
        )
    top_rec = recs_df.iloc[0]["description"]
    basket_descs = [product_lookup.get(c, c) for c in query_codes]
    basket_str = " + ".join(basket_descs)
    if avg_lift >= 5:
        return (
            f"🟢 **Very Strong bundle detected!** Customers buying **{basket_str}** "
            f"are {avg_lift:.1f}× more likely to also buy **{top_rec}** "
            f"and {len(recs_df) - 1} other items. "
            f"**Recommendation:** Create a bundle discount of 15–20% on these combinations."
        )
    if avg_lift >= 3:
        return (
            f"🔵 **Strong cross-sell opportunity.** Customers who buy **{basket_str}** "
            f"also frequently purchase **{top_rec}** (Avg Lift = {avg_lift:.1f}×). "
            f"**Recommendation:** Add to cart suggestion at checkout."
        )
    if avg_lift >= 2:
        return (
            f"🟡 **Moderate association found.** Buying **{basket_str}** shows a "
            f"{avg_lift:.1f}× lift toward **{top_rec}**. "
            f"**Recommendation:** Display as 'Customers also viewed' or 'Frequently bought together'."
        )
    return (
        f"🔴 **Weak signal.** The basket of {n} product(s) shows some associations "
        f"(Avg Lift = {avg_lift:.1f}×) but links are below average. "
        f"**Recommendation:** Consider broadening the basket or lowering the Min Lift threshold."
    )


def random_sample_basket():
    """Pick a random rule and return its antecedent codes."""
    if rules_df is None or rules_df.empty:
        return []
    row = rules_df.sample(1).iloc[0]
    codes = [c.strip() for c in str(row["antecedents_str"]).split(",")]
    return codes[:3]


# ─────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────
st.title("🛒 Market Basket Analysis")
st.caption("Agentic Supply Chain | FP-Growth Association Rules — 1000+ Rules Mined")

if rules_df is None:
    st.stop()

# Sorted product list for dropdown
product_options = sorted(
    [f"{code} | {desc}" for code, desc in product_lookup.items()]
)
product_options_with_blank = [""] + product_options

# ─────────────────────────────────────────
# SESSION STATE — sample basket + last results
# ─────────────────────────────────────────
if "sample_codes" not in st.session_state:
    st.session_state["sample_codes"] = ["", "", ""]
if "last_recs" not in st.session_state:
    st.session_state["last_recs"] = None

# ─────────────────────────────────────────
# LAYOUT
# ─────────────────────────────────────────
left, right = st.columns([1, 2], gap="large")

# ───────────────────────── LEFT PANEL
with left:
    st.subheader("🛒 Product Basket Query")

    # Sample / Clear buttons
    col_sample, col_clear = st.columns(2)
    with col_sample:
        if st.button("🎲 Random Basket"):
            codes = random_sample_basket()
            padded = (codes + ["", "", ""])[:3]
            st.session_state["sample_codes"] = padded
    with col_clear:
        if st.button("🗑️ Clear"):
            st.session_state["sample_codes"] = ["", "", ""]

    def _default_idx(code):
        if not code:
            return 0
        for i, opt in enumerate(product_options_with_blank):
            if opt.startswith(code + " |") or opt.startswith(code + "|"):
                return i
        return 0

    p1 = st.selectbox(
        "Product 1 (required)",
        options=product_options_with_blank,
        index=_default_idx(st.session_state["sample_codes"][0]),
        key="p1",
        help="Type to search by code or description",
    )
    p2 = st.selectbox(
        "Product 2 (optional)",
        options=product_options_with_blank,
        index=_default_idx(st.session_state["sample_codes"][1]),
        key="p2",
        help="Type to search by code or description",
    )
    p3 = st.selectbox(
        "Product 3 (optional)",
        options=product_options_with_blank,
        index=_default_idx(st.session_state["sample_codes"][2]),
        key="p3",
        help="Type to search by code or description",
    )

    min_lift = st.slider(
        "Min Lift",
        min_value=1.0,
        max_value=10.0,
        value=1.2,
        step=0.1,
        help="How much better than random chance (1.0=random, 2.0=2× more likely). "
             "Higher = fewer but stronger rules.",
    )
    top_n = st.slider(
        "Top N Results",
        min_value=1,
        max_value=30,
        value=10,
        help="Maximum number of product recommendations to return.",
    )

    run = st.button("🔍 Get Recommendations")

# ───────────────────────── RIGHT PANEL
with right:
    if run:
        # Parse selected products
        def parse_code(sel):
            if not sel:
                return None
            return sel.split("|")[0].strip()

        raw_codes = [parse_code(p1), parse_code(p2), parse_code(p3)]
        query_codes = [c for c in raw_codes if c]

        if not query_codes:
            st.warning("⚠️ Enter at least 1 product to get recommendations.")
        else:
            # Validate codes
            valid_codes = []
            for c in query_codes:
                if c in product_lookup:
                    valid_codes.append(c)
                else:
                    st.warning(f"⚠️ Product code **{c}** not found in rules — skipping.")

            if not valid_codes:
                st.error("None of the entered products exist in the rule base.")
            else:
                recs = get_recommendations(valid_codes, min_lift, top_n, rules_df)

                # ── KPI CARDS
                avg_lift_val = float(recs["lift"].mean()) if not recs.empty else 0.0
                avg_conf_val = float(recs["confidence"].mean()) if not recs.empty else 0.0
                rules_matched = len(recs)

                k1, k2, k3, k4 = st.columns(4)
                k1.metric("🛒 Basket Size", len(valid_codes))
                k2.metric("📋 Rules Matched", rules_matched)
                k3.metric("⚡ Avg Lift", f"{avg_lift_val:.2f}")
                k4.metric("🎯 Avg Confidence", f"{avg_conf_val:.1%}")

                # ── AGENT RECOMMENDATION CARD
                agent_text = build_agent_text(valid_codes, recs, avg_lift_val)
                st.markdown(f"""
                <div style="background:#1f2937;padding:20px;border-radius:12px;
                            border-left:6px solid #7c3aed;margin:12px 0;">
                    <b style="color:#a78bfa;">🤖 Agent Recommendation</b><br><br>
                    {agent_text}
                </div>
                """, unsafe_allow_html=True)

                # ── RECOMMENDATIONS TABLE
                if recs.empty:
                    st.info("No recommendations found for the current settings.")
                else:
                    st.subheader("📦 Recommended Products")

                    display_df = recs[
                        ["rank", "product_code", "description", "category",
                         "support", "confidence", "lift", "strength"]
                    ].copy()
                    display_df.columns = [
                        "Rank", "Product Code", "Description", "Category",
                        "Support", "Confidence", "Lift", "Rule Strength",
                    ]
                    display_df["Support"] = display_df["Support"].map("{:.4f}".format)
                    display_df["Confidence"] = display_df["Confidence"].map("{:.2%}".format)
                    display_df["Lift"] = display_df["Lift"].map("{:.2f}".format)
                    display_df["Rule Strength"] = display_df["Rule Strength"].apply(
                        lambda s: f"{STRENGTH_META.get(s, {}).get('icon', '')} {s}"
                    )

                    st.dataframe(display_df, use_container_width=True, hide_index=True)

                    # Copy as CSV button
                    csv_data = recs.drop(columns=["rank"]).to_csv(index=False)
                    st.download_button(
                        "📋 Download Recommendations (CSV)",
                        data=csv_data,
                        file_name="basket_recommendations.csv",
                        mime="text/csv",
                    )

                    st.session_state["last_recs"] = recs

    else:
        st.info("👈 Select products on the left and click **Get Recommendations**.")

# ─────────────────────────────────────────
# BOTTOM ANALYTICS (shown after run)
# ─────────────────────────────────────────
_last_recs = st.session_state.get("last_recs")
if _last_recs is not None and not _last_recs.empty:
    st.markdown("---")
    st.subheader("📊 Recommendation Analytics")

    chart1, chart2 = st.columns(2)

    with chart1:
        top_lift = _last_recs.head(10).copy()
        top_lift["label"] = top_lift["product_code"] + " | " + top_lift["description"].str[:MAX_CHART_LABEL_LEN]
        color_map = {
            s: STRENGTH_META[s]["color"]
            for s in STRENGTH_META
        }
        fig_bar = px.bar(
            top_lift,
            x="lift",
            y="label",
            orientation="h",
            color="strength",
            color_discrete_map=color_map,
            title="Top 10 Recommendations by Lift",
            labels={"lift": "Lift Score", "label": "Product"},
            text_auto=".2f",
        )
        fig_bar.update_layout(
            paper_bgcolor="#0e1117",
            plot_bgcolor="#0e1117",
            font_color="white",
            yaxis={"categoryorder": "total ascending"},
            showlegend=True,
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    with chart2:
        fig_scatter = px.scatter(
            _last_recs,
            x="confidence",
            y="lift",
            color="strength",
            color_discrete_map=color_map,
            hover_data=["product_code", "description", "support"],
            title="Confidence vs Lift (colored by Rule Strength)",
            labels={
                "confidence": "Confidence",
                "lift": "Lift",
            },
            text="product_code",
        )
        fig_scatter.update_traces(textposition="top center", marker_size=9)
        fig_scatter.update_layout(
            paper_bgcolor="#0e1117",
            plot_bgcolor="#0e1117",
            font_color="white",
        )
        st.plotly_chart(fig_scatter, use_container_width=True)

# ─────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────
st.sidebar.markdown("**SIT Pune | Group 18**")
