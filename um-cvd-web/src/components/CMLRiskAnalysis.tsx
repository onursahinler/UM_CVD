"use client";

import React, { useState, useEffect } from "react";
import { RiskScore } from "./ml/RiskScore";
import { FeatureImportance } from "./ml/FeatureImportance";
import { ShapValues } from "./ml/ShapValues";

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

interface CMLRiskAnalysisProps {
  form: Record<string, string | number>;
}

export function CMLRiskAnalysis({ form }: CMLRiskAnalysisProps) {
  // ML Model Results State
  const [mlResults, setMlResults] = useState<PredictionResult | null>(null);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState<string | null>(null);
  
  // Load ML results on component mount
  useEffect(() => {
    const loadMLResults = async () => {
      try {
        setMlLoading(true);
        setMlError(null);

        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setMlResults(result);
      } catch (err) {
        console.error('ML prediction error:', err);
        setMlError(err instanceof Error ? err.message : 'Failed to get prediction');
      } finally {
        setMlLoading(false);
      }
    };

    loadMLResults();
  }, [form]);

  // Loading state
  if (mlLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background">
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                AI Analysis
                <br />
                In Progress
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                Our advanced machine learning models are processing your cardiovascular risk data 
                using state-of-the-art SHAP explainability techniques.
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8 flex-1">
          <div className="bg-panel rounded-2xl p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="font-display text-3xl mb-4 text-foreground">Processing Patient Data</h2>
            <p className="text-foreground/70 mb-6">
              Analyzing clinical parameters to generate personalized risk insights...
            </p>
            
            <div className="w-full bg-muted rounded-full h-3 mb-6">
              <div 
                className="bg-gradient-to-r from-brand-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out animate-pulse" 
                style={{width: '100%'}}
              ></div>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-pill text-sm font-medium">
              <div className="w-2 h-2 bg-brand-600 rounded-full animate-pulse"></div>
              Running SHAP analysis...
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (mlError) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background">
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                Analysis Error
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                {mlError}
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Main results view
  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Interactive SHAP
              <br />
              Explainer
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              AI-powered CVD risk analysis with detailed feature explanations and interactive visualizations.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Risk Score */}
            <div className="lg:col-span-1">
              {mlResults && (
                <RiskScore
                  riskScore={mlResults.risk_score}
                  prediction={mlResults.prediction}
                  className="mb-6"
                />
              )}
            </div>

            {/* Feature Importance */}
            <div className="lg:col-span-1">
              {mlResults && (
                <FeatureImportance
                  featureImportance={mlResults.feature_importance}
                  featureCategories={mlResults.feature_categories}
                  className="mb-6"
                />
              )}
            </div>

            {/* SHAP Values */}
            <div className="lg:col-span-2">
              {mlResults && (
                <ShapValues
                  shapValues={mlResults.shap_values}
                  featureCategories={mlResults.feature_categories}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-12">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-pill font-semibold transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}