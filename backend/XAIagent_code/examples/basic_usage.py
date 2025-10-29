"""
Basic Usage Examples for CVD Agent System

This demonstrates the basic functionality of the multi-agent system
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from orchestrator import CVDAgentOrchestrator


def example_1_simple_prediction():
    """
    Example 1: Simple risk prediction without OpenAI
    """
    print("\n" + "="*60)
    print("Example 1: Simple Risk Prediction (No OpenAI needed)")
    print("="*60)

    # Initialize with no API key - prediction only
    orchestrator = CVDAgentOrchestrator()

    # Patient data
    patient_data = {
        "anchor_age": 56.0,
        "White Blood Cells": 85.1,
        "Urea Nitrogen": 16.0,
        "Neutrophils": 57.0,
        "BMI": 39.1,
        "Monocytes": 1.0,
        "Glucose": 87.0,
        "systolic": 148.0,
        "MCH": 28.6,
        "Calcium, Total": 8.5,
        "Lymphocytes": 7.0,
        "Creatinine": 1.2,
        "Sodium": 140.0,
        "diastolic": 81.0,
        "PT": 12.6,
        "imatinib_dose": 0.0,
        "dasatinib_dose": 0.0,
        "gender_encoded": 1.0,
        "nilotinib_dose": 0.0,
        "ponatinib_dose": 0.0,
        "ruxolitinib_dose": 0.0
    }

    # Make prediction
    result = orchestrator.prediction_agent.predict(patient_data)

    print(f"\nCVD Risk Score: {result['risk_score']:.2%}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Prediction: {'CVD Risk' if result['prediction'] == 1 else 'No CVD Risk'}")

    print("\nTop 5 Risk Factors:")
    top_factors = orchestrator.prediction_agent.get_top_risk_factors(result, n=5)
    for feature, shap_value in top_factors.items():
        value = patient_data[feature]
        print(f"  {feature}: {value} (SHAP: {shap_value:+.4f})")

    print("\nProtective Factors:")
    protective = orchestrator.prediction_agent.get_protective_factors(result, n=3)
    for feature, shap_value in protective.items():
        value = patient_data[feature]
        print(f"  {feature}: {value} (SHAP: {shap_value:+.4f})")


def example_2_full_analysis():
    """
    Example 2: Full analysis with explanations (requires OpenAI API key)
    """
    print("\n" + "="*60)
    print("Example 2: Full Analysis with AI Explanations")
    print("="*60)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\nSkipping - OPENAI_API_KEY not set")
        print("Set environment variable: export OPENAI_API_KEY='your-key'")
        return

    # Initialize with API key
    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

    # Load patient from file
    patient_file = Path(__file__).parent.parent.parent / "CML_CVD_Model" / "RunningScript" / "patient_adam.json"

    if patient_file.exists():
        patient_data = orchestrator.load_patient_from_file(str(patient_file))

        # Run full analysis
        result = orchestrator.analyze_patient(patient_data, detail_level="moderate")

        print(f"\nRisk Score: {result['prediction']['risk_score']:.2%}")
        print(f"Risk Level: {result['prediction']['risk_level']}")

        print("\n" + "-"*60)
        print("AI-Generated Explanation:")
        print("-"*60)
        print(result['explanation'])

        print("\n" + "-"*60)
        print("AI-Generated Interventions:")
        print("-"*60)
        print(result['interventions'])
    else:
        print(f"Patient file not found: {patient_file}")


def example_3_interactive_qa():
    """
    Example 3: Interactive Q&A with Knowledge Agent
    """
    print("\n" + "="*60)
    print("Example 3: Interactive Q&A")
    print("="*60)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\nSkipping - OPENAI_API_KEY not set")
        return

    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

    questions = [
        "What is a normal BMI range and why does it matter for heart health?",
        "How do TKI medications affect cardiovascular risk?",
        "What does systolic blood pressure tell us about CVD risk?"
    ]

    for question in questions:
        print(f"\nQ: {question}")
        answer = orchestrator.ask_question(question)
        print(f"A: {answer}")


def example_4_what_if_scenarios():
    """
    Example 4: What-if scenario comparison
    """
    print("\n" + "="*60)
    print("Example 4: What-If Scenario Analysis")
    print("="*60)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\nSkipping - OPENAI_API_KEY not set")
        return

    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

    # Current state
    current_patient = {
        "anchor_age": 56.0,
        "White Blood Cells": 85.1,
        "Urea Nitrogen": 16.0,
        "Neutrophils": 57.0,
        "BMI": 39.1,  # Obese
        "Monocytes": 1.0,
        "Glucose": 87.0,
        "systolic": 148.0,  # High
        "MCH": 28.6,
        "Calcium, Total": 8.5,
        "Lymphocytes": 7.0,
        "Creatinine": 1.2,
        "Sodium": 140.0,
        "diastolic": 81.0,
        "PT": 12.6,
        "imatinib_dose": 0.0,
        "dasatinib_dose": 0.0,
        "gender_encoded": 1.0,
        "nilotinib_dose": 0.0,
        "ponatinib_dose": 0.0,
        "ruxolitinib_dose": 0.0
    }

    # What if BMI was reduced and BP controlled?
    improved_patient = current_patient.copy()
    improved_patient["BMI"] = 25.0  # Normal BMI
    improved_patient["systolic"] = 120.0  # Normal BP
    improved_patient["diastolic"] = 75.0  # Normal BP

    # Compare scenarios
    comparison = orchestrator.compare_scenarios(
        current_patient,
        improved_patient,
        label1="Current State",
        label2="After Weight Loss & BP Control"
    )

    print(f"\nCurrent Risk: {comparison['scenario1']['prediction']['risk_score']:.2%}")
    print(f"Improved Risk: {comparison['scenario2']['prediction']['risk_score']:.2%}")
    print(f"Risk Reduction: {comparison['risk_change']:.2%} ({comparison['risk_change_percent']:.1f}%)")

    print("\n" + "-"*60)
    print("Comparison Analysis:")
    print("-"*60)
    print(comparison['comparison_explanation'])


def example_5_action_plan():
    """
    Example 5: Generate action plan
    """
    print("\n" + "="*60)
    print("Example 5: Generate Personalized Action Plan")
    print("="*60)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\nSkipping - OPENAI_API_KEY not set")
        return

    orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

    # Analyze patient first
    patient_file = Path(__file__).parent.parent.parent / "CML_CVD_Model" / "RunningScript" / "patient_adam.json"

    if patient_file.exists():
        patient_data = orchestrator.load_patient_from_file(str(patient_file))
        orchestrator.analyze_patient(patient_data, detail_level="brief")

        # Generate 3-month action plan
        plan = orchestrator.generate_action_plan(timeframe="3months")

        print("\n" + "-"*60)
        print("3-Month Action Plan:")
        print("-"*60)
        print(plan)

        # Get what-if suggestions
        print("\n" + "-"*60)
        print("Suggested What-If Scenarios to Explore:")
        print("-"*60)
        whatif = orchestrator.get_whatif_suggestions()
        print(whatif)
    else:
        print(f"Patient file not found: {patient_file}")


if __name__ == "__main__":
    # Run examples
    example_1_simple_prediction()

    # These require OpenAI API key
    example_2_full_analysis()
    example_3_interactive_qa()
    example_4_what_if_scenarios()
    example_5_action_plan()

    print("\n" + "="*60)
    print("Examples complete!")
    print("="*60)
