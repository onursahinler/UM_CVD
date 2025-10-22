// AssessmentForm.tsx (TÜM MANTIK BURADA)

"use client"; // YENİ: 'useState' ve 'useCallback' için gerekli

import { useState, useCallback, memo } from 'react';
import { Stepper } from '@/components/Stepper';
import { SegmentedProgress } from '@/components/Progress';
import { PatientInfoStep } from '@/components/steps/PatientInfoStep';
import { DemographicStep } from '@/components/steps/DemographicStep';
import { LaboratoryStep } from '@/components/steps/LaboratoryStep';
import { TreatmentStep } from '@/components/steps/TreatmentStep';
import { ModelStep } from '@/components/steps/ModelStep';
import { SummaryStep } from '@/components/steps/SummaryStep';

// YENİ: ResultsStep ve API tipini import et
import { ResultsStep, ApiResult } from '@/components/steps/ResultsStep'; 

import { PatientForm, FormErrors } from '@/types';
import { ASSESSMENT_STEPS, STEPPER_STEPS, PANEL_TITLES } from '@/constants/steps';
// 'validateStep' importu kaldırıldı, `validate` prop'u kullanılacak

interface AssessmentFormProps {
  form: PatientForm;
  errors: FormErrors;
  isIdGenerated: boolean;
  onInput: (key: keyof PatientForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: (key: keyof PatientForm) => (val: string | number) => void;
  onGenerateId: () => void;
  onModelSelect: (modelId: string) => void;
  onTkiTypeChange: (value: string | number) => void;
  onComplete: () => void; // Bu prop artık kullanılmayacak ama yerinde kalabilir
  validate: (activeIndex: number) => boolean;
}

const AssessmentForm = memo(({
  form,
  errors,
  isIdGenerated,
  onInput,
  onToggle,
  onGenerateId,
  onModelSelect,
  onTkiTypeChange,
  onComplete, // Kullanılmayacak
  validate,
}: AssessmentFormProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // --- YENİ API STATE'LERİ ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  // ---------------------------


  // --- YENİ API ÇAĞRISI FONKSİYONU ---
  const handleFinish = async () => {
    // Son adımda tekrar validasyon yap
    if (!validate(activeIndex)) return; 

    setIsLoading(true);
    setError(null);
    setApiResult(null);

    // SummaryStep'teki 'exportObj' ile aynı mantık
    // Modelin beklemediği "Full name" ve "Patient ID" alanlarını ÇIKARIYORUZ.
    const exportObj = {
      anchor_age: form.anchor_age ? parseFloat(form.anchor_age) : null,
      "White Blood Cells": form.whiteBloodCells ? parseFloat(form.whiteBloodCells) : null,
      "Urea Nitrogen": form.ureaNitrogen ? parseFloat(form.ureaNitrogen) : null,
      Neutrophils: form.neutrophils ? parseFloat(form.neutrophils) : null, // (SP) API'nizdeki 'Neutrophils' olmalı
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
    
    // (SP) DİKKAT: 'exportObj' içindeki "Neutrifils" isminin app.py'deki
    // FEATURE_ORDER listesindeki "Neutrophils" ile eşleştiğinden emin olun.
    // Eşleşmiyorsa burayı düzeltin.

    try {
      const API_URL = "http://localhost:5000/api/predict";

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportObj),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setApiResult(data); // Sonucu state'e kaydet
      } else {
        setError(data.message || 'Modelden bilinmeyen bir hata alındı.');
      }

    } catch (err) {
      console.error(err);
      setError('Sunucuya bağlanılamadı. Backend (app.py) çalışıyor mu?');
    } finally {
      setIsLoading(false);
    }
  };
  // ---------------------------------

  const goNext = useCallback(() => {
    // GÜNCELLENDİ: 4. adımdaysa `onComplete` YERİNE `handleFinish`'i çağır
    if (activeIndex === 4) {
      handleFinish();
      return;
    }
    if (!validate(activeIndex)) return;
    setActiveIndex((i) => Math.min(i + 1, ASSESSMENT_STEPS.length - 1));
  }, [activeIndex, validate, handleFinish]); // handleFinish'i bağımlılığa ekle

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // YENİ: Sonuç ekranından geriye dönmek için
  const handleBackFromResult = () => {
    setApiResult(null); // Sonucu temizle
    setError(null);
    // Özet ekranına (activeIndex 4) geri dön
    setActiveIndex(ASSESSMENT_STEPS.length - 1); 
  };

  const renderStep = () => {
    
    // --- YENİ KONTROL ---
    // Eğer API sonucu varsa, diğer tüm adımları atla ve ResultsStep'i göster
    if (apiResult) {
      return (
        <ResultsStep
          result={apiResult}
          onBack={handleBackFromResult}
          patientId={form.patientId || ""}
        />
      );
    }
    // --------------------


    switch (activeIndex) {
      case 0:
        // ... (değişiklik yok) ...
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
        // ... (değişiklik yok) ...
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
        // ... (değişiklik yok) ...
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
        // ... (değişiklik yok) ...
        return (
          <ModelStep
            form={{ model: form.model }}
            errors={errors}
            onModelSelect={onModelSelect}
          />
        );

      case 4:
        // GÜNCELLENDİ: SummaryStep'e `error` prop'unu geçir
        return (
          <SummaryStep 
            form={form}
            error={error} // Hata mesajını özet ekranına yolla
          />
        );

      default:
        return <div className="text-sm text-foreground/70">Coming soon…</div>;
    }
  };

  // Panel başlığını `apiResult` durumuna göre ayarla
  const panelTitle = apiResult 
    ? "Analysis Results" 
    : PANEL_TITLES[activeIndex as keyof typeof PANEL_TITLES] || "Step";

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* Progress bar */}
      {/* GÜNCELLENDİ: Sonuç ekranındayken progress bar'ı gizle */}
      {!apiResult && (
        <section className="lg:col-span-2">
          <SegmentedProgress steps={ASSESSMENT_STEPS} activeIndex={activeIndex} />
        </section>
      )}

      {/* Sidebar Steps */}
      {/* GÜNCELLENDİ: Sonuç ekranındayken sidebar'ı gizle */}
      {!apiResult && (
        <aside>
          <div className="mb-3 text-sm font-semibold text-foreground/80">Assessment Steps</div>
          <Stepper
            activeIndex={activeIndex}
            steps={STEPPER_STEPS}
          />
        </aside>
      )}
      
      {/* GÜNCELLENDİ: Sonuç ekranındayken tam genişlik kullan */}
      <section className={`bg-panel rounded-2xl p-6 shadow-sm ${apiResult ? 'lg:col-span-2' : ''}`}>
        <h2 className="font-display text-3xl mb-4">{panelTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderStep()}
        </div>

        {/* GÜNCELLENDİ: Sonuç ekranındayken butonları gizle */}
        {!apiResult && (
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
              disabled={isLoading} // YENİ: Yüklenirken butonu devre dışı bırak
              className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold flex items-center disabled:opacity-50"
            >
              {/* YENİ: Yüklenme göstergesi */}
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