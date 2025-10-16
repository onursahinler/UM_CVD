import { useState, useCallback, memo } from 'react';
import { Stepper } from '@/components/Stepper';
import { SegmentedProgress } from '@/components/Progress';
import { PatientInfoStep } from '@/components/steps/PatientInfoStep';
import { DemographicStep } from '@/components/steps/DemographicStep';
import { LaboratoryStep } from '@/components/steps/LaboratoryStep';
import { TreatmentStep } from '@/components/steps/TreatmentStep';
import { ModelStep } from '@/components/steps/ModelStep';
import { SummaryStep } from '@/components/steps/SummaryStep';
import { PatientForm, FormErrors } from '@/types';
import { ASSESSMENT_STEPS, STEPPER_STEPS, PANEL_TITLES } from '@/constants/steps';
import { validateStep } from '@/utils/validation';

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

  const goNext = useCallback(() => {
    if (activeIndex === 4) {
      onComplete();
      return;
    }
    if (!validate(activeIndex)) return;
    setActiveIndex((i) => Math.min(i + 1, ASSESSMENT_STEPS.length - 1));
  }, [activeIndex, onComplete, validate]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  const renderStep = () => {
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
                age: form.age,
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
        return <SummaryStep form={form} />;

      default:
        return <div className="text-sm text-foreground/70">Coming soon…</div>;
    }
  };

  const panelTitle = PANEL_TITLES[activeIndex as keyof typeof PANEL_TITLES] || "Step";

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* Progress bar */}
      <section className="lg:col-span-2">
        <SegmentedProgress steps={ASSESSMENT_STEPS} activeIndex={activeIndex} />
      </section>

      {/* Sidebar Steps */}
      <aside>
        <div className="mb-3 text-sm font-semibold text-foreground/80">Assessment Steps</div>
        <Stepper
          activeIndex={activeIndex}
          steps={STEPPER_STEPS}
        />
      </aside>

      {/* Right Form Panel */}
      <section className="bg-panel rounded-2xl p-6 shadow-sm">
        <h2 className="font-display text-3xl mb-4">{panelTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderStep()}
        </div>

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
            className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold"
          >
            {activeIndex === 4 ? "Finish" : "Next"}
          </button>
        </div>
      </section>
    </main>
  );
});

AssessmentForm.displayName = 'AssessmentForm';

export { AssessmentForm };
