import joblib
import pandas as pd
import numpy as np
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import traceback

# --- Flask App Initialization ---
app = Flask(__name__)
# Allow requests from your Next.js app (adjust in production)
CORS(app, resources={r"/predict": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

# --- Globals: Model Loading & Feature List ---
loaded_explainer = None
loaded_scaler = None
loaded_imputer = None

# This list MUST match the order and names from the training notebook
selected_features = [
    'anchor_age', 'White Blood Cells', 'Urea Nitrogen', 'Neutrophils', 'BMI',
    'Monocytes', 'Glucose', 'systolic', 'MCH', 'Calcium, Total', 'Lymphocytes',
    'Creatinine', 'Sodium', 'diastolic', 'PT', 'imatinib_dose', 'dasatinib_dose',
    'gender_encoded', 'nilotinib_dose', 'ponatinib_dose', 'ruxolitinib_dose'
]

def load_models():
    """Load models into global variables at startup."""
    global loaded_explainer, loaded_scaler, loaded_imputer
    try:
        # Model paths
        model_path = "/Users/onursahinler/UM_CVD/backend/models/"
        trained_path = model_path + "trained/"
        preprocessing_path = model_path + "preprocessing/"
        
        # Check if model files exist
        import os
        if not os.path.exists(trained_path + "rf_model.pkl"):
            print("❌ Model files not found. Please run the model training script first.")
            return
        
        # Load all models
        loaded_model = joblib.load(trained_path + "rf_model.pkl")
        loaded_scaler = joblib.load(preprocessing_path + 'scaler.pkl')
        loaded_imputer = joblib.load(preprocessing_path + 'imputer.pkl')
        
        # Create SHAP explainer at runtime
        import shap
        loaded_explainer = shap.TreeExplainer(loaded_model, model_output="raw")
        
        print("✅ Models loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        print("API will not be able to make predictions.")

# --- API Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    if not all([loaded_explainer, loaded_scaler, loaded_imputer]):
        return jsonify({"error": "Models are not loaded on the server. Check server logs."}), 500

    try:
        input_data = request.get_json()
        if not input_data:
            return jsonify({"error": "No input data received"}), 400
        
        print("\n--- API LOG: New Request Received ---")
        print("1. Raw JSON data received from frontend:")
        print(json.dumps(input_data, indent=2))

        # --- 1. Data Preparation ---
        # Convert to DataFrame, add missing columns as NaN, and enforce correct order
        input_df = pd.DataFrame([input_data])
        for feature in selected_features:
            if feature not in input_df.columns:
                input_df[feature] = np.nan
        
        input_df_ordered = input_df[selected_features]
        print("\n2. DataFrame before processing (correct feature order):")
        print(input_df_ordered.to_string())

        # --- 2. Data Transformation Pipeline ---
        # Step 2a: Scale the data
        data_scaled = loaded_scaler.transform(input_df_ordered)
        print("\n3. Data after scaling (numpy array):")
        print(data_scaled)

        # Step 2b: Impute missing values
        data_imputed = loaded_imputer.transform(data_scaled)
        print("\n4. Data after imputation (final input to model):")
        print(data_imputed)

        # Convert back to DataFrame for SHAP
        data_imputed_df = pd.DataFrame(data_imputed, columns=selected_features)

        # --- 3. Prediction and SHAP Explanation ---
        explanation = loaded_explainer(data_imputed_df)

        # --- 4. Result Calculation ---
        # The explainer for a binary classifier returns values for both classes.
        # We are interested in the values for Class 1 (CVD Risk).
        shap_values_class1 = explanation.values[0, :, 1]
        base_value_class1 = loaded_explainer.expected_value[1]
        
        # CORRECT CALCULATION: The final score is the sum of the base value and SHAP values.
        # This gives us the raw model output, which we need to convert to probability
        raw_score = base_value_class1 + np.sum(shap_values_class1)
        
        # Convert raw score to probability using sigmoid function
        import math
        final_score = 1 / (1 + math.exp(-raw_score))
        prediction = 1 if final_score >= 0.5 else 0

        print("\n5. Calculated Results:")
        print(f"   - SHAP Base Value (Class 1): {base_value_class1:.6f}")
        print(f"   - Sum of SHAP values:        {np.sum(shap_values_class1):.6f}")
        print(f"   - Raw Score (Base + SHAP):   {raw_score:.6f}")
        print(f"   - Final Probability:         {final_score:.6f}")
        print(f"   - Final Prediction (>=0.5):  {prediction}")

        # --- 5. Prepare JSON Response for Frontend ---
        # Get unscaled (but imputed) feature values for the force plot display
        unscaled_imputed_data = loaded_scaler.inverse_transform(data_imputed)
        feature_values_dict = pd.DataFrame(unscaled_imputed_data, columns=selected_features).iloc[0].to_dict()

        # Create the 'features' object required by shapjs
        shapjs_features = {
            name: {
                "effect": float(shap_val),
                "value": float(feat_val) if feat_val is not None and not pd.isna(feat_val) else None
            }
            for name, shap_val, feat_val in zip(selected_features, shap_values_class1, feature_values_dict.values())
        }

        result = {
            "prediction": int(prediction),
            "probability_score": float(final_score),
            "baseValue": float(base_value_class1),
            "features": shapjs_features,
            "featureNames": selected_features,
            "outNames": ["CVD Risk"]
        }
        
        print("--- API LOG: Sending successful response. --- \n")
        return jsonify(result)

    except Exception as e:
        print(f"❌ An error occurred during prediction: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred. Check the API logs."}), 500

# --- Main Execution ---
if __name__ == '__main__':
    load_models()  # Load models when the script starts
    app.run(debug=True, port=5002)
