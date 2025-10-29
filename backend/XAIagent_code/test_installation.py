"""
Installation Test Script

This script tests that all components are properly installed and can load.
Run this after installing requirements to verify your setup.
"""
import sys
from pathlib import Path

print("="*60)
print("CVD Agent System - Installation Test")
print("="*60)

# Test 1: Import core dependencies
print("\n1. Testing core dependencies...")
try:
    import pandas
    import numpy
    import sklearn
    import joblib
    import shap
    print("   ✓ Core dependencies installed")
except ImportError as e:
    print(f"   ✗ Missing dependency: {e}")
    sys.exit(1)

# Test 2: Import OpenAI (optional)
print("\n2. Testing OpenAI library...")
try:
    import openai
    print("   ✓ OpenAI library installed")
    openai_available = True
except ImportError:
    print("   ✗ OpenAI not installed (optional - needed for full functionality)")
    print("   Install with: pip install openai")
    openai_available = False

# Test 3: Check model files exist
print("\n3. Checking model files...")
model_dir = Path(__file__).parent.parent / "CML_CVD_Model" / "Models"

required_files = [
    "RF_explainer_allCVD.bz2",
    "RF_scaler_allCVD.pkl",
    "RF_imputer_allCVD.pkl"
]

all_models_exist = True
for file in required_files:
    file_path = model_dir / file
    if file_path.exists():
        print(f"   ✓ {file}")
    else:
        print(f"   ✗ {file} not found")
        all_models_exist = False

if not all_models_exist:
    print("\n   Warning: Some model files are missing.")
    print(f"   Expected location: {model_dir}")
    sys.exit(1)

# Test 4: Import agents
print("\n4. Testing agent imports...")
try:
    from agents.prediction_agent import PredictionAgent
    print("   ✓ Prediction Agent")

    if openai_available:
        from agents.explanation_agent import ExplanationAgent
        print("   ✓ Explanation Agent")

        from agents.knowledge_agent import KnowledgeAgent
        print("   ✓ Knowledge Agent")

        from agents.intervention_agent import InterventionAgent
        print("   ✓ Intervention Agent")
    else:
        print("   ⚠ Explanation, Knowledge, and Intervention agents require OpenAI")

    from orchestrator import CVDAgentOrchestrator
    print("   ✓ Orchestrator")

except ImportError as e:
    print(f"   ✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Load model
print("\n5. Testing model loading...")
try:
    prediction_agent = PredictionAgent()
    success = prediction_agent.load_model()
    if success:
        print("   ✓ Model loaded successfully")
    else:
        print("   ✗ Model loading failed")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ Error loading model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Run a simple prediction
print("\n6. Testing prediction functionality...")
try:
    test_patient = {
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

    result = prediction_agent.predict(test_patient)
    print(f"   ✓ Prediction successful")
    print(f"   CVD Risk: {result['risk_score']:.2%} ({result['risk_level']})")

    # Get top risk factors
    top_factors = prediction_agent.get_top_risk_factors(result, n=3)
    print(f"   Top 3 risk factors:")
    for i, (feature, shap_val) in enumerate(top_factors.items(), 1):
        print(f"      {i}. {feature}: {shap_val:+.4f}")

except Exception as e:
    print(f"   ✗ Prediction failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: Check OpenAI API key (if OpenAI is installed)
if openai_available:
    print("\n7. Checking OpenAI API key...")
    import os
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print(f"   ✓ OPENAI_API_KEY is set ({len(api_key)} characters)")
        print("   Full functionality available!")
    else:
        print("   ⚠ OPENAI_API_KEY not set")
        print("   Set with: export OPENAI_API_KEY='your-key'")
        print("   Prediction agent works, but explanation/intervention agents need API key")

# Summary
print("\n" + "="*60)
print("Installation Test Summary")
print("="*60)
print("✓ Core functionality: WORKING")
print(f"{'✓' if openai_available else '⚠'} LLM agents: {'AVAILABLE' if openai_available else 'NEEDS OPENAI LIBRARY'}")
if openai_available:
    print(f"{'✓' if api_key else '⚠'} API key: {'CONFIGURED' if api_key else 'NOT SET'}")
print("\nYou can now:")
print("  - Run prediction-only mode (no API key needed)")
if openai_available and api_key:
    print("  - Use full multi-agent system with explanations and interventions")
    print("  - Start interactive mode: python orchestrator.py")
print("  - Run examples: python examples/basic_usage.py")
print("="*60)
