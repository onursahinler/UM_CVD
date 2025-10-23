// components/steps/ResultsStep.tsx
"use client";

import React, { useState, useMemo } from "react";
// AssessmentForm'dan 'FlatPatientData' tipini import ediyoruz
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
  originalResult: ApiResult; 
  originalFlatData: FlatPatientData;
  onRunAnalysis: (data: FlatPatientData) => Promise<ApiResult | null>; 
  onBack: () => void; 
  patientId: string;
}

// Helper function for precise decimal addition/subtraction
function adjustDecimal(value: number | null, amount: number): number | null {
  const currentValue = value ?? 0; 
  // Precision might need adjustment based on feature (e.g., 2 decimals for some)
  // Using 1 decimal place as per previous logic for now.
  const newValue = parseFloat((currentValue + amount).toFixed(1)); 
  return newValue;
}

// Helper function for integer addition/subtraction
function adjustInteger(value: number | null, amount: number): number | null {
    const currentValue = value ?? 0;
    const newValue = currentValue + amount;
    return newValue;
}

// List of features that should be adjusted by 0.1 increments
const DECIMAL_FEATURES = [
    'BMI', 
    'Creatinine', 
    'Calcium, Total', 
    'MCH', 
    'Monocytes', 
    'Neutrophils', 
    'PT', 
    'White Blood Cells'
];

// List of features that should never be negative
const NON_NEGATIVE_FEATURES = [
    'anchor_age', 
    'BMI', 
    'imatinib_dose', 
    'dasatinib_dose', 
    'nilotinib_dose', 
    'ponatinib_dose', 
    'ruxolitinib_dose',
    'White Blood Cells',
    'Urea Nitrogen',
    'Neutrophils',
    'Monocytes',
    'Glucose',
    'MCH',
    'Calcium, Total',
    'Lymphocytes',
    'Creatinine',
    'Sodium',
    'PT',
    // Systolic ve Diastolic negatif olabilir mi? Şimdilik eklemedim.
];

export function ResultsStep({ 
  originalResult, 
  originalFlatData,
  onRunAnalysis,
  onBack, 
  patientId 
}: ResultsStepProps) {

  // --- STATE'LER ---
  const [editableData, setEditableData] = useState<FlatPatientData>(originalFlatData);
  const [newApiResult, setNewApiResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // --- STATE'LER BİTTİ ---


  // --- GÜNCELLENMİŞ FONKSİYON: Değeri Ayarla (Butonlar veya Input için) ---
  const handleDataChange = (featureName: string, newValue: number | null | 'toggle') => {
    
    // Gender özel durumu (toggle)
    if (featureName === 'gender_encoded' && newValue === 'toggle') {
        setEditableData(prevData => ({
            ...prevData,
            [featureName]: prevData.gender_encoded === 1 ? 0 : 1
        }));
        return;
    }
    
    // Toggle değilse, gelen değerin sayı veya null olduğunu varsayıyoruz
    let finalValue = newValue as number | null;

    // Negatif olmaması gerekenleri kontrol et
    if (NON_NEGATIVE_FEATURES.includes(featureName) && finalValue !== null && finalValue < 0) {
       finalValue = 0; 
    }

    // Gender için 0 veya 1 kontrolü (inputtan gelirse)
    if (featureName === 'gender_encoded' && finalValue !== null && finalValue !== 0 && finalValue !== 1) {
        // Geçersiz gender değeri, state'i değiştirme veya hata göster
        console.warn(`Invalid value for gender_encoded: ${finalValue}`);
        return; 
    }

    setEditableData(prevData => ({
        ...prevData,
        [featureName]: finalValue
    }));
  };
  // --- GÜNCELLENMİŞ FONKSİYON BİTTİ ---


  // --- YENİ FONKSİYON: Input Değişikliğini Yönet ve Doğrula ---
  const handleInputChange = (featureName: string, valueAsString: string) => {
    
    // Gender özel durumu: Sadece 0 veya 1 kabul et
    if (featureName === 'gender_encoded') {
      if (valueAsString === '0' || valueAsString === '1') {
        handleDataChange(featureName, parseInt(valueAsString, 10));
      } else if (valueAsString === '') {
         handleDataChange(featureName, null); // Boş bırakmaya izin ver
      }
      // Diğer girdileri (örn: 2, harf) yok say
      return; 
    }

    // Diğer özellikler
    if (valueAsString === '') {
      handleDataChange(featureName, null); // Boş bırakmaya izin ver
      return;
    }

    const isDecimal = DECIMAL_FEATURES.includes(featureName);
    const parsedValue = parseFloat(valueAsString);

    // Geçerli bir sayı değilse yok say
    if (isNaN(parsedValue)) {
      return; 
    }

    // Tam sayı olması gereken bir özellikse ve ondalık girildiyse yok say
    if (!isDecimal && !Number.isInteger(parsedValue)) {
        console.warn(`Integer expected for ${featureName}, got ${parsedValue}`);
        return;
    }
    
    // Ondalıklı bir özellikse ve çok fazla ondalık basamağı varsa yuvarla (opsiyonel)
    // Şu anki kodumuz zaten 1 basamağa yuvarlıyor, ama inputta daha fazlası görünebilir
    // const finalValue = isDecimal ? parseFloat(parsedValue.toFixed(1)) : parsedValue;

    handleDataChange(featureName, parsedValue);
  };
  // --- YENİ FONKSİYON BİTTİ ---


  // --- Diğer Fonksiyonlar (Aynı Kaldı) ---
  const handleUpdateAnalysis = async () => {
    setIsLoading(true);
    setNewApiResult(null); 
    const result = await onRunAnalysis(editableData);
    if (result) {
      setNewApiResult(result);
    }
    setIsLoading(false);
  };
  
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
  // --- FONKSİYONLAR BİTTİ ---

  
  // --- HESAPLAMALAR (Aynı Kaldı) ---
  const originalRiskScore = (originalResult.prediction * 100).toFixed(2);
  const originalFeaturesWithShap = useMemo(() => 
    originalResult.feature_names.map((name, index) => ({
      name: name,
      value: originalResult.feature_values[index],
      shap: originalResult.shap_values[index]
    })).sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)),
  [originalResult]); 

  const newRiskScore = newApiResult ? (newApiResult.prediction * 100).toFixed(2) : "0.00";
  const newFeaturesWithShap = useMemo(() => {
    if (!newApiResult) return [];
    return newApiResult.feature_names.map((name, index) => ({
      name: name,
      value: newApiResult.feature_values[index],
      shap: newApiResult.shap_values[index]
    })).sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
  }, [newApiResult]); 
  
  const featuresForSidebar = useMemo(() => 
    Object.entries(editableData).sort((a, b) => a[0].localeCompare(b[0])),
  [editableData]);
  // --- HESAPLAMALAR BİTTİ ---


  return (
    <div className="col-span-2 grid grid-cols-1 lg:grid-cols-4 gap-6"> 

      {/* --- SOL MENÜ (INPUT ALANLARI EKLENDİ) --- */}
      <aside className="lg:col-span-1 space-y-4">
        <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm sticky top-6">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
            Patient Data (What-If)
          </h3>
          <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-2"> 
            
            {featuresForSidebar.map(([name, value]) => {
              const isDecimal = DECIMAL_FEATURES.includes(name);
              const step = isDecimal ? 0.1 : 1;
              const isNonNegative = NON_NEGATIVE_FEATURES.includes(name);

              return (
                <div 
                  key={name} 
                  className="bg-gray-800 p-3 rounded-lg flex flex-col" 
                >
                  {/* Özellik Adı */}
                  <label className="font-medium text-white text-sm mb-2 w-full truncate" title={name}> 
                    {name} {name === 'gender_encoded' ? '(0: M, 1: F)' : ''}
                  </label>
                  
                  {/* Kontroller */}
                  {name === 'gender_encoded' ? (
                    // Gender için Input ve Toggle Butonu
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id={name}
                        name={name}
                        value={value ?? ''} 
                        onChange={(e) => handleInputChange(name, e.target.value)}
                        min="0"
                        max="1"
                        step="1" // Sadece 0 ve 1
                        className="flex-1 bg-gray-700 text-white p-1 rounded-md text-sm text-center border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number arrows
                      />
                       <button 
                        onClick={() => handleDataChange(name, 'toggle')}
                        className="bg-gray-600 hover:bg-gray-500 text-white p-1 px-2 rounded-md text-sm border border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Toggle Gender"
                      >
                        Toggle
                      </button>
                    </div>
                  ) : (
                    // Diğerleri için +/- Butonları ve Input Alanı
                    <div className="flex justify-between items-center w-full gap-2">
                      <button 
                        onClick={() => handleDataChange(name, isDecimal ? adjustDecimal(value, -step) : adjustInteger(value, -step))}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-50 flex-shrink-0"
                        aria-label={`Decrease ${name}`}
                        disabled={isNonNegative && (value === null || value <= 0)} // Negatifse veya null ise devre dışı
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step={isDecimal ? "0.1" : "1"}
                        id={name}
                        name={name}
                        value={value ?? ''} 
                        onChange={(e) => handleInputChange(name, e.target.value)}
                        min={isNonNegative ? "0" : undefined} // Negatif olamazsa min=0
                        className="flex-grow bg-gray-700 text-white w-16 rounded-md text-sm text-center border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number arrows
                      />
                      <button 
                        onClick={() => handleDataChange(name, isDecimal ? adjustDecimal(value, step) : adjustInteger(value, step))}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center focus:outline-none flex-shrink-0"
                        aria-label={`Increase ${name}`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
          </div>
          
          {/* Güncelleme Butonu (Aynı Kaldı) */}
          <button
            onClick={handleUpdateAnalysis}
            disabled={isLoading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
             {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            {isLoading ? 'Updating...' : 'Update & Compare'}
          </button>
        </div>
      </aside>
      {/* --- SOL MENÜ BİTİŞİ --- */}


      {/* --- ANA İÇERİK ALANI (Aynı Kaldı) --- */}
      <main className="lg:col-span-3 space-y-6">
        
        {/* Header (Aynı Kaldı) */}
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

        {/* --- KARŞILAŞTIRMA BÖLÜMÜ (Alt Alta - Aynı Kaldı) --- */}
        <div className="grid grid-cols-1 gap-10"> 
            
            {/* --- ORİJİNAL SONUÇ BÖLÜMÜ (Aynı Kaldı) --- */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-300 text-center border-b border-gray-700 pb-2 mb-4">Original Results</h3>

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
                {/* DIŞ DIV'E overflow-x-auto EKLENDİ */}
                <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0"> 
                  {/* IFRAME'E width: 100% GERİ GETİRİLDİ */}
                  <iframe
                    srcDoc={originalResult.shap_html}
                    style={{ width: '1200px', height: '150px', border: 'none' }} 
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
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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
            
            {/* --- YENİ SONUÇ BÖLÜMÜ (Koşullu - Aynı Kaldı) --- */}
            {newApiResult && (
              <div className="space-y-6">
                 {/* Yeni bölümleri ayırmak için çizgi */}
                <hr className="border-t-2 border-blue-800 my-4" /> 
                <h3 className="text-xl font-bold text-white text-center border-b border-gray-700 pb-2 mb-4">Updated Results</h3>

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
                  {/* DIŞ DIV'E overflow-x-auto EKLENDİ */}
                  <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
                    {/* IFRAME'E width: 100% GERİ GETİRİLDİ */}
                    <iframe
                      srcDoc={newApiResult.shap_html}
                      style={{ width: '1200px', height: '150px', border: 'none' }}
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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

