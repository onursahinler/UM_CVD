"""
FastAPI server for CML CVD Risk Prediction
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
from cml_cvd_predictor import predict_cvd_risk, get_predictor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="CML CVD Risk Prediction API",
    description="Machine Learning API for predicting cardiovascular disease risk in CML patients",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PredictionRequest(BaseModel):
    """Request model for prediction"""
    anchor_age: Optional[float] = None
    gender_encoded: Optional[float] = None
    BMI: Optional[float] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    white_blood_cells: Optional[float] = None
    urea_nitrogen: Optional[float] = None
    neutrophils: Optional[float] = None
    monocytes: Optional[float] = None
    glucose: Optional[float] = None
    mch: Optional[float] = None
    calcium_total: Optional[float] = None
    lymphocytes: Optional[float] = None
    creatinine: Optional[float] = None
    sodium: Optional[float] = None
    pt: Optional[float] = None
    imatinib_dose: Optional[float] = 0.0
    dasatinib_dose: Optional[float] = 0.0
    nilotinib_dose: Optional[float] = 0.0
    ponatinib_dose: Optional[float] = 0.0
    ruxolitinib_dose: Optional[float] = 0.0

class PredictionResponse(BaseModel):
    """Response model for prediction"""
    prediction: int
    probability: Dict[str, float]
    risk_score: float
    feature_importance: Dict[str, float]
    shap_values: Dict[str, float]
    feature_names: list
    feature_categories: Optional[Dict[str, list]] = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "CML CVD Risk Prediction API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        predictor = get_predictor()
        return {"status": "healthy", "model_loaded": predictor is not None}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make CVD risk prediction"""
    try:
        # Convert request to dictionary
        data = request.dict()
        
        # Map field names to match model expectations
        field_mapping = {
            "white_blood_cells": "White Blood Cells",
            "urea_nitrogen": "Urea Nitrogen",
            "calcium_total": "Calcium, Total"
        }
        
        # Apply field mapping
        mapped_data = {}
        for key, value in data.items():
            if key in field_mapping:
                mapped_data[field_mapping[key]] = value
            else:
                # Convert snake_case to Title Case for lab tests
                if key not in ["anchor_age", "gender_encoded", "BMI", "systolic", "diastolic", "pt"] and not key.endswith("_dose"):
                    mapped_data[key.replace("_", " ").title()] = value
                else:
                    mapped_data[key] = value
        
        # Make prediction
        result = predict_cvd_risk(mapped_data)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Get feature categories
        predictor = get_predictor()
        feature_categories = predictor.get_feature_categories()
        
        # Add feature categories to result
        result["feature_categories"] = feature_categories
        
        return PredictionResponse(**result)
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/features")
async def get_features():
    """Get available features and their categories"""
    try:
        predictor = get_predictor()
        feature_categories = predictor.get_feature_categories()
        return {
            "feature_names": predictor.feature_names,
            "feature_categories": feature_categories
        }
    except Exception as e:
        logger.error(f"Error getting features: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
