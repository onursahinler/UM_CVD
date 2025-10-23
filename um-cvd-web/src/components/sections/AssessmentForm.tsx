"use client";

import { useState, useCallback, memo } from 'react';
import { Stepper } from '@/components/Stepper';
import { SegmentedProgress } from '@/components/Progress';
import { PatientInfoStep } from '@/components/steps/PatientInfoStep';
import { DemographicStep } from '@/components/steps/DemographicStep';
import { LaboratoryStep } from '@/components/steps/LaboratoryStep';
import { TreatmentStep } from '@/components/steps/TreatmentStep';
import { ModelStep } from '@/components/steps/ModelStep';
import { SummaryStep } from '@/components/steps/SummaryStep';
// YENİ: ResultsStep ve ApiResult tipini import et
import { ResultsStep, ApiResult } from '@/components/steps/ResultsStep'; 
import { PatientForm, FormErrors } from '@/types';
import { ASSESSMENT_STEPS, STEPPER_STEPS, PANEL_TITLES } from '@/constants/steps';

// YENİ: ApiResult'ın 'status' ve 'message' alanlarını da içermesi için tip tanımı
type ApiResultWithError = ApiResult | { status: "error"; message: string };

// ... (AssessmentFormProps interface'i aynı kalıyor) ...
interface AssessmentFormProps {
  form: PatientForm;
  errors: FormErrors;
  isIdGenerated: boolean;
  onInput: (key: keyof PatientForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: (key: keyof PatientForm) => (val: string | number) => void;
  onGenerateId: () => void;
  onModelSelect: (modelId: string) => void;
  onTkiTypeChange: (value: string | number) => void;
  onComplete: () => void;
  validate: (activeIndex: number) => boolean;
}

// --- YENİ: API'ye gönderilecek düz veri formatının tipi ---
// Bu, hem orijinal analiz hem de "what-if" analizi için kullanılacak
export type FlatPatientData = Record<string, number | null>;


const AssessmentForm = memo(({
  form,
  errors,
  isIdGenerated,
  onInput,
  onToggle,
  onGenerateId,
  onModelSelect,
  onTkiTypeChange,
  onComplete,
  validate,
}: AssessmentFormProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // --- API STATE'LERİ GÜNCELLENDİ ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 'apiResult' adını 'originalApiResult' olarak değiştiriyoruz
  const [originalApiResult, setOriginalApiResult] = useState<ApiResult | null>(null);
  // Orijinal verinin düz halini de saklayacağız
  const [originalFlatData, setOriginalFlatData] = useState<FlatPatientData | null>(null);
  // ---------------------------


  // --- YENİ: YENİDEN KULLANILABİLİR ANALİZ FONKSİYONU ---
  // API çağırma mantığını 'goNext' içinden çıkarıp buraya taşıdık.
  // Bu fonksiyon artık 'ResultsStep'e prop olarak aktarılacak.
  const runAnalysis = async (dataToAnalyze: FlatPatientData): Promise<ApiResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const API_URL = "http://localhost:5000/api/predict";
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToAnalyze),
      });

      const data: ApiResultWithError = await response.json();

      if (data.status === 'success') {
        setIsLoading(false);
        // Başarılı sonucu döndür
        return data as ApiResult; 
      } else {
        setError(data.message || 'Modelden bilinmeyen bir hata alındı.');
        setIsLoading(false);
        return null;
      }

    } catch (err) {
      console.error(err);
      setError('Sunucuya bağlanılamadı. Backend (app.py) çalışıyor mu?');
      setIsLoading(false);
      return null;
    }
  };
  // ---------------------------------
  
  // --- 'goNext' FONKSİYONU GÜNCELLENDİ ---
  const goNext = useCallback(async () => {
    // 4. adımdaysa 'runAnalysis' fonksiyonunu çağır
    if (activeIndex === 4) {
      if (!validate(activeIndex)) return;
      
      // API'ye göndermek için veriyi düz objeye çevir
      const flatData: FlatPatientData = {
        anchor_age: form.anchor_age ? parseFloat(form.anchor_age) : null,
        "White Blood Cells": form.whiteBloodCells ? parseFloat(form.whiteBloodCells) : null,
        "Urea Nitrogen": form.ureaNitrogen ? parseFloat(form.ureaNitrogen) : null,
        "Neutrophils": form.neutrophils ? parseFloat(form.neutrophils) : null,
        BMI: form.bmi ? parseFloat(form.bmi) : null,
        Monocytes: form.monocytes ? parseFloat(form.monocytes) : null,
        Glucose: form.glucose ? parseFloat(form.glucose) : null,
        systolic: form.systolic ? parseFloat(form.systolic) : null,
        MCH: form.mch ? parseFloat(form.mch) : null,
        "Calcium, Total": form.calciumTotal ? parseFloat(form.calciumTotal) : null,
        Lymphocytes: form.lymphocytes ? parseFloat(form.lymphocytes) : null,
        Creatinine: form.creatinine ? parseFloat(form.creatinine) : null,
        Sodium: form.sodium ? parseFloat(form.sodium) : null,
        diastolic: form.diastolic ? parseFloat(form.diastolic) : null,
        PT: form.pt ? parseFloat(form.pt) : null,
        imatinib_dose: form.tkiDoses?.imatinib ?? 0,
        dasatinib_dose: form.tkiDoses?.dasatinib ?? 0,
        gender_encoded: typeof form.gender === 'number' ? form.gender : null,
        nilotinib_dose: form.tkiDoses?.nilotinib ?? 0,
        ponatinib_dose: form.tkiDoses?.ponatinib ?? 0,
        ruxolitinib_dose: form.tkiDoses?.ruxolitinib ?? 0,
      };

      const result = await runAnalysis(flatData); // YENİ fonksiyonu çağır
      
      if (result) {
        setOriginalApiResult(result); // Orijinal sonucu ayarla
        setOriginalFlatData(flatData); // Orijinal veriyi ayarla
      }
      // 'onComplete' prop'u artık kullanılmıyor, 'apiResult' state'i render'ı tetikliyor
      return;
    }
    
    // Diğer adımlar için
    if (!validate(activeIndex)) return;
    setActiveIndex((i) => Math.min(i + 1, ASSESSMENT_STEPS.length - 1));
  }, [activeIndex, validate, form, runAnalysis]); // 'form' ve 'runAnalysis' bağımlılıklara eklendi

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // 'ResultsStep'ten geri dönmek için
  const handleBackFromResults = () => {
    setOriginalApiResult(null); // Sonucu temizle
    setOriginalFlatData(null);
    setError(null);
    setActiveIndex(4); // Özet ekranına (activeIndex 4) geri dön
  };

  const renderStep = () => {
    
    // --- YENİ KONTROL ---
    // Eğer Orijinal API sonucu varsa, ResultsStep'i göster
    if (originalApiResult && originalFlatData) {
      return (
        <ResultsStep
          // YENİ PROPLAR:
          originalResult={originalApiResult}
          originalFlatData={originalFlatData}
          onRunAnalysis={runAnalysis} // API fonksiyonunu iletiyoruz
          onBack={handleBackFromResults}
          patientId={form.patientId || ""}
        />
      );
    }
    // --------------------


    switch (activeIndex) {
      case 0:
        return (
          <>
            <PatientInfoStep
              form={{ patientName: form.patientName, patientId: form.patientId }}
              errors={errors}
              isIdGenerated={isIdGenerated}
              onInput={onInput}
              onGenerateId={onGenerateId}
            />
            <DemographicStep
              form={{
                anchor_age: form.anchor_age,
                bmi: form.bmi,
                diastolic: form.diastolic,
                systolic: form.systolic,
                gender: form.gender,
              }}
              errors={errors}
              onInput={onInput}
              onToggle={onToggle}
            />
          </>
        );

      case 1:
        return (
          <LaboratoryStep
            form={{
              ureaNitrogen: form.ureaNitrogen,
              glucose: form.glucose,
              whiteBloodCells: form.whiteBloodCells,
              neutrophils: form.neutrophils,
              monocytes: form.monocytes,
              mch: form.mch,
              calciumTotal: form.calciumTotal,
              lymphocytes: form.lymphocytes,
              creatinine: form.creatinine,
              sodium: form.sodium,
              pt: form.pt,
            }}
            errors={errors}
            onInput={onInput}
          />
        );

      case 2:
        return (
          <TreatmentStep
            form={{
              tkiType: form.tkiType,
              tkiDose: form.tkiDose,
            }}
            errors={errors}
            onToggle={onToggle}
            onInput={onInput}
            onTkiTypeChange={onTkiTypeChange}
          />
        );

      case 3:
        return (
          <ModelStep
            form={{ model: form.model }}
            errors={errors}
            onModelSelect={onModelSelect}
          />
        );

      case 4:
        return (
          <SummaryStep 
            form={form}
            error={error} 
          />
        );

      default:
        return <div className="text-sm text-foreground/70">Coming soon…</div>;
    }
  };

  // Panel başlığını 'apiResult' durumuna göre ayarla
  const panelTitle = originalApiResult
    ? "Analysis Results" 
    : PANEL_TITLES[activeIndex as keyof typeof PANEL_TITLES] || "Step";

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* GÜNCELLENDİ: Sonuç ekranındayken progress bar'ı gizle */}
      {!originalApiResult && (
        <section className="lg:col-span-2">
          <SegmentedProgress steps={ASSESSMENT_STEPS} activeIndex={activeIndex} />
        </section>
      )}

      {/* GÜNCELLENDİ: Sonuç ekranındayken sidebar'ı gizle */}
      {!originalApiResult && (
        <aside>
          <div className="mb-3 text-sm font-semibold text-foreground/80">Assessment Steps</div>
          <Stepper
            activeIndex={activeIndex}
            steps={STEPPER_STEPS}
          />
        </aside>
      )}
      
      {/* GÜNCELLENDİ: Sonuç ekranındayken tam genişlik kullan */}
      <section className={`bg-panel rounded-2xl p-6 shadow-sm ${originalApiResult ? 'lg:col-span-2' : ''}`}>
        
        {/* GÜNCELLENDİ: Başlık artık 'renderStep' içinde değil, burada */}
        {/* 'ResultsStep' kendi başlığını (Header) yönetecek */}
        {!originalApiResult && (
           <h2 className="font-display text-3xl mb-4">{panelTitle}</h2>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderStep()}
        </div>

        {/* GÜNCELLENDİ: Sonuç ekranındayken butonları gizle */}
        {!originalApiResult && (
          <div className="flex justify-end gap-3 pt-6">
            {activeIndex > 0 && (
              <button 
                onClick={goPrev} 
                className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold"
              >
                Previous
              </button>
            )}
            <button 
              onClick={goNext} 
              disabled={isLoading} // Yüklenirken butonu devre dışı bırak
              className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold flex items-center disabled:opacity-50"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Analiz Ediliyor...' : (activeIndex === 4 ? "Finish & Analyze" : "Next")}
            </button>
          </div>
        )}
      </section>
    </main>
  );
});

AssessmentForm.displayName = 'AssessmentForm';

export { AssessmentForm };