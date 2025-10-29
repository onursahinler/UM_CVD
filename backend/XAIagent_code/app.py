"""
Streamlit UI for CVD Risk Assessment Multi-Agent System
"""

import streamlit as st
import json
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from pathlib import Path
import sys
import os

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import CVDAgentOrchestrator
from config import FEATURE_INFO

# Page configuration
st.set_page_config(
    page_title="CVD Risk Assessment",
    page_icon="🫀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 1rem;
    }
    .risk-high {
        background-color: #ffebee;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 5px solid #f44336;
    }
    .risk-moderate {
        background-color: #fff3e0;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 5px solid #ff9800;
    }
    .risk-low {
        background-color: #e8f5e9;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 5px solid #4caf50;
    }
    .metric-card {
        background-color: #f5f5f5;
        padding: 1rem;
        border-radius: 0.5rem;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'orchestrator' not in st.session_state:
    st.session_state.orchestrator = None
if 'current_analysis' not in st.session_state:
    st.session_state.current_analysis = None
if 'patient_data' not in st.session_state:
    st.session_state.patient_data = None

# Sidebar
with st.sidebar:
    st.image("https://img.icons8.com/color/96/000000/cardiology.png", width=100)
    st.title("CVD Risk Assessment")
    st.markdown("---")

    # API Key input
    api_key = st.text_input(
        "OpenAI API Key",
        type="password",
        help="Required for AI explanations, Q&A, and interventions. Leave empty for prediction-only mode.",
        placeholder="sk-..."
    )

    # Initialize orchestrator
    if st.button("Initialize System", type="primary"):
        with st.spinner("Initializing agent system..."):
            try:
                st.session_state.orchestrator = CVDAgentOrchestrator(
                    openai_api_key=api_key if api_key else None
                )
                st.success("System initialized successfully!")
                if not api_key:
                    st.info("Running in prediction-only mode. Add API key for full features.")
            except Exception as e:
                st.error(f"Initialization failed: {e}")

    st.markdown("---")

    # Navigation
    st.subheader("Navigation")
    page = st.radio(
        "Select Page",
        ["Patient Analysis", "Scenario Comparison", "Q&A", "Action Plan"],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.caption("CVD Risk Assessment Multi-Agent System")

# Main content
if st.session_state.orchestrator is None:
    st.markdown('<p class="main-header">🫀 CVD Risk Assessment System</p>', unsafe_allow_html=True)
    st.info("Please initialize the system using the sidebar to get started.")

    st.markdown("### Features")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**🔍 Prediction**")
        st.write("- CVD risk probability")
        st.write("- SHAP-based explanations")
        st.write("- Risk factor analysis")

        st.markdown("**🤖 AI Explanations**")
        st.write("- Natural language insights")
        st.write("- Evidence-based recommendations")

    with col2:
        st.markdown("**💡 Interventions**")
        st.write("- Personalized action plans")
        st.write("- What-if scenarios")
        st.write("- Progress tracking")

        st.markdown("**❓ Q&A System**")
        st.write("- Ask about features")
        st.write("- Medical concepts")
        st.write("- CML and CVD education")

else:
    # Page: Patient Analysis
    if page == "Patient Analysis":
        st.markdown('<p class="main-header">Patient Analysis</p>', unsafe_allow_html=True)

        # Input method selection
        input_method = st.radio(
            "Choose input method:",
            ["Manual Entry", "Upload JSON"],
            horizontal=True
        )

        patient_data = None

        if input_method == "Upload JSON":
            uploaded_file = st.file_uploader(
                "Upload patient JSON file",
                type=['json'],
                help="Upload a JSON file with patient data"
            )

            if uploaded_file is not None:
                try:
                    data = json.load(uploaded_file)
                    if isinstance(data, list):
                        patient_data = data[0]
                    else:
                        patient_data = data
                    st.success("Patient data loaded successfully!")
                except Exception as e:
                    st.error(f"Error loading file: {e}")

        else:  # Manual Entry
            st.markdown("### Patient Information")

            with st.form("patient_form"):
                col1, col2, col3 = st.columns(3)

                patient_data = {}

                # Demographics
                with col1:
                    st.markdown("**Demographics**")
                    patient_data['anchor_age'] = st.number_input("Age", min_value=18, max_value=120, value=56)
                    patient_data['gender_encoded'] = st.selectbox("Gender", [0, 1], format_func=lambda x: "Female" if x == 0 else "Male")
                    patient_data['BMI'] = st.number_input("BMI", min_value=10.0, max_value=60.0, value=25.0, step=0.1)

                # Vital Signs
                with col2:
                    st.markdown("**Vital Signs**")
                    patient_data['systolic'] = st.number_input("Systolic BP", min_value=70, max_value=250, value=120)
                    patient_data['diastolic'] = st.number_input("Diastolic BP", min_value=40, max_value=150, value=80)

                # Lab Values - Blood Cells
                with col3:
                    st.markdown("**Blood Cells**")
                    patient_data['White Blood Cells'] = st.number_input("WBC", min_value=0.0, max_value=200.0, value=7.0, step=0.1)
                    patient_data['Neutrophils'] = st.number_input("Neutrophils (%)", min_value=0.0, max_value=100.0, value=60.0, step=0.1)
                    patient_data['Lymphocytes'] = st.number_input("Lymphocytes (%)", min_value=0.0, max_value=100.0, value=30.0, step=0.1)
                    patient_data['Monocytes'] = st.number_input("Monocytes (%)", min_value=0.0, max_value=100.0, value=8.0, step=0.1)

                # Additional lab values
                col4, col5, col6 = st.columns(3)

                with col4:
                    st.markdown("**Chemistry**")
                    patient_data['Glucose'] = st.number_input("Glucose", min_value=0.0, max_value=500.0, value=90.0, step=1.0)
                    patient_data['Urea Nitrogen'] = st.number_input("Urea Nitrogen", min_value=0.0, max_value=100.0, value=15.0, step=0.1)
                    patient_data['Creatinine'] = st.number_input("Creatinine", min_value=0.0, max_value=15.0, value=1.0, step=0.1)
                    patient_data['Sodium'] = st.number_input("Sodium", min_value=100.0, max_value=170.0, value=140.0, step=0.1)
                    patient_data['Calcium, Total'] = st.number_input("Calcium", min_value=0.0, max_value=15.0, value=9.0, step=0.1)

                with col5:
                    st.markdown("**Hematology**")
                    patient_data['MCH'] = st.number_input("MCH", min_value=15.0, max_value=40.0, value=28.0, step=0.1)
                    patient_data['PT'] = st.number_input("PT", min_value=5.0, max_value=30.0, value=12.0, step=0.1)

                # TKI Medications
                with col6:
                    st.markdown("**TKI Medications (mg/day)**")
                    patient_data['imatinib_dose'] = st.number_input("Imatinib", min_value=0.0, max_value=800.0, value=0.0, step=100.0)
                    patient_data['dasatinib_dose'] = st.number_input("Dasatinib", min_value=0.0, max_value=200.0, value=0.0, step=20.0)
                    patient_data['nilotinib_dose'] = st.number_input("Nilotinib", min_value=0.0, max_value=800.0, value=0.0, step=100.0)
                    patient_data['ponatinib_dose'] = st.number_input("Ponatinib", min_value=0.0, max_value=100.0, value=0.0, step=5.0)
                    patient_data['ruxolitinib_dose'] = st.number_input("Ruxolitinib", min_value=0.0, max_value=50.0, value=0.0, step=5.0)

                submit_button = st.form_submit_button("Analyze Patient", type="primary")

        # Analyze button (outside form for JSON upload)
        if input_method == "Upload JSON" and patient_data is not None:
            if st.button("Analyze Patient", type="primary"):
                submit_button = True
            else:
                submit_button = False

        # Perform analysis
        if patient_data and (input_method == "Manual Entry" and submit_button or input_method == "Upload JSON" and 'submit_button' in locals() and submit_button):
            with st.spinner("Analyzing patient..."):
                try:
                    result = st.session_state.orchestrator.analyze_patient(
                        patient_data,
                        detail_level="moderate"
                    )
                    st.session_state.current_analysis = result
                    st.session_state.patient_data = patient_data

                    # Display results
                    st.markdown("---")
                    st.markdown("## Analysis Results")

                    # Risk Score Display
                    risk_score = result['prediction']['risk_score']
                    risk_level = result['prediction']['risk_level']

                    # Risk level styling
                    risk_class = f"risk-{risk_level.lower()}"

                    col1, col2, col3 = st.columns([2, 2, 3])

                    with col1:
                        st.markdown(f'<div class="{risk_class}">', unsafe_allow_html=True)
                        st.metric("CVD Risk Score", f"{risk_score:.1%}")
                        st.markdown('</div>', unsafe_allow_html=True)

                    with col2:
                        st.markdown(f'<div class="{risk_class}">', unsafe_allow_html=True)
                        st.metric("Risk Level", risk_level)
                        st.markdown('</div>', unsafe_allow_html=True)

                    with col3:
                        # Risk gauge
                        fig = go.Figure(go.Indicator(
                            mode="gauge+number",
                            value=risk_score * 100,
                            domain={'x': [0, 1], 'y': [0, 1]},
                            title={'text': "Risk Score"},
                            gauge={
                                'axis': {'range': [0, 100]},
                                'bar': {'color': "darkblue"},
                                'steps': [
                                    {'range': [0, 30], 'color': "#4caf50"},
                                    {'range': [30, 70], 'color': "#ff9800"},
                                    {'range': [70, 100], 'color': "#f44336"}
                                ],
                                'threshold': {
                                    'line': {'color': "red", 'width': 4},
                                    'thickness': 0.75,
                                    'value': 90
                                }
                            }
                        ))
                        fig.update_layout(height=250, margin=dict(l=20, r=20, t=50, b=20))
                        st.plotly_chart(fig, use_container_width=True)

                    # AI Explanation
                    if result['explanation']:
                        st.markdown("### 📝 AI Explanation")
                        st.info(result['explanation'])

                    # Risk Factors Visualization
                    st.markdown("### 📊 Risk Factors Analysis")

                    col1, col2 = st.columns(2)

                    with col1:
                        st.markdown("**Top Risk Factors (Increasing CVD Risk)**")
                        top_risks = result['top_risk_factors']

                        if top_risks:
                            # Create DataFrame for visualization
                            risk_df = pd.DataFrame([
                                {'Feature': k, 'SHAP Value': v, 'Patient Value': patient_data.get(k, 0)}
                                for k, v in top_risks.items()
                            ])

                            # Bar chart
                            fig = px.bar(
                                risk_df,
                                x='SHAP Value',
                                y='Feature',
                                orientation='h',
                                color='SHAP Value',
                                color_continuous_scale='Reds',
                                title="SHAP Values (Positive = Increases Risk)"
                            )
                            fig.update_layout(showlegend=False, height=400)
                            st.plotly_chart(fig, use_container_width=True)

                            # Table
                            st.dataframe(risk_df, use_container_width=True, hide_index=True)

                    with col2:
                        st.markdown("**Protective Factors (Decreasing CVD Risk)**")
                        protective = result['protective_factors']

                        if protective:
                            # Create DataFrame for visualization
                            protect_df = pd.DataFrame([
                                {'Feature': k, 'SHAP Value': abs(v), 'Patient Value': patient_data.get(k, 0)}
                                for k, v in protective.items()
                            ])

                            # Bar chart
                            fig = px.bar(
                                protect_df,
                                x='SHAP Value',
                                y='Feature',
                                orientation='h',
                                color='SHAP Value',
                                color_continuous_scale='Greens',
                                title="SHAP Values (Positive = Decreases Risk)"
                            )
                            fig.update_layout(showlegend=False, height=400)
                            st.plotly_chart(fig, use_container_width=True)

                            # Table
                            st.dataframe(protect_df, use_container_width=True, hide_index=True)
                        else:
                            st.info("No significant protective factors found")

                    # Interventions
                    if result['interventions']:
                        st.markdown("### 💊 Recommended Interventions")
                        st.markdown(result['interventions'])

                except Exception as e:
                    st.error(f"Analysis failed: {e}")
                    import traceback
                    st.code(traceback.format_exc())

    # Page: Scenario Comparison
    elif page == "Scenario Comparison":
        st.markdown('<p class="main-header">Scenario Comparison</p>', unsafe_allow_html=True)

        st.info("Compare different scenarios to see the impact of interventions on CVD risk")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("### Scenario 1: Current State")
            scenario1_method = st.radio("Input method:", ["Use Current Analysis", "Upload JSON", "Manual"], key="s1_method")

            scenario1_data = None
            if scenario1_method == "Use Current Analysis" and st.session_state.patient_data:
                scenario1_data = st.session_state.patient_data
                st.success("Using current patient data")
            elif scenario1_method == "Upload JSON":
                file1 = st.file_uploader("Upload Scenario 1 JSON", type=['json'], key="s1_file")
                if file1:
                    data = json.load(file1)
                    scenario1_data = data[0] if isinstance(data, list) else data

            scenario1_label = st.text_input("Scenario 1 Label", value="Current", key="s1_label")

        with col2:
            st.markdown("### Scenario 2: Proposed Changes")
            scenario2_method = st.radio("Input method:", ["Modify Current", "Upload JSON"], key="s2_method")

            scenario2_data = None
            if scenario2_method == "Modify Current" and st.session_state.patient_data:
                st.markdown("**Select parameters to modify:**")
                scenario2_data = st.session_state.patient_data.copy()

                mod_bmi = st.checkbox("Modify BMI")
                if mod_bmi:
                    scenario2_data['BMI'] = st.number_input("New BMI", value=25.0, step=0.1, key="s2_bmi")

                mod_bp = st.checkbox("Modify Blood Pressure")
                if mod_bp:
                    scenario2_data['systolic'] = st.number_input("New Systolic BP", value=120, key="s2_sys")
                    scenario2_data['diastolic'] = st.number_input("New Diastolic BP", value=80, key="s2_dia")

                mod_glucose = st.checkbox("Modify Glucose")
                if mod_glucose:
                    scenario2_data['Glucose'] = st.number_input("New Glucose", value=90.0, step=1.0, key="s2_glu")

            elif scenario2_method == "Upload JSON":
                file2 = st.file_uploader("Upload Scenario 2 JSON", type=['json'], key="s2_file")
                if file2:
                    data = json.load(file2)
                    scenario2_data = data[0] if isinstance(data, list) else data

            scenario2_label = st.text_input("Scenario 2 Label", value="After Interventions", key="s2_label")

        if st.button("Compare Scenarios", type="primary"):
            if scenario1_data and scenario2_data:
                with st.spinner("Comparing scenarios..."):
                    try:
                        comparison = st.session_state.orchestrator.compare_scenarios(
                            scenario1_data,
                            scenario2_data,
                            label1=scenario1_label,
                            label2=scenario2_label
                        )

                        st.markdown("---")
                        st.markdown("## Comparison Results")

                        # Summary metrics
                        col1, col2, col3 = st.columns(3)

                        with col1:
                            st.metric(
                                f"{scenario1_label} Risk",
                                f"{comparison['scenario1']['prediction']['risk_score']:.1%}"
                            )

                        with col2:
                            st.metric(
                                f"{scenario2_label} Risk",
                                f"{comparison['scenario2']['prediction']['risk_score']:.1%}",
                                delta=f"{comparison['risk_change']:.1%}"
                            )

                        with col3:
                            st.metric(
                                "Relative Change",
                                f"{comparison['risk_change_percent']:.1f}%"
                            )

                        # Visualization
                        fig = go.Figure()

                        scenarios = [scenario1_label, scenario2_label]
                        risks = [
                            comparison['scenario1']['prediction']['risk_score'] * 100,
                            comparison['scenario2']['prediction']['risk_score'] * 100
                        ]

                        fig.add_trace(go.Bar(
                            x=scenarios,
                            y=risks,
                            text=[f"{r:.1f}%" for r in risks],
                            textposition='auto',
                            marker_color=['#ff9800', '#4caf50' if risks[1] < risks[0] else '#f44336']
                        ))

                        fig.update_layout(
                            title="CVD Risk Comparison",
                            yaxis_title="Risk Score (%)",
                            height=400
                        )

                        st.plotly_chart(fig, use_container_width=True)

                        # AI Comparison
                        if comparison['comparison_explanation']:
                            st.markdown("### 📝 AI Analysis")
                            st.info(comparison['comparison_explanation'])

                    except Exception as e:
                        st.error(f"Comparison failed: {e}")
            else:
                st.warning("Please provide data for both scenarios")

    # Page: Q&A
    elif page == "Q&A":
        st.markdown('<p class="main-header">Ask Questions</p>', unsafe_allow_html=True)

        if not st.session_state.orchestrator.knowledge_agent:
            st.warning("Knowledge agent requires OpenAI API key. Please initialize with an API key.")
        else:
            st.info("Ask questions about features, medical concepts, CML, or CVD risk factors")

            # Quick questions
            st.markdown("### Quick Questions")
            quick_questions = [
                "What is a normal BMI range and why does it matter for CVD?",
                "How does systolic blood pressure affect CVD risk?",
                "What are TKI medications and their cardiovascular effects?",
                "What is the relationship between glucose levels and CVD?",
                "How do neutrophils relate to cardiovascular health?"
            ]

            selected_question = st.selectbox("Select a question or type your own below:", ["Custom"] + quick_questions)

            if selected_question == "Custom":
                question = st.text_area("Your question:", placeholder="Type your question here...")
            else:
                question = selected_question

            if st.button("Ask", type="primary"):
                if question:
                    with st.spinner("Getting answer..."):
                        try:
                            answer = st.session_state.orchestrator.ask_question(question)
                            st.markdown("### Answer")
                            st.success(answer)
                        except Exception as e:
                            st.error(f"Error: {e}")
                else:
                    st.warning("Please enter a question")

            # Feature explanation
            st.markdown("---")
            st.markdown("### Feature Explanation")

            features = list(FEATURE_INFO.keys())
            selected_feature = st.selectbox("Select a feature to explain:", features)

            if st.button("Explain Feature"):
                with st.spinner("Getting explanation..."):
                    try:
                        explanation = st.session_state.orchestrator.explain_feature(selected_feature)
                        st.markdown(f"### {selected_feature}")
                        st.info(explanation)
                    except Exception as e:
                        st.error(f"Error: {e}")

    # Page: Action Plan
    elif page == "Action Plan":
        st.markdown('<p class="main-header">Action Plan Generator</p>', unsafe_allow_html=True)

        if not st.session_state.orchestrator.intervention_agent:
            st.warning("Intervention agent requires OpenAI API key. Please initialize with an API key.")
        elif not st.session_state.current_analysis:
            st.warning("Please analyze a patient first in the 'Patient Analysis' page")
        else:
            st.info("Generate personalized action plans based on the current patient analysis")

            timeframe = st.select_slider(
                "Select timeframe:",
                options=["1month", "3months", "6months"],
                value="3months",
                format_func=lambda x: x.replace("month", " Month").replace("s", "s")
            )

            if st.button("Generate Action Plan", type="primary"):
                with st.spinner("Generating action plan..."):
                    try:
                        plan = st.session_state.orchestrator.generate_action_plan(timeframe)
                        st.markdown("### Your Personalized Action Plan")
                        st.markdown(plan)
                    except Exception as e:
                        st.error(f"Error: {e}")

            # What-if scenarios
            st.markdown("---")
            st.markdown("### What-If Scenarios")
            st.info("Get AI-suggested scenarios to explore potential interventions")

            if st.button("Get What-If Suggestions"):
                with st.spinner("Generating suggestions..."):
                    try:
                        suggestions = st.session_state.orchestrator.get_whatif_suggestions()
                        st.markdown(suggestions)
                    except Exception as e:
                        st.error(f"Error: {e}")

# Footer
st.markdown("---")
st.caption("CVD Risk Assessment Multi-Agent System | Research Use Only | Not for Clinical Diagnosis")
