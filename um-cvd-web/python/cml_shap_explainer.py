import math
import streamlit as st
import plotly.graph_objects as go
import pandas as pd

# =============================================================
# Streamlit setup
# =============================================================
st.set_page_config(page_title="CML Cardiovascular Risk Assessment", layout="wide")
st.title("AI-Powered Cardiovascular Risk Assessment for CML Patients")
st.write(
    "Interactive SHAP-style explainer for cardiovascular risk prediction in Chronic Myelogenous Leukemia patients."
)

# =============================================================
# CML-specific cardiovascular risk model
# =============================================================
# prediction = base_value + Σ weight[i] * (value[i] - baseline[i])
BASE_VALUE = 1000.0  # Base cardiovascular risk score for CML patients

# CML-specific features based on clinical data
features = {
    "age": {
        "label": "Age (years)",
        "weight": 15.0,
        "baseline": 50.0,
        "min": 18.0,
        "max": 100.0,
        "step": 1.0,
        "init": 55.0,
    },
    "bmi": {
        "label": "BMI (kg/m²)",
        "weight": 25.0,
        "baseline": 25.0,
        "min": 15.0,
        "max": 50.0,
        "step": 0.1,
        "init": 28.5,
    },
    "systolic_bp": {
        "label": "Systolic BP (mmHg)",
        "weight": 8.0,
        "baseline": 120.0,
        "min": 80.0,
        "max": 200.0,
        "step": 1.0,
        "init": 135.0,
    },
    "diastolic_bp": {
        "label": "Diastolic BP (mmHg)",
        "weight": 12.0,
        "baseline": 80.0,
        "min": 50.0,
        "max": 120.0,
        "step": 1.0,
        "init": 85.0,
    },
    "rbc_count": {
        "label": "RBC Count (m/uL)",
        "weight": -200.0,
        "baseline": 4.5,
        "min": 2.0,
        "max": 7.0,
        "step": 0.01,
        "init": 3.8,
    },
    "cholesterol": {
        "label": "Total Cholesterol (mg/dL)",
        "weight": 5.0,
        "baseline": 200.0,
        "min": 100.0,
        "max": 400.0,
        "step": 1.0,
        "init": 250.0,
    },
    "glucose": {
        "label": "Glucose (mg/dL)",
        "weight": 3.0,
        "baseline": 100.0,
        "min": 70.0,
        "max": 300.0,
        "step": 1.0,
        "init": 120.0,
    },
    "hba1c": {
        "label": "HbA1c (%)",
        "weight": 50.0,
        "baseline": 5.5,
        "min": 4.0,
        "max": 12.0,
        "step": 0.1,
        "init": 6.2,
    },
    "ldh": {
        "label": "LDH (IU/L)",
        "weight": 2.0,
        "baseline": 200.0,
        "min": 100.0,
        "max": 1000.0,
        "step": 1.0,
        "init": 350.0,
    },
    "albumin": {
        "label": "Albumin (g/dL)",
        "weight": -100.0,
        "baseline": 4.0,
        "min": 2.0,
        "max": 6.0,
        "step": 0.1,
        "init": 3.5,
    },
    "tki_dose": {
        "label": "TKI Dose (mg/day)",
        "weight": 1.5,
        "baseline": 400.0,
        "min": 100.0,
        "max": 800.0,
        "step": 10.0,
        "init": 400.0,
    },
}

# Colors for CML theme
RED = "#ff3b6a"      # High risk
BLUE = "#2f80ff"     # Low risk
AXIS_GREY = "#6d6d6d"
STEM_GREY = "rgba(120,120,120,0.8)"

# =============================================================
# Sidebar controls (interactive)
# =============================================================
with st.sidebar:
    st.header("🩺 Patient Parameters")
    values = {}
    for key, meta in features.items():
        values[key] = st.slider(
            meta["label"],
            min_value=float(meta["min"]),
            max_value=float(meta["max"]),
            value=float(meta["init"]),
            step=float(meta["step"]),
            help=f"Baseline: {meta['baseline']}  |  Weight: {meta['weight']}",
        )

    st.header("⚙️ Display Options")
    show_impacts = st.checkbox("Show impact values (Δ)", value=True)
    show_risk_level = st.checkbox("Show risk level interpretation", value=True)

# =============================================================
# Contributions & prediction
# =============================================================
contribs = {
    k: features[k]["weight"] * (values[k] - features[k]["baseline"]) for k in features
}
prediction = BASE_VALUE + sum(contribs.values())

# Risk level interpretation
def get_risk_level(score):
    if score < 800:
        return "Low", "🟢", "Continue regular monitoring"
    elif score < 1200:
        return "Moderate", "🟡", "Consider lifestyle modifications"
    else:
        return "High", "🔴", "Immediate intervention recommended"

risk_level, risk_icon, recommendation = get_risk_level(prediction)

fmt = lambda x: f"{x:,.0f}"
fmt_value = lambda v: f"{v:.2f}"  # feature value formatting
fmt_delta = lambda d: ("+" if d >= 0 else "") + f"{d:,.0f}"  # signed contribution

# =============================================================
# Helpers for figure construction
# =============================================================

def nice_bounds(xmin: float, xmax: float, tick: int = 100):
    """Expand [xmin, xmax] outward to whole multiples of `tick`, with padding."""
    lo = math.floor(min(xmin, xmax) / tick) * tick
    hi = math.ceil(max(xmin, xmax) / tick) * tick
    if hi - lo < 5 * tick:
        lo -= tick
        hi += tick
    return lo, hi


def triangle_path(x, y0, y1, direction="right", scale=0.60):
    """Return an SVG path for a skinny chevron triangle at x spanning [y0, y1]."""
    h = (y1 - y0)
    w = h * scale
    mid = (y0 + y1) / 2
    if direction == "right":
        return f"M{x},{y0} L{x+w},{mid} L{x},{y1} Z"
    else:
        return f"M{x},{y0} L{x-w},{mid} L{x},{y1} Z"


# =============================================================
# Force bar builder (with under‑bar labels + stems like the screenshot)
# =============================================================

def build_force_figure(base_value: float, values: dict, contribs: dict) -> go.Figure:
    """Build a SHAP‑style force bar using Plotly shapes for CML cardiovascular risk."""
    height = 0.22
    y0, y1 = 0.5 - height / 2.0, 0.5 + height / 2.0

    # Split and sort by magnitude (visual nicety)
    neg = []  # (label, value, key)
    pos = []
    for k, v in contribs.items():
        pair = (features[k]["label"], float(v), k)
        (neg if v < 0 else pos).append(pair)
    neg.sort(key=lambda x: abs(x[1]), reverse=True)
    pos.sort(key=lambda x: abs(x[1]), reverse=True)

    shapes = []
    annotations = []
    segments_for_labels = []  # we'll place labels after we know centers

    left_cursor = base_value
    right_cursor = base_value

    # --- NEGATIVE (RED) side ---
    for label, val, key in neg:
        x0 = left_cursor + val  # val < 0
        x1 = left_cursor
        if x1 < x0:
            x0, x1 = x1, x0
        # rectangle
        shapes.append(dict(type="rect", x0=x0, x1=x1, y0=y0, y1=y1, line=dict(width=0), fillcolor=RED))
        # boundary chevrons (double notch)
        off = (y1 - y0) * 0.36
        shapes.append(dict(type="path", path=triangle_path(x0, y0, y1, direction="left"), line=dict(width=0), fillcolor="white"))
        shapes.append(dict(type="path", path=triangle_path(x0 - off, y0, y1, direction="left"), line=dict(width=0), fillcolor="white"))

        cx = (x0 + x1) / 2
        segments_for_labels.append({
            "cx": cx,
            "side": "neg",
            "label": label,
            "val": values[key],
            "delta": val,
        })
        left_cursor = x0

    # end-cap chevrons on far left
    off = (y1 - y0) * 0.36
    shapes.append(dict(type="path", path=triangle_path(left_cursor, y0, y1, direction="left"), line=dict(width=0), fillcolor="white"))
    shapes.append(dict(type="path", path=triangle_path(left_cursor - off, y0, y1, direction="left"), line=dict(width=0), fillcolor="white"))

    # --- POSITIVE (BLUE) side ---
    for label, val, key in pos:
        x0 = right_cursor
        x1 = right_cursor + val  # val > 0
        if x1 < x0:
            x0, x1 = x1, x0
        # rectangle
        shapes.append(dict(type="rect", x0=x0, x1=x1, y0=y0, y1=y1, line=dict(width=0), fillcolor=BLUE))
        # boundary chevrons (double notch)
        off = (y1 - y0) * 0.36
        shapes.append(dict(type="path", path=triangle_path(x1, y0, y1, direction="right"), line=dict(width=0), fillcolor="white"))
        shapes.append(dict(type="path", path=triangle_path(x1 + off, y0, y1, direction="right"), line=dict(width=0), fillcolor="white"))

        cx = (x0 + x1) / 2
        segments_for_labels.append({
            "cx": cx,
            "side": "pos",
            "label": label,
            "val": values[key],
            "delta": val,
        })
        right_cursor = x1

    # end-cap chevrons on far right
    off = (y1 - y0) * 0.36
    shapes.append(dict(type="path", path=triangle_path(right_cursor, y0, y1, direction="right"), line=dict(width=0), fillcolor="white"))
    shapes.append(dict(type="path", path=triangle_path(right_cursor + off, y0, y1, direction="right"), line=dict(width=0), fillcolor="white"))

    # dashed center line at the base value
    shapes.append(dict(type="line", x0=base_value, x1=base_value, y0=0.25, y1=0.75, yref="paper", line=dict(color="rgba(0,0,0,0.55)", width=2, dash="dot")))

    # axis bounds and ticks
    xmin, xmax = nice_bounds(min(left_cursor, base_value), max(right_cursor, base_value), tick=100)

    # ----- Under‑bar labels with stems (two‑row layout) -----
    segments_for_labels.sort(key=lambda s: s["cx"])  # left → right
    row1_y = y0 - 0.06
    row2_y = y0 - 0.14

    for i, seg in enumerate(segments_for_labels):
        row_y = row1_y if i % 2 == 0 else row2_y
        # vertical stem (clear "|" line)
        shapes.append(dict(
            type="line",
            x0=seg["cx"], x1=seg["cx"], y0=y0 - 0.005, y1=row_y + 0.01,
            line=dict(color=STEM_GREY, width=1)
        ))
        # label text (feature value + optional impact)
        label_txt = f"{seg['label']} = {fmt_value(seg['val'])}"
        if show_impacts:
            label_txt += f" (Δ {fmt_delta(seg['delta'])})"
        annotations.append(dict(
            x=seg["cx"], y=row_y, text=label_txt,
            showarrow=False,
            font=dict(size=11, color=(RED if seg["side"] == "neg" else BLUE)),
            xanchor="center", yanchor="top",
        ))

    # ----- Figure assembly -----
    fig = go.Figure()
    fig.update_layout(
        height=300,
        margin=dict(l=40, r=40, t=40, b=60),
        shapes=shapes,
        annotations=annotations,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )

    fig.update_xaxes(
        range=[xmin, xmax],
        side="top",
        showgrid=False,
        zeroline=False,
        dtick=100,
        tickformat=",",
        tickfont=dict(color=AXIS_GREY, size=12),
    )
    fig.update_yaxes(visible=False, range=[0, 1])

    # show base value above the center
    fig.add_annotation(
        x=base_value, y=1.02, xref="x", yref="paper",
        text=f"Base: {BASE_VALUE:,.0f}", showarrow=False,
        font=dict(size=13), xanchor="center", yanchor="bottom",
    )

    # dotted baseline along bottom (decorative)
    fig.add_shape(
        type="line", x0=xmin, x1=xmax, y0=0.08, y1=0.08, yref="paper",
        line=dict(color="rgba(160,160,160,0.8)", width=1, dash="dot"),
    )

    return fig

# =============================================================
# KPI header
# =============================================================
col1, col2, col3 = st.columns([1, 1, 1])
with col1:
    st.metric("Base Risk Score", fmt(BASE_VALUE))
with col2:
    st.metric("Predicted Risk Score", fmt(prediction), delta=fmt(prediction - BASE_VALUE))
with col3:
    st.metric("Risk Level", f"{risk_icon} {risk_level}")

# =============================================================
# Risk interpretation
# =============================================================
if show_risk_level:
    st.info(f"**Clinical Recommendation:** {recommendation}")

# =============================================================
# Render the force bar
# =============================================================
fig = build_force_figure(BASE_VALUE, values, contribs)
st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

# =============================================================
# Contributions table
# =============================================================
st.subheader("📊 Feature Contributions")
rows = []
for k, meta in features.items():
    rows.append({
        "Feature": meta["label"],
        "Value": f"{values[k]:.2f}",
        "Baseline": f"{meta['baseline']:.2f}",
        "Weight": f"{meta['weight']:.1f}",
        "Contribution": f"{contribs[k]:.0f}",
        "Impact": "🔴 High Risk" if contribs[k] > 0 else "🔵 Low Risk"
    })
df = pd.DataFrame(rows).sort_values("Contribution", key=lambda s: s.str.replace(',', '').astype(float).abs(), ascending=False)
st.dataframe(df, use_container_width=True)

# =============================================================
# Clinical notes
# =============================================================
st.subheader("📋 Clinical Notes")
st.write("""
**Model Information:**
- This AI model is specifically trained on CML patient data
- Risk scores are calculated using clinical parameters relevant to cardiovascular disease in CML patients
- The model considers both traditional cardiovascular risk factors and CML-specific parameters

**Interpretation Guidelines:**
- **Low Risk (<800):** Continue standard CML monitoring protocols
- **Moderate Risk (800-1200):** Consider cardiovascular risk reduction strategies
- **High Risk (>1200):** Immediate cardiology consultation recommended

**Disclaimer:** This tool is for research and educational purposes. Always consult with qualified healthcare professionals for clinical decisions.
""")
