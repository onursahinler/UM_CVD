"use client";

import React, { useState, useEffect } from 'react';
import { RiskScore } from './RiskScore';
import { FeatureImportance } from './FeatureImportance';
import { ShapValues } from './ShapValues';

interface MLResultsProps {
  formData: any;
  onBack: () => void;
}

interface PredictionResult {
  prediction: number;
  probability: {
    no_cvd: number;
    cvd: number;
  };
  risk_score: number;
  feature_importance: Record<string, number>;
  shap_values: Record<string, number>;
  feature_names: string[];
  feature_categories?: Record<string, string[]>;
}

export const MLResults: React.FC<MLResultsProps> = ({ formData, onBack }) => {
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getPrediction = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setPredictionResult(result);
      } catch (err) {
        console.error('Prediction error:', err);
        setError(err instanceof Error ? err.message : 'Failed to get prediction');
      } finally {
        setLoading(false);
      }
    };

    getPrediction();
  }, [formData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Patient Data</h2>
          <p className="text-gray-600">Running ML model prediction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prediction Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!predictionResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Results</h2>
          <p className="text-gray-600 mb-6">No prediction results available</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CVD Risk Analysis</h1>
              <p className="text-gray-600 mt-2">
                Machine Learning prediction results for {formData.patientName || 'Patient'}
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Summary
            </button>
          </div>
        </div>

        {/* Risk Score */}
        <div className="mb-8">
          <RiskScore
            riskScore={predictionResult.risk_score}
            prediction={predictionResult.prediction}
            className="mb-6"
          />
        </div>

        {/* Feature Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FeatureImportance
            featureImportance={predictionResult.feature_importance}
            featureCategories={predictionResult.feature_categories}
          />
          <ShapValues
            shapValues={predictionResult.shap_values}
            featureCategories={predictionResult.feature_categories}
          />
        </div>

        {/* Additional Information */}
        <div className="mt-8 p-6 bg-white rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Model Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Model Type:</span>
              <span className="ml-2">Random Forest Classifier</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Prediction Confidence:</span>
              <span className="ml-2">
                {Math.round(Math.max(predictionResult.probability.cvd, predictionResult.probability.no_cvd) * 100)}%
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Features Analyzed:</span>
              <span className="ml-2">{predictionResult.feature_names.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
