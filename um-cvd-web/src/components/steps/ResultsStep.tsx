// components/ResultsStep.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

// 'shapjs' kütüphanesi client-side çalışır, Next.js'te SSR hatası almamak
// için 'dynamic' import ile yüklüyoruz.
const ForcePlot = dynamic(
  () => import("shapjs").then((mod) => mod.ForcePlot),
  {
    ssr: false, // Server-side rendering'de bu komponenti yükleme
    loading: () => <p>SHAP Plot Yükleniyor...</p>,
  }
);

// Backend'den (app.py) gelecek olan JSON yanıtının tipi
export interface ApiResult {
  prediction: number;
  base_value: number;
  shap_values: number[];
  feature_names: string[];
  feature_values: number[];
}

interface ResultsStepProps {
  result: ApiResult;
  onBack: () => void; // Özete geri dönmek için fonksiyon
  patientId: string;
}

export function ResultsStep({ result, onBack, patientId }: ResultsStepProps) {
  const riskScore = (result.prediction * 100).toFixed(2);

  return (
    <div className="col-span-2 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          Analysis Results (Patient ID: {patientId || "N/A"})
        </h2>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Summary
        </button>
      </div>

      {/* Prediction Score */}
      <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm text-center">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          CVD Risk Score
        </h3>
        <p className={`text-6xl font-bold ${parseFloat(riskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
          {riskScore}%
        </p>
      </div>

      {/* SHAP Force Plot */}
      <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
          SHAP Force Plot (Model Explainer)
        </h3>
        <p className="text-sm text-gray-300 mb-4">
          Bu grafik, modelin temel beklentisinden (Base Value: {result.base_value.toFixed(3)}) 
          başlayarak hangi faktörlerin riski artırdığını (kırmızı) ve 
          azalttığını (mavi) göstermektedir.
        </p>
        <div className="bg-white text-black p-4 rounded-lg overflow-x-auto">
          <ForcePlot
            baseValue={result.base_value}
            features={result.feature_values.map((val, i) => ({
              name: result.feature_names[i],
              value: val, // `app.py`'den gelen impute edilmiş ham değer
              effect: result.shap_values[i], // Bu özelliğin skora etkisi
            }))}
            // `outNames` prop'u, plot'un neyi tahmin ettiğini belirtir
            outNames={["CVD Risk Score"]} 
          />
        </div>
      </div>
    </div>
  );
}