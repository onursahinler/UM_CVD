"""
Configuration file for the XAI Agent System
"""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
# Model files are in the main backend/models directory
MODEL_DIR = BASE_DIR.parent / "models"
DATA_DIR = BASE_DIR.parent / "models"  # Keep for compatibility

# Model files
MODEL_PATHS = {
    "explainer": MODEL_DIR / "RF_explainer_allCVD.bz2",
    "scaler": MODEL_DIR / "RF_scaler_allCVD.pkl",
    "imputer": MODEL_DIR / "RF_imputer_allCVD.pkl"
}

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o-mini"  # Cost-effective model

# Feature metadata
FEATURE_INFO = {
    "anchor_age": {
        "name": "Age",
        "unit": "years",
        "normal_range": "18-100",
        "description": "Patient's age at diagnosis"
    },
    "White Blood Cells": {
        "name": "White Blood Cell Count",
        "unit": "×10^9/L",
        "normal_range": "4.0-11.0",
        "description": "Total white blood cell count, elevated in CML"
    },
    "Urea Nitrogen": {
        "name": "Blood Urea Nitrogen (BUN)",
        "unit": "mg/dL",
        "normal_range": "7-20",
        "description": "Kidney function marker"
    },
    "Neutrophils": {
        "name": "Neutrophil Count",
        "unit": "%",
        "normal_range": "40-70",
        "description": "Type of white blood cell, often elevated in CML"
    },
    "BMI": {
        "name": "Body Mass Index",
        "unit": "kg/m²",
        "normal_range": "18.5-24.9",
        "description": "Body weight relative to height"
    },
    "Monocytes": {
        "name": "Monocyte Count",
        "unit": "%",
        "normal_range": "2-8",
        "description": "Type of white blood cell involved in immune response"
    },
    "Glucose": {
        "name": "Blood Glucose",
        "unit": "mg/dL",
        "normal_range": "70-100 (fasting)",
        "description": "Blood sugar level, diabetes indicator"
    },
    "systolic": {
        "name": "Systolic Blood Pressure",
        "unit": "mmHg",
        "normal_range": "90-120",
        "description": "Upper blood pressure reading"
    },
    "MCH": {
        "name": "Mean Corpuscular Hemoglobin",
        "unit": "pg",
        "normal_range": "27-31",
        "description": "Average amount of hemoglobin per red blood cell"
    },
    "Calcium, Total": {
        "name": "Total Calcium",
        "unit": "mg/dL",
        "normal_range": "8.5-10.5",
        "description": "Blood calcium level, important for bone and cellular functions"
    },
    "Lymphocytes": {
        "name": "Lymphocyte Count",
        "unit": "%",
        "normal_range": "20-40",
        "description": "Type of white blood cell, part of immune system"
    },
    "Creatinine": {
        "name": "Serum Creatinine",
        "unit": "mg/dL",
        "normal_range": "0.7-1.3",
        "description": "Kidney function marker"
    },
    "Sodium": {
        "name": "Blood Sodium",
        "unit": "mmol/L",
        "normal_range": "135-145",
        "description": "Electrolyte balance indicator"
    },
    "diastolic": {
        "name": "Diastolic Blood Pressure",
        "unit": "mmHg",
        "normal_range": "60-80",
        "description": "Lower blood pressure reading"
    },
    "PT": {
        "name": "Prothrombin Time",
        "unit": "seconds",
        "normal_range": "11-13.5",
        "description": "Blood clotting time"
    },
    "imatinib_dose": {
        "name": "Imatinib Dose",
        "unit": "mg/day",
        "normal_range": "0-800",
        "description": "TKI medication for CML (Gleevec)"
    },
    "dasatinib_dose": {
        "name": "Dasatinib Dose",
        "unit": "mg/day",
        "normal_range": "0-140",
        "description": "TKI medication for CML (Sprycel)"
    },
    "nilotinib_dose": {
        "name": "Nilotinib Dose",
        "unit": "mg/day",
        "normal_range": "0-800",
        "description": "TKI medication for CML (Tasigna)"
    },
    "ponatinib_dose": {
        "name": "Ponatinib Dose",
        "unit": "mg/day",
        "normal_range": "0-45",
        "description": "TKI medication for CML (Iclusig)"
    },
    "ruxolitinib_dose": {
        "name": "Ruxolitinib Dose",
        "unit": "mg/day",
        "normal_range": "0-50",
        "description": "JAK inhibitor medication"
    },
    "gender_encoded": {
        "name": "Gender",
        "unit": "binary",
        "normal_range": "0=Female, 1=Male",
        "description": "Biological sex"
    }
}
