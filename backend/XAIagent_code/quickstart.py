"""
Quick Start Demo for CVD Agent System

This script demonstrates the key features of the multi-agent system
with a simple, guided demo.
"""
import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70 + "\n")


def demo_prediction_only():
    """Demo: Prediction without OpenAI API (works offline)"""
    print_section("DEMO 1: CVD Risk Prediction (No API Key Needed)")

    try:
        from agents.prediction_agent import PredictionAgent

        # Initialize and load model
        print("Loading XAI model...")
        agent = PredictionAgent()
        agent.load_model()
        print("✓ Model loaded\n")

        # Sample patient data
        patient = {
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

        print("Analyzing patient (Male, 56 years old, BMI 39.1, BP 148/81)...")
        result = agent.predict(patient)

        # Display results
        print("\n" + "-"*70)
        print("PREDICTION RESULTS")
        print("-"*70)
        print(f"CVD Risk Score:  {result['risk_score']:.2%}")
        print(f"Risk Level:      {result['risk_level']}")
        print(f"Binary Prediction: {'High Risk' if result['prediction'] == 1 else 'Low Risk'}")

        # Top risk factors
        print("\n" + "-"*70)
        print("TOP 5 RISK FACTORS (Increasing CVD Risk)")
        print("-"*70)
        top_risks = agent.get_top_risk_factors(result, n=5)
        for i, (feature, shap_val) in enumerate(top_risks.items(), 1):
            value = patient[feature]
            print(f"{i}. {feature:20s} = {value:6.1f}   (SHAP: {shap_val:+.4f})")

        # Protective factors
        print("\n" + "-"*70)
        print("PROTECTIVE FACTORS (Decreasing CVD Risk)")
        print("-"*70)
        protective = agent.get_protective_factors(result, n=3)
        if protective:
            for i, (feature, shap_val) in enumerate(protective.items(), 1):
                value = patient[feature]
                print(f"{i}. {feature:20s} = {value:6.1f}   (SHAP: {shap_val:+.4f})")
        else:
            print("No significant protective factors found")

        print("\n✓ Demo 1 Complete!")
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def demo_full_system():
    """Demo: Full system with AI explanations (requires API key)"""
    print_section("DEMO 2: Full AI-Powered Analysis (Requires OpenAI API)")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("⚠ OPENAI_API_KEY not set")
        print("\nTo run this demo:")
        print("1. Get an OpenAI API key from https://platform.openai.com/api-keys")
        print("2. Set it: export OPENAI_API_KEY='your-key-here'")
        print("3. Run this script again")
        print("\nSkipping Demo 2...")
        return False

    try:
        from orchestrator import CVDAgentOrchestrator

        # Initialize orchestrator
        print("Initializing multi-agent system...")
        orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

        # Load patient data
        patient_file = Path(__file__).parent.parent / "CML_CVD_Model" / "RunningScript" / "patient_adam.json"

        if not patient_file.exists():
            print(f"✗ Patient file not found: {patient_file}")
            return False

        print(f"Loading patient from: {patient_file.name}")
        patient_data = orchestrator.load_patient_from_file(str(patient_file))

        # Run full analysis
        print("\nRunning comprehensive analysis...")
        result = orchestrator.analyze_patient(patient_data, detail_level="moderate")

        # Display results
        print("\n" + "-"*70)
        print("RISK ASSESSMENT")
        print("-"*70)
        print(f"Risk Score: {result['prediction']['risk_score']:.2%}")
        print(f"Risk Level: {result['prediction']['risk_level']}")

        print("\n" + "-"*70)
        print("AI-GENERATED EXPLANATION")
        print("-"*70)
        print(result['explanation'])

        print("\n" + "-"*70)
        print("TOP RISK FACTORS")
        print("-"*70)
        for feature, shap in list(result['top_risk_factors'].items())[:3]:
            print(f"• {feature}: {shap:+.4f}")

        print("\n" + "-"*70)
        print("AI-GENERATED INTERVENTIONS (Preview)")
        print("-"*70)
        # Print first 500 characters of interventions
        interventions = result['interventions']
        if interventions:
            preview = interventions[:500] + "..." if len(interventions) > 500 else interventions
            print(preview)
            print(f"\n[Full intervention plan: {len(interventions)} characters]")

        print("\n✓ Demo 2 Complete!")
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def demo_what_if():
    """Demo: What-if scenario comparison"""
    print_section("DEMO 3: What-If Scenario Analysis")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("⚠ Requires OPENAI_API_KEY (see Demo 2)")
        print("Skipping Demo 3...")
        return False

    try:
        from orchestrator import CVDAgentOrchestrator

        orchestrator = CVDAgentOrchestrator(openai_api_key=api_key)

        # Current state
        current = {
            "anchor_age": 56.0, "White Blood Cells": 85.1, "Urea Nitrogen": 16.0,
            "Neutrophils": 57.0, "BMI": 39.1, "Monocytes": 1.0, "Glucose": 87.0,
            "systolic": 148.0, "MCH": 28.6, "Calcium, Total": 8.5,
            "Lymphocytes": 7.0, "Creatinine": 1.2, "Sodium": 140.0,
            "diastolic": 81.0, "PT": 12.6, "imatinib_dose": 0.0,
            "dasatinib_dose": 0.0, "gender_encoded": 1.0, "nilotinib_dose": 0.0,
            "ponatinib_dose": 0.0, "ruxolitinib_dose": 0.0
        }

        # Improved state (weight loss + BP control)
        improved = current.copy()
        improved["BMI"] = 25.0  # From 39.1 to 25.0 (healthy weight)
        improved["systolic"] = 120.0  # From 148 to 120 (normal BP)
        improved["diastolic"] = 75.0  # From 81 to 75 (normal BP)

        print("Comparing scenarios:")
        print("  Scenario 1: Current state (BMI 39.1, BP 148/81)")
        print("  Scenario 2: After interventions (BMI 25.0, BP 120/75)")
        print("\nAnalyzing...")

        comparison = orchestrator.compare_scenarios(
            current, improved,
            label1="Current",
            label2="After Weight Loss & BP Control"
        )

        print("\n" + "-"*70)
        print("SCENARIO COMPARISON")
        print("-"*70)
        print(f"Current Risk:   {comparison['scenario1']['prediction']['risk_score']:.2%}")
        print(f"Improved Risk:  {comparison['scenario2']['prediction']['risk_score']:.2%}")
        print(f"Risk Reduction: {abs(comparison['risk_change']):.2%} ({comparison['risk_change_percent']:.1f}%)")

        print("\n" + "-"*70)
        print("AI COMPARISON ANALYSIS")
        print("-"*70)
        if comparison['comparison_explanation']:
            print(comparison['comparison_explanation'])

        print("\n✓ Demo 3 Complete!")
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all demos"""
    print("\n" + "="*70)
    print("  CVD AGENT SYSTEM - QUICK START DEMO")
    print("="*70)
    print("\nThis demo will show you:")
    print("  1. Risk prediction (works offline)")
    print("  2. AI-powered explanations (requires OpenAI API)")
    print("  3. What-if scenario analysis (requires OpenAI API)")
    print("\n" + "="*70)

    # Check dependencies
    print("\nChecking dependencies...")
    try:
        import pandas
        import numpy
        import sklearn
        import joblib
        import shap
        print("✓ Core dependencies installed")
    except ImportError as e:
        print(f"✗ Missing dependencies: {e}")
        print("\nInstall with: pip install -r requirements.txt")
        return

    try:
        import openai
        print("✓ OpenAI library installed")
    except ImportError:
        print("⚠ OpenAI not installed (needed for Demos 2-3)")
        print("  Install with: pip install openai")

    # Run demos
    input("\nPress Enter to start Demo 1...")
    demo1_success = demo_prediction_only()

    if demo1_success:
        response = input("\nRun Demo 2? (requires OpenAI API key) [y/N]: ")
        if response.lower() == 'y':
            demo2_success = demo_full_system()

            if demo2_success:
                response = input("\nRun Demo 3? (what-if analysis) [y/N]: ")
                if response.lower() == 'y':
                    demo_what_if()

    # Summary
    print_section("DEMO COMPLETE - NEXT STEPS")
    print("You can now:")
    print("\n1. Run interactive mode:")
    print("   python orchestrator.py")
    print("\n2. Run full examples:")
    print("   python examples/basic_usage.py")
    print("\n3. Use in your own code:")
    print("   from orchestrator import CVDAgentOrchestrator")
    print("\n4. Read documentation:")
    print("   - README.md for full documentation")
    print("   - SETUP.md for installation guide")
    print("\n" + "="*70)


if __name__ == "__main__":
    main()
