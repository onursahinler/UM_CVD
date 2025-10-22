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

        {/* Python'dan gelen HTML'i buraya basıyoruz.
          Bu HTML kendi <script> etiketlerini içerir ve interaktiftir.
          'dangerouslySetInnerHTML' ismi korkutucudur ancak HTML'i
          kendi backend'imiz ürettiği için (dışarıdan gelmediği için) güvenlidir.
        */}
        {/* Backend'den gelen tam HTML dosyasını göstermek için 'iframe' kullanıyoruz.
    'srcDoc' özelliği, bir HTML string'ini iframe'in kaynağı olarak
    güvenli bir şekilde yükler.
*/}
        {/* 1. YENİ DIŞ WRAPPER:
    Bu div, 'overflow-x-auto' ile yatay kaydırmaya izin verir.
    Beyaz arka planı ve yuvarlak köşeleri buraya taşıdık.
*/}
        <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
          
          {/* 2. GÜNCELLENMİŞ IFRAME:
              'minWidth' ekledik. Bu, iframe'i en az 800px geniş olmaya zorlar.
              Ekran 800px'den darsa, dıştaki 'div' kaydırma çubuğunu gösterir.
          */}
          <iframe
            srcDoc={result.shap_html}
            style={{
              width: '1200px', // Grafiğin düzgün görünmesi için minimum genişlik (bunu artırabilirsiniz)
              height: '150px',   // Yüksekliği ihtiyacınıza göre ayarlayın

            }}
            title="SHAP Force Plot"
            // 'seamless' özelliği eski bir özelliktir ancak bazı tarayıcılarda kenarlıkları sıfırlar
            seamless 
          />
        </div>
      </div>
    </div>
  );
}