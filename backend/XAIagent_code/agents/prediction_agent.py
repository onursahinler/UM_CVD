"""
Prediction Agent - Handles model loading and CVD risk prediction
"""
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from pathlib import Path
import sys

# Add parent directory to path for config import
sys.path.append(str(Path(__file__).parent.parent))
from config import MODEL_PATHS, FEATURE_INFO


class PredictionAgent:
    """
    Agent responsible for loading the XAI model and making CVD risk predictions
    """

    def __init__(self):
        self.explainer = None
        self.scaler = None
        self.imputer = None
        self.is_loaded = False

    def load_model(self) -> bool:
        """
        Load the trained model, scaler, and imputer

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            print("Loading XAI model components...")
            self.explainer = joblib.load(MODEL_PATHS["explainer"])
            self.scaler = joblib.load(MODEL_PATHS["scaler"])
            self.imputer = joblib.load(MODEL_PATHS["imputer"])
            self.is_loaded = True
            print("Model loaded successfully!")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

    def validate_patient_data(self, patient_data: Dict[str, float]) -> Tuple[bool, str]:
        """
        Validate patient data has all required features

        Args:
            patient_data: Dictionary of patient features

        Returns:
            Tuple of (is_valid, error_message)
        """
        required_features = list(FEATURE_INFO.keys())
        missing_features = [f for f in required_features if f not in patient_data]

        if missing_features:
            return False, f"Missing features: {', '.join(missing_features)}"

        return True, ""

    def preprocess_data(self, patient_data: Dict[str, float]) -> np.ndarray:
        """
        Preprocess patient data (scale and impute)

        Args:
            patient_data: Dictionary of patient features

        Returns:
            Preprocessed data array
        """
        # Convert to DataFrame
        df = pd.DataFrame([patient_data])

        # Scale and impute
        data_scaled = self.scaler.transform(df)
        data_imputed = self.imputer.transform(data_scaled)

        return data_imputed

    def predict(self, patient_data: Dict[str, float]) -> Dict[str, Any]:
        """
        Make CVD risk prediction for a patient

        Args:
            patient_data: Dictionary of patient features

        Returns:
            Dictionary containing:
                - risk_score: Probability of CVD (0-1)
                - risk_level: "Low", "Moderate", or "High"
                - shap_values: Dictionary of SHAP values for each feature
                - prediction: Binary prediction (0 or 1)
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        # Validate data
        is_valid, error_msg = self.validate_patient_data(patient_data)
        if not is_valid:
            raise ValueError(error_msg)

        # Preprocess
        data_processed = self.preprocess_data(patient_data)

        # Get SHAP explanation
        explanation = self.explainer(data_processed)

        # Get prediction probability
        # The explainer contains the model, extract predictions
        base_value = self.explainer.expected_value[1]  # Base value for class 1 (CVD)
        shap_values = explanation.values[0][:, 1]  # SHAP values for class 1

        # Calculate risk score (probability)
        # Using SHAP: prediction = base_value + sum(shap_values)
        # Then apply sigmoid to get probability
        logit = base_value + np.sum(shap_values)
        risk_score = 1 / (1 + np.exp(-logit))

        # Determine risk level
        if risk_score < 0.3:
            risk_level = "Low"
        elif risk_score < 0.7:
            risk_level = "Moderate"
        else:
            risk_level = "High"

        # Create SHAP values dictionary
        feature_names = list(patient_data.keys())
        shap_dict = dict(zip(feature_names, shap_values))

        # Sort SHAP values by absolute value (most important features)
        sorted_shap = dict(sorted(shap_dict.items(),
                                 key=lambda x: abs(x[1]),
                                 reverse=True))

        return {
            "risk_score": float(risk_score),
            "risk_level": risk_level,
            "prediction": int(risk_score >= 0.5),
            "shap_values": sorted_shap,
            "base_value": float(base_value),
            "feature_values": patient_data
        }

    def get_top_risk_factors(self, prediction_result: Dict[str, Any], n: int = 5) -> Dict[str, float]:
        """
        Get the top N risk factors (features with highest positive SHAP values)

        Args:
            prediction_result: Result from predict()
            n: Number of top factors to return

        Returns:
            Dictionary of top risk factors and their SHAP values
        """
        shap_values = prediction_result["shap_values"]

        # Filter only positive SHAP values (increasing risk)
        positive_shap = {k: v for k, v in shap_values.items() if v > 0}

        # Sort and take top N
        top_factors = dict(sorted(positive_shap.items(),
                                 key=lambda x: x[1],
                                 reverse=True)[:n])

        return top_factors

    def get_protective_factors(self, prediction_result: Dict[str, Any], n: int = 5) -> Dict[str, float]:
        """
        Get the top N protective factors (features with highest negative SHAP values)

        Args:
            prediction_result: Result from predict()
            n: Number of top factors to return

        Returns:
            Dictionary of top protective factors and their SHAP values
        """
        shap_values = prediction_result["shap_values"]

        # Filter only negative SHAP values (decreasing risk)
        negative_shap = {k: v for k, v in shap_values.items() if v < 0}

        # Sort by most negative and take top N
        protective_factors = dict(sorted(negative_shap.items(),
                                        key=lambda x: x[1])[:n])

        return protective_factors


if __name__ == "__main__":
    # Test the agent
    agent = PredictionAgent()
    agent.load_model()

    # Test with sample patient data
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

    result = agent.predict(test_patient)
    print(f"\nCVD Risk Score: {result['risk_score']:.2%}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"\nTop Risk Factors:")
    for feature, shap_val in agent.get_top_risk_factors(result, 5).items():
        print(f"  {feature}: {shap_val:.4f}")