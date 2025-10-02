import math
import streamlit as st
import plotly.graph_objects as go
import pandas as pd

# =============================================================
# Streamlit setup
# =============================================================
st.set_page_config(page_title="SHAP‑style Explainer Bar", layout="wide")
st.title("Interactive SHAP‑style Explainer Bar (Streamlit + Plotly)")
st.write(
    "Tweak the feature values on the left. The SHAP‑style force bar and the prediction update instantly."
)

# =============================================================
# Toy linear model (easy to replace with your own)
# =============================================================
# prediction = base_value + Σ weight[i] * (value[i] - baseline[i])
BASE_VALUE = 22556.52  # model expected value (e.g., mean prediction)

features = {
    "pct_built_before_1940": {
        "label": "% built before 1940",
        "weight": +80.0,
        "baseline": 50.0,
        "min": 0.0,
        "max": 100.0,
        "step": 0.1,
        "init": 67.2,
    },
    "remoteness": {
        "label": "remoteness",
        "weight": -600.0,
        "baseline": 2.5,
        "min": 0.0,
        "max": 6.0,
        "step": 0.001,
        "init": 3.5325,
    },
    "crime_rate": {
        "label": "crime rate",
        "weight": -15000.0,
        "baseline": 0.25,
        "min": 0.0,
        "max": 1.0,
        "step": 0.00001,
        "init": 0.40202,
    },
    "num_rooms": {
        "label": "number of rooms",
        "weight": +900.0,
        "baseline": 5.5,
        "min": 1.0,
        "max": 10.0,
        "step": 0.001,
        "init": 6.382,
    },
    "connectedness": {
        "label": "connectedness",
        "weight": +700.0,
        "baseline": 2.0,
        "min": 0.0,
        "max": 5.0,
        "step": 0.1,
        "init": 4.0,
    },
}

# Colors tuned to resemble the reference image
RED = "#ff3b6a"
BLUE = "#2f80ff"
AXIS_GREY = "#6d6d6d"
STEM_GREY = "rgba(120,120,120,0.8)"

# =============================================================
# Sidebar controls (interactive)
# =============================================================
with st.sidebar:
    st.header("Feature inputs")
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

    st.header("Labels")
    show_impacts = st.checkbox("Show impact (Δ) next to values", value=True)

# =============================================================
# Contributions & prediction
# =============================================================
contribs = {
    k: features[k]["weight"] * (values[k] - features[k]["baseline"]) for k in features
}
prediction = BASE_VALUE + sum(contribs.values())

fmt = lambda x: f"{x:,.2f}"
fmt_value = lambda v: f"{v:.4f}"  # feature value formatting (like screenshot)
fmt_delta = lambda d: ("+" if d >= 0 else "") + f"{d:,.0f}"  # signed contribution

# =============================================================
# Helpers for figure construction
# =============================================================

def nice_bounds(xmin: float, xmax: float, tick: int = 500):
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
    """Build a SHAP‑style force bar using Plotly shapes.

    Layout rules:
      • Red (negative) segments grow left from the base; blue (positive) grow right.
      • Double white chevrons at each segment boundary and the far ends.
      • A dashed vertical line marks the base value.
      • Top ticks every 500 with thousands separators.
      • **Under‑bar labels** for every segment with trapezoidal stems, closer to the bar.
    """
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
    xmin, xmax = nice_bounds(min(left_cursor, base_value), max(right_cursor, base_value), tick=500)

    # ----- Under‑bar labels with trapezoidal stems (closer to bar) -----
    segments_for_labels.sort(key=lambda s: s["cx"])  # left → right
    label_y = y0 - 0.03  # Much closer to the bar

    for i, seg in enumerate(segments_for_labels):
        # Trapezoidal stem connecting label to bar segment
        stem_width = 0.008  # Width of the trapezoid at the top
        stem_bottom_width = 0.015  # Width of the trapezoid at the bottom
        
        # Create trapezoidal path
        if seg["side"] == "neg":
            # Red trapezoid pointing up
            trapezoid_path = f"M{seg['cx'] - stem_width/2},{y0 - 0.005} L{seg['cx'] + stem_width/2},{y0 - 0.005} L{seg['cx'] + stem_bottom_width/2},{label_y + 0.008} L{seg['cx'] - stem_bottom_width/2},{label_y + 0.008} Z"
        else:
            # Blue trapezoid pointing up
            trapezoid_path = f"M{seg['cx'] - stem_width/2},{y0 - 0.005} L{seg['cx'] + stem_width/2},{y0 - 0.005} L{seg['cx'] + stem_bottom_width/2},{label_y + 0.008} L{seg['cx'] - stem_bottom_width/2},{label_y + 0.008} Z"
        
        shapes.append(dict(
            type="path",
            path=trapezoid_path,
            line=dict(width=0),
            fillcolor=(RED if seg["side"] == "neg" else BLUE),
            opacity=0.7
        ))
        
        # Label text with impact shown on the bar
        label_txt = f"{seg['label']} = {fmt_value(seg['val'])}"
        annotations.append(dict(
            x=seg["cx"], y=label_y, text=label_txt,
            showarrow=False,
            font=dict(size=11, color=(RED if seg["side"] == "neg" else BLUE)),
            xanchor="center", yanchor="top",
        ))
        
        # Show impact (Δ) on the bar itself
        if show_impacts:
            impact_text = f"Δ {fmt_delta(seg['delta'])}"
            annotations.append(dict(
                x=seg["cx"], y=(y0 + y1) / 2, text=impact_text,
                showarrow=False,
                font=dict(size=10, color="white", family="Arial Black"),
                xanchor="center", yanchor="middle",
            ))

    # ----- Figure assembly -----
    fig = go.Figure()
    fig.update_layout(
        height=280,  # Slightly taller to accommodate closer labels
        margin=dict(l=40, r=40, t=20, b=50),
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
        dtick=500,
        tickformat=",",
        tickfont=dict(color=AXIS_GREY, size=12),
    )
    fig.update_yaxes(visible=False, range=[0, 1])

    # show base value above the center
    fig.add_annotation(
        x=base_value, y=1.02, xref="x", yref="paper",
        text=f"{BASE_VALUE:,.2f}", showarrow=False,
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
col1, col2, _ = st.columns([1, 1, 2])
with col1:
    st.metric("Base value", fmt(BASE_VALUE))
with col2:
    st.metric("Prediction", fmt(prediction), delta=fmt(prediction - BASE_VALUE))

# =============================================================
# Render the force bar
# =============================================================
fig = build_force_figure(BASE_VALUE, values, contribs)
st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

# =============================================================
# Contributions table (optional)
# =============================================================
rows = []
for k, meta in features.items():
    rows.append({
        "feature": meta["label"],
        "value": values[k],
        "baseline": meta["baseline"],
        "weight": meta["weight"],
        "contribution": contribs[k],
    })
df = pd.DataFrame(rows).sort_values("contribution", key=lambda s: s.abs(), ascending=False)
st.dataframe(df, use_container_width=True)
