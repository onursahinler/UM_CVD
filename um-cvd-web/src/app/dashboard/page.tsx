"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HeroSection } from "@/components/sections/HeroSection";
import { AssessmentForm } from "@/components/sections/AssessmentForm";
import { usePatientForm } from "@/hooks/usePatientForm";
import { useFormContext } from "@/contexts/FormContext";
import { transformFormData, predictCVD, PredictionResult } from "@/services/api";

export default function Dashboard() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  
  const searchParams = useSearchParams();
  const { clearSavedForm } = useFormContext();
  const {
    form,
    errors,
    isIdGenerated,
    handleInput,
    handleToggle,
    handleGenerateId,
    handleModelSelect,
    handleTkiTypeChange,
    validate,
    handleFileUpload,
    resetForm,
  } = usePatientForm();

  // Check URL parameters and handle form reset
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'start') {
      // Clear form when starting new assessment
      resetForm();
    }
    // If action is 'continue' or no action, form will load saved data automatically
  }, [searchParams, resetForm]);

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const patientData = transformFormData(form);
      const result = await predictCVD(patientData);
      setPredictionResult(result);
      setIsCompleted(true);
      // Clear saved form data when assessment is completed
      clearSavedForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUploadWithReset = (data: any) => {
    handleFileUpload(data);
    setIsCompleted(false);
  };

  if (isCompleted && predictionResult) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <HeroSection onFileUpload={handleFileUploadWithReset} />
        
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-white mb-6">CVD Risk Assessment Results</h2>
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prediction Summary */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-black/10">
                  <div className="text-sm text-gray-600 font-medium">Prediction</div>
                  <div className={`mt-1 text-2xl font-bold ${predictionResult.prediction === 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {predictionResult.prediction === 1 ? 'CVD Risk Detected' : 'No CVD Risk'}
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-black/10">
                  <div className="text-sm text-gray-600 font-medium">Risk Score</div>
                  <div className="mt-1 text-xl font-bold text-blue-600">
                    {(predictionResult.probability_score * 100).toFixed(2)}%
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-black/10">
                  <div className="text-sm text-gray-600 font-medium">Base Value</div>
                  <div className="mt-1 text-lg font-semibold text-gray-800">
                    {predictionResult.base_value.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* SHAP Values */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Feature Importance (SHAP Values)</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {Object.entries(predictionResult.shap_values)
                    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 10)
                    .map(([feature, value]) => (
                      <div key={feature} className="bg-white rounded-lg p-3 border border-black/10">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-800 truncate">{feature}</span>
                          <span className={`text-sm font-bold ${value >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {value >= 0 ? '+' : ''}{value.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* SHAP Force Plot */}
            <div className="mt-6">
              <div className="bg-white rounded-xl p-4 border border-black/10">
                <h4 className="text-md font-semibold text-gray-800 mb-3">SHAP Force Plot</h4>
                <div className="text-center text-gray-600">
                  <p>SHAP visualization will be displayed here</p>
                  <p className="text-sm mt-2">Base Value: {predictionResult.base_value.toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => {
                  setIsCompleted(false);
                  setPredictionResult(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Assessment
              </button>
            </div>
          </div>
        </main>

        <footer className="mt-auto py-8 text-center text-xs text-white/70">
          © UM Institute of Data Science
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <HeroSection onFileUpload={handleFileUploadWithReset} />
      
      <AssessmentForm
        form={form}
        errors={errors}
        isIdGenerated={isIdGenerated}
        onInput={handleInput}
        onToggle={handleToggle}
        onGenerateId={handleGenerateId}
        onModelSelect={handleModelSelect}
        onTkiTypeChange={handleTkiTypeChange}
        onComplete={handleComplete}
        validate={validate}
      />

      <footer className="mt-auto py-8 text-center text-xs text-white/70">
        © UM Institute of Data Science
      </footer>
    </div>
  );
}
