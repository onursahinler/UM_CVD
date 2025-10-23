// components/ResultsStep.tsx
"use client";

import React from "react";

// Backend'den (app.py) gelecek olan JSON yanıtının tipi
export interface ApiResult {
  prediction: number;
  base_value: number;
  shap_values: number[];
  feature_names: string[];
  feature_values: number[];
  shap_html: string;
}

interface ResultsStepProps {
  result: ApiResult;
  onBack: () => void; // Özete geri dönmek için fonksiyon
  patientId: string;
}

export function ResultsStep({ result, onBack, patientId }: ResultsStepProps) {
  const riskScore = (result.prediction * 100).toFixed(2);

  // --- YENİ VERİ HAZIRLAMA BLOĞU ---
  // Üç diziyi birleştirerek daha kolay yönetilebilir bir yapı oluşturalım.
  // [isim, shap_değeri] olarak birleştirip, SHAP değerine göre (büyükten küçüğe) sıralayalım.
  const featuresWithShap = result.feature_names.map((name, index) => ({
    name: name,
    value: result.feature_values[index], // Hastanın bu özellik için (impute edilmiş) değeri
    shap: result.shap_values[index]      // Bu özelliğin skora etkisi (SHAP)
  }))
  // Etkisi en yüksek olanları (pozitif veya negatif fark etmeksizin, mutlak değere göre)
  // en üstte göstermek için sıralayalım.
  .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
  // --- YENİ BLOK BİTİŞİ ---

  // --- YENİ FONKSİYON: SHAP JSON İNDİRME ---
  const downloadShapJSON = () => {
    // featuresWithShap dizisini (sıralanmış haliyle) JSON'a çevir
    const dataStr = JSON.stringify(featuresWithShap, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shap-values-${patientId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // --- YENİ FONKSİYON BİTİŞİ ---

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

      {/* SHAP Force Plot (HTML ile) */}
      <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
          SHAP Force Plot (Model Explainer)
        </h3>
        <p className="text-sm text-gray-300 mb-4">
          This graph shows which factors increase (red) and decrease the risk (blue), starting 
          from the model's basic expectation (Base Value: {result.base_value.toFixed(3)}).
        </p>

        <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
          <iframe
            srcDoc={result.shap_html}
            style={{
              width: '1200px', 
              height: '150px',
            }}
            title="SHAP Force Plot"
            seamless 
          />
        </div>
      </div>

      {/* --- YENİ KUTUCUK: FEATURE SHAP DEĞERLERİ --- */}
      <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
        
        {/* --- GÜNCELLENMİŞ BAŞLIK (flex eklendi) --- */}
        <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
          <h3 className="text-lg font-semibold text-white">
            Feature Contribution (SHAP Values)
          </h3>
          <button
            onClick={downloadShapJSON}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download SHAP JSON
          </button>
        </div>
        {/* --- BAŞLIK GÜNCELLEMESİ BİTTİ --- */}

        <p className="text-sm text-gray-300 mb-4">
        The effect of the features on the risk score of the model (from the most effective to the least effective). 
        Red (positive) values increase risk, blue (negative) values reduce risk.
        </p>
        
        {/* Özellik listesi için kaydırılabilir alan */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {featuresWithShap.map((feature) => (
            <div 
              key={feature.name} 
              className="flex justify-between items-center bg-gray-800 p-3 rounded-lg"
            >
              {/* Özellik Adı ve Değeri */}
              <div>
                <span className="font-medium text-white">{feature.name}</span>
                <span className="text-sm text-gray-400 ml-2">
                  (Value: {feature.value.toFixed(2)})
                </span>
              </div>
              
              {/* SHAP Değeri */}
              <span 
                className={`font-bold text-lg ${
                  feature.shap > 0 ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {/* Değer pozitifse + işareti koy, değilse zaten - işareti vardır */}
                {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* --- YENİ KUTUCUK BİTİŞİ --- */}

    </div>
  );
}

