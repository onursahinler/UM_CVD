"""
CML CVD Risk Prediction API
Machine Learning model for predicting cardiovascular disease risk in CML patients
"""

import pandas as pd
import numpy as np
import joblib
import bz2
import pickle
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CMLCVDPredictor:
    """CML CVD Risk Prediction Model"""
    
    def __init__(self, models_dir: str = "./"):
        self.models_dir = models_dir
        self.model = None
        self.imputer = None
        self.scaler = None
        self.explainer = None
        self.feature_names = None
        self.load_models()
    
    def load_models(self):
        """Load all trained models and preprocessors"""
        try:
            # Load imputer
            with open(f"{self.models_dir}RF_imputer_allCVD.pkl", 'rb') as f:
                self.imputer = joblib.load(f)
            logger.info("Imputer loaded successfully")
            
            # Load scaler
            with open(f"{self.models_dir}RF_scaler_allCVD.pkl", 'rb') as f:
                self.scaler = joblib.load(f)
            logger.info("Scaler loaded successfully")
            
            # Load explainer (compressed)
            try:
                with bz2.open(f"{self.models_dir}RF_explainer_allCVD.bz2", 'rb') as f:
                    self.explainer = pickle.load(f)
                logger.info("SHAP explainer loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load SHAP explainer: {e}")
                self.explainer = None
            
            # Load dataset to get feature names and train model if needed
            self._load_dataset_and_train()
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise
    
    def _load_dataset_and_train(self):
        """Load dataset and train model if not available"""
        try:
            # Load dataset
            df = pd.read_csv(f"{self.models_dir}ml_ready_cml_cvd_dataset_all_binary.csv")
            logger.info(f"Dataset loaded: {df.shape}")
            
            # Separate features and target
            target_col = 'CVD'  # Assuming CVD is the target column
            if target_col not in df.columns:
                # Try to find target column
                possible_targets = [col for col in df.columns if 'cvd' in col.lower() or 'target' in col.lower()]
                if possible_targets:
                    target_col = possible_targets[0]
                else:
                    raise ValueError("Target column not found")
            
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            self.feature_names = X.columns.tolist()
            logger.info(f"Feature names: {self.feature_names}")
            
            # Train Random Forest model
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.model_selection import train_test_split
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            # Fit imputer and scaler
            X_train_imputed = self.imputer.fit_transform(X_train)
            X_train_scaled = self.scaler.fit_transform(X_train_imputed)
            
            # Train model
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                class_weight='balanced'
            )
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            X_test_imputed = self.imputer.transform(X_test)
            X_test_scaled = self.scaler.transform(X_test_imputed)
            accuracy = self.model.score(X_test_scaled, y_test)
            logger.info(f"Model trained with accuracy: {accuracy:.4f}")
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    def preprocess_data(self, data: Dict[str, Any]) -> np.ndarray:
        """Preprocess input data for prediction"""
        try:
            # Convert to DataFrame
            df = pd.DataFrame([data])
            
            # Ensure all required features are present
            missing_features = set(self.feature_names) - set(df.columns)
            if missing_features:
                logger.warning(f"Missing features: {missing_features}")
                # Add missing features with default values
                for feature in missing_features:
                    df[feature] = 0
            
            # Reorder columns to match training data
            df = df[self.feature_names]
            
            # Handle missing values
            df_imputed = self.imputer.transform(df)
            
            # Scale data
            df_scaled = self.scaler.transform(df_imputed)
            
            return df_scaled
            
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            raise
    
    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction for given data"""
        try:
            # Preprocess data
            processed_data = self.preprocess_data(data)
            
            # Make prediction
            prediction = self.model.predict(processed_data)[0]
            probability = self.model.predict_proba(processed_data)[0]
            
            # Get feature importance
            feature_importance = self.model.feature_importances_
            
            # Create feature importance dictionary
            feature_importance_dict = {
                feature: float(importance) 
                for feature, importance in zip(self.feature_names, feature_importance)
            }
            
            # Calculate SHAP values if explainer is available
            if self.explainer is not None:
                try:
                    shap_values = self.explainer(processed_data)
                    shap_values_dict = {
                        feature: float(value) 
                        for feature, value in zip(self.feature_names, shap_values.values[0])
                    }
                except Exception as e:
                    logger.warning(f"SHAP calculation failed: {e}")
                    shap_values_dict = {feature: 0.0 for feature in self.feature_names}
            else:
                shap_values_dict = {feature: 0.0 for feature in self.feature_names}
            
            return {
                "prediction": int(prediction),
                "probability": {
                    "no_cvd": float(probability[0]),
                    "cvd": float(probability[1])
                },
                "risk_score": float(probability[1]),
                "feature_importance": feature_importance_dict,
                "shap_values": shap_values_dict,
                "feature_names": self.feature_names
            }
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            raise
    
    def get_feature_categories(self) -> Dict[str, List[str]]:
        """Get feature categories for better visualization"""
        demographics = ['gender_encoded', 'anchor_age']
        vitals = ['BMI', 'systolic', 'diastolic']
        tki_meds = [col for col in self.feature_names if '_dose' in col]
        lab_tests = [col for col in self.feature_names if col not in demographics + vitals + tki_meds]
        
        return {
            'Demographics': demographics,
            'Vitals': vitals,
            'TKI Medications': tki_meds,
            'Lab Tests': lab_tests
        }

# Global predictor instance
predictor = None

def get_predictor():
    """Get or create predictor instance"""
    global predictor
    if predictor is None:
        predictor = CMLCVDPredictor()
    return predictor

def predict_cvd_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """Main prediction function"""
    try:
        pred = get_predictor()
        result = pred.predict(data)
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    # Test the predictor
    test_data = {
        "anchor_age": 65.0,
        "gender_encoded": 1.0,
        "BMI": 25.0,
        "systolic": 120.0,
        "diastolic": 80.0,
        "White Blood Cells": 7.0,
        "Urea Nitrogen": 15.0,
        "Neutrophils": 60.0,
        "Monocytes": 8.0,
        "Glucose": 90.0,
        "MCH": 28.0,
        "Calcium, Total": 9.0,
        "Lymphocytes": 25.0,
        "Creatinine": 1.0,
        "Sodium": 140.0,
        "PT": 12.0,
        "imatinib_dose": 0.0,
        "dasatinib_dose": 0.0,
        "nilotinib_dose": 0.0,
        "ponatinib_dose": 0.0,
        "ruxolitinib_dose": 0.0
    }
    
    result = predict_cvd_risk(test_data)
    print("Prediction Result:")
    print(f"Risk Score: {result['risk_score']:.4f}")
    print(f"Prediction: {'CVD Risk' if result['prediction'] else 'No CVD Risk'}")
    print(f"Top 5 Important Features:")
    sorted_features = sorted(result['feature_importance'].items(), key=lambda x: x[1], reverse=True)
    for feature, importance in sorted_features[:5]:
        print(f"  {feature}: {importance:.4f}")
