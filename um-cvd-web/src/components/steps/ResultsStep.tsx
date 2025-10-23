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
  const [progress, setProgress] = useState(0);
  const [hideOriginalFeatures, setHideOriginalFeatures] = useState(true);
  const [hideUpdatedFeatures, setHideUpdatedFeatures] = useState(true);
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
    setProgress(0);
    setNewApiResult(null); 
    
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Stop at 90% until API call completes
        return prev + Math.random() * 15; // Random increment between 0-15
      });
    }, 200);

    try {
      const result = await onRunAnalysis(editableData);
      
      // Complete the progress bar
      setProgress(100);
      clearInterval(progressInterval);
      
      if (result) {
        setNewApiResult(result);
      }
      
      // Small delay to show 100% completion
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
    }
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

  const downloadShapHTML = (htmlContent: string, type: 'original' | 'updated') => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shap-plot-${type}-${patientId || 'export'}-${new Date().toISOString().split('T')[0]}.html`;
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
    <>
      {/* Loading Popup for What-If Analysis */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <svg className="animate-spin mx-auto h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Updating Analysis</h3>
            <p className="text-gray-600 mb-4">Processing your what-if scenario changes...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{width: `${Math.min(progress, 100)}%`}}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

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

        {/* --- KARŞILAŞTIRMA BÖLÜMÜ (Alt Alta) --- */}
        <div className="grid grid-cols-1 gap-8"> 
            
            {/* --- ORİJİNAL SONUÇ BÖLÜMÜ --- */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-300 text-center border-b border-gray-700 pb-2 mb-4">Original Results</h3>

              {/* Prediction Score (Orijinal) */}
              <div className="bg-panel rounded-2xl border border-black/10 p-4 shadow-sm text-center">
                <h3 className="text-base font-semibold text-gray-300 mb-2">
                  CVD Risk Score
                </h3>
                <p className={`text-4xl font-bold ${parseFloat(originalRiskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {originalRiskScore}%
                </p>
              </div>

              {/* SHAP Plot ve Feature Contribution (Yan Yana) */}
              <div className={`grid gap-6 ${hideOriginalFeatures ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {/* SHAP Force Plot (Orijinal) */}
                <div className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
                    <h3 className="text-lg font-semibold text-white">
                      SHAP Force Plot
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadShapHTML(originalResult.shap_html, 'original')}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-medium transition-colors text-sm"
                        title="Download SHAP Plot as HTML"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download HTML
                      </button>
                      <button
                        onClick={() => setHideOriginalFeatures(!hideOriginalFeatures)}
                        className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg font-medium transition-colors text-sm"
                        title={hideOriginalFeatures ? "Show Feature Contribution" : "Hide Feature Contribution"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {hideOriginalFeatures ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          )}
                        </svg>
                        {hideOriginalFeatures ? 'Show Features' : 'Hide Features'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Base Value: {originalResult.base_value.toFixed(3)}
                  </p>
                  <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0"> 
                    <iframe
                      srcDoc={originalResult.shap_html}
                      style={{ width: '1200px', minWidth: '500px', height: '150px', border: 'none' }} 
                      title="Original SHAP Force Plot"
                      seamless 
                    />
                  </div>
                </div>
                
                {/* Feature Contribution (Orijinal) */}
                {!hideOriginalFeatures && (
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
                )}
              </div>
            </div>
            
            {/* --- YENİ SONUÇ BÖLÜMÜ (Koşullu) --- */}
            {newApiResult && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white text-center border-b border-gray-700 pb-2 mb-4">Updated Results</h3>

                {/* Prediction Score (Yeni) */}
                <div className="bg-panel rounded-2xl border border-blue-900/50 p-4 shadow-sm text-center">
                  <h3 className="text-base font-semibold text-gray-300 mb-2">
                    CVD Risk Score
                  </h3>
                  <p className={`text-4xl font-bold ${parseFloat(newRiskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                    {newRiskScore}%
                  </p>
                </div>

                {/* SHAP Plot ve Feature Contribution (Yan Yana) */}
                <div className={`grid gap-6 ${hideUpdatedFeatures ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                  {/* SHAP Force Plot (Yeni) */}
                  <div className="bg-panel rounded-2xl border border-blue-900/50 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
                      <h3 className="text-lg font-semibold text-white">
                        SHAP Force Plot
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadShapHTML(newApiResult.shap_html, 'updated')}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-medium transition-colors text-sm"
                          title="Download SHAP Plot as HTML"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download HTML
                        </button>
                        <button
                          onClick={() => setHideUpdatedFeatures(!hideUpdatedFeatures)}
                          className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg font-medium transition-colors text-sm"
                          title={hideUpdatedFeatures ? "Show Feature Contribution" : "Hide Feature Contribution"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {hideUpdatedFeatures ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            )}
                          </svg>
                          {hideUpdatedFeatures ? 'Show Features' : 'Hide Features'}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">
                      Base Value: {newApiResult.base_value.toFixed(3)}
                    </p>
                    <div className="bg-white rounded-lg overflow-x-auto overflow-y-hidden p-0">
                      <iframe
                        srcDoc={newApiResult.shap_html}
                        style={{ width: '1100px', minWidth: '500px', height: '150px', border: 'none' }}
                        title="New SHAP Force Plot"
                        seamless 
                      />
                    </div>
                  </div>
                  
                  {/* Feature Contribution (Yeni) */}
                  {!hideUpdatedFeatures && (
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
                  )}
                </div>
              </div>
            )}
            
        </div>
        
      </main>
      {/* --- ANA İÇERİK ALANI BİTİŞİ --- */}

    </div>
    </>
  );
}

