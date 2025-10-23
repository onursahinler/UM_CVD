// components/steps/ResultsStep.tsx
"use client";

import React, { useState, useMemo } from "react";
// YENİ: AssessmentForm'dan 'FlatPatientData' tipini import ediyoruz
// Dosya yolunuzun AssessmentForm'a göre doğru olduğundan emin olun
// Eğer AssessmentForm.tsx, components/ içindeyse, yol '../AssessmentForm' olmalı.
import { FlatPatientData } from "../sections/AssessmentForm"; 

// Backend'den (app.py) gelecek olan JSON yanıtının tipi
export interface ApiResult {
  status: "success";
  prediction: number;
  base_value: number;
  shap_values: number[];
  feature_names: string[];
  feature_values: number[];
  shap_html: string;
}

interface ResultsStepProps {
  // GÜNCELLENDİ: 'result' -> 'originalResult'
  originalResult: ApiResult; 
  // GÜNCELLENDİ: Orijinal formu (düz) al
  originalFlatData: FlatPatientData;
  // GÜNCELLENDİ: API'yi yeniden çalıştırmak için fonksiyon
  onRunAnalysis: (data: FlatPatientData) => Promise<ApiResult | null>; 
  onBack: () => void; // Özete geri dönmek için fonksiyon
  patientId: string;
}

export function ResultsStep({ 
  originalResult, 
  originalFlatData,
  onRunAnalysis,
  onBack, 
  patientId 
}: ResultsStepProps) {

  // --- YENİ STATE'LER ---
  // Düzenlenebilir form verilerini tutmak için state
  const [editableData, setEditableData] = useState<FlatPatientData>(originalFlatData);
  // Yeni "what-if" analizinin sonucunu tutmak için state
  const [newApiResult, setNewApiResult] = useState<ApiResult | null>(null);
  // Bu bileşene özel yüklenme durumu
  const [isLoading, setIsLoading] = useState(false);
  // --- YENİ STATE'LER BİTTİ ---


  // --- YENİ FONKSİYON: Sol menüdeki form değişikliği ---
  const handleDataChange = (featureName: string, value: string) => {
    setEditableData(prevData => ({
      ...prevData,
      [featureName]: value === '' ? null : parseFloat(value)
    }));
  };
  // --- YENİ FONKSİYON BİTTİ ---


  // --- YENİ FONKSİYON: "Update & Compare" butonu ---
  const handleUpdateAnalysis = async () => {
    setIsLoading(true);
    setNewApiResult(null); // Önceki "yeni" sonucu temizle
    const result = await onRunAnalysis(editableData);
    if (result) {
      setNewApiResult(result);
    }
    // Hata mesajı 'runAnalysis' fonksiyonu tarafından (parent state'de) yönetiliyor,
    // istersek buraya da bir error state ekleyebiliriz.
    setIsLoading(false);
  };
  // --- YENİ FONKSİYON BİTTİ ---
  

  // --- Orijinal Sonuçlar (Hesaplamalar) ---
  const originalRiskScore = (originalResult.prediction * 100).toFixed(2);
  const originalFeaturesWithShap = useMemo(() => 
    originalResult.feature_names.map((name, index) => ({
      name: name,
      value: originalResult.feature_values[index],
      shap: originalResult.shap_values[index]
    })).sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)),
  [originalResult]); // Sadece 'originalResult' değiştiğinde yeniden hesapla

  // --- Yeni Sonuçlar (Hesaplamalar) ---
  const newRiskScore = newApiResult ? (newApiResult.prediction * 100).toFixed(2) : "0.00";
  const newFeaturesWithShap = useMemo(() => {
    if (!newApiResult) return [];
    return newApiResult.feature_names.map((name, index) => ({
      name: name,
      value: newApiResult.feature_values[index],
      shap: newApiResult.shap_values[index]
    })).sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
  }, [newApiResult]); // Sadece 'newApiResult' değiştiğinde yeniden hesapla
  
  
  // --- YENİ FONKSİYON: SHAP JSON İNDİRME (Artık hangi veriyi indireceğini soruyor) ---
  const downloadShapJSON = (dataToDownload: typeof originalFeaturesWithShap, type: 'original' | 'updated') => {
    const dataStr = JSON.stringify(dataToDownload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shap-values-${type}-${patientId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // --- YENİ FONKSİYON BİTİŞİ ---

  
  // Sol menü için veriyi state'den (editableData) al ve alfabetik sırala
  const featuresForSidebar = useMemo(() => 
    Object.entries(editableData).sort((a, b) => a[0].localeCompare(b[0])),
  [editableData]);


  return (
    // 'col-span-2' parent'tan (AssessmentForm) geliyor.
    // Grid yapısını 4 sütuna bölüyoruz (1/4 sol, 3/4 sağ)
    <div className="col-span-2 grid grid-cols-1 lg:grid-cols-4 gap-6"> 

      {/* --- SOL MENÜ (DÜZENLENEBİLİR FORM) --- */}
      <aside className="lg:col-span-1 space-y-4">
        <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm sticky top-6">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
            Patient Data (What-If)
          </h3>
          <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-2">
            
            {/* --- ARTIK BİR FORM --- */}
            {featuresForSidebar.map(([name, value]) => (
              <div 
                key={name} 
                className="flex justify-between items-center bg-gray-800 p-2 rounded-lg"
              >
                <label className="font-medium text-white text-sm flex-1" htmlFor={name}>
                  {name}
                </label>
                <input
                  type="number"
                  id={name}
                  name={name}
                  value={value ?? ''} // 'null' ise boş string göster
                  onChange={(e) => handleDataChange(name, e.target.value)}
                  className="w-24 bg-gray-700 text-white p-1 rounded-md text-sm text-right border border-gray-600"
                />
              </div>
            ))}
            {/* --- FORM BİTTİ --- */}

          </div>
          
          {/* --- YENİ GÜNCELLEME BUTONU --- */}
          <button
            onClick={handleUpdateAnalysis}
            disabled={isLoading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update & Compare'}
          </button>
          {/* --- BUTON BİTTİ --- */}
        </div>
      </aside>
      {/* --- SOL MENÜ BİTİŞİ --- */}


      {/* --- ANA İÇERİK ALANI (KARŞILAŞTIRMALI) --- */}
      <main className="lg:col-span-3 space-y-6">
        
        {/* Header - Ana içeriğin en üstüne taşındı */}
        <div className="flex justify-between items-center">
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

        {/* --- YENİ KARŞILAŞTIRMA GRID'İ --- */}
        {/* Yeni sonuç varsa 2 sütunlu (lg:grid-cols-2), yoksa 1 sütunlu (grid-cols-1) */}
        <div className={`grid grid-cols-1 ${newApiResult ? 'lg:grid-cols-2' : ''} gap-6`}>
            
            {/* --- ORİJİNAL SONUÇ SÜTUNU --- */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-300 text-center">Original Results</h3>

              {/* Prediction Score (Orijinal) */}
              <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm text-center">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                  CVD Risk Score
                </h3>
                <p className={`text-6xl font-bold ${parseFloat(originalRiskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {originalRiskScore}%
                </p>
              </div>

              {/* SHAP Force Plot (Orijinal) */}
              <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
                  SHAP Force Plot
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  Base Value: {originalResult.base_value.toFixed(3)}
                </p>
                <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
                  <iframe
                    srcDoc={originalResult.shap_html}
                    style={{ width: '1000px', minWidth: '600px', height: '150px', border: 'none' }}
                    title="Original SHAP Force Plot"
                    seamless 
                  />
                </div>
              </div>
              
              {/* Feature Contribution (Orijinal) */}
              <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
                  <h3 className="text-lg font-semibold text-white">
                    Feature Contribution
                  </h3>
                  <button
                    onClick={() => downloadShapJSON(originalFeaturesWithShap, 'original')}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Download JSON
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {originalFeaturesWithShap.map((feature) => (
                    <div key={feature.name} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                      <div>
                        <span className="font-medium text-white">{feature.name}</span>
                        <span className="text-sm text-gray-400 ml-2">(Value: {feature.value.toFixed(2)})</span>
                      </div>
                      <span className={`font-bold text-lg ${feature.shap > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* --- YENİ SONUÇ SÜTUNU (Koşullu) --- */}
            {newApiResult && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white text-center">Updated Results</h3>

                {/* Prediction Score (Yeni) */}
                <div className="bg-panel rounded-2xl border border-blue-900/50 p-6 shadow-sm text-center">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">
                    CVD Risk Score
                  </h3>
                  <p className={`text-6xl font-bold ${parseFloat(newRiskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                    {newRiskScore}%
                  </p>
                </div>

                {/* SHAP Force Plot (Yeni) */}
                <div className="bg-panel rounded-2xl border border-blue-900/50 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
                    SHAP Force Plot
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    Base Value: {newApiResult.base_value.toFixed(3)}
                  </p>
                  <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
                    <iframe
                      srcDoc={newApiResult.shap_html}
                      style={{ width: '1000px', minWidth: '600px', height: '150px', border: 'none' }}
                      title="New SHAP Force Plot"
                      seamless 
                    />
                  </div>
                </div>
                
                {/* Feature Contribution (Yeni) */}
                <div className="bg-panel rounded-2xl border border-blue-900/50 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Feature Contribution
                    </h3>
                    <button
                      onClick={() => downloadShapJSON(newFeaturesWithShap, 'updated')}
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Download JSON
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {newFeaturesWithShap.map((feature) => (
                      <div key={feature.name} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <div>
                          <span className="font-medium text-white">{feature.name}</span>
                          <span className="text-sm text-gray-400 ml-2">(Value: {feature.value.toFixed(2)})</span>
                        </div>
                        <span className={`font-bold text-lg ${feature.shap > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {feature.shap > 0 ? '+' : ''}{feature.shap.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
        </div>
        
      </main>
      {/* --- ANA İÇERİK ALANI BİTİŞİ --- */}

    </div>
  );
}