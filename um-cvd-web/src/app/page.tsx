"use client";

import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { SegmentedProgress } from "@/components/Progress";
import { PatientInfoStep } from "@/components/steps/PatientInfoStep";
import { DemographicStep } from "@/components/steps/DemographicStep";
import { LaboratoryStep } from "@/components/steps/LaboratoryStep";
import { TreatmentStep } from "@/components/steps/TreatmentStep";
import { FileUploadStep } from "@/components/steps/FileUploadStep";
import { ModelStep } from "@/components/steps/ModelStep";
import { SummaryStep } from "@/components/steps/SummaryStep";
import { CMLRiskAnalysis } from "@/components/CMLRiskAnalysis";

export default function Home() {
  const steps = [
    { id: "demographic", label: "Demographics" },
    { id: "laboratory", label: "Laboratory" },
    { id: "treatment", label: "Treatment" },
    { id: "analysis", label: "Analysis" },
    { id: "confirmation", label: "Confirmation" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isIdGenerated, setIsIdGenerated] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [showFileInput, setShowFileInput] = useState(false);

  // simple local form state
  const [form, setForm] = useState({
    // patient info
    patientName: "",
    patientId: "",
    // step 1
    age: "",
    bmi: "",
    diastolic: "",
    systolic: "",
    gender: "",
    diabetes: "",
    ckd: "",
    // step 2
    rbc: "",
    ureaNitrogen: "",
    albumin: "",
    ldh: "",
    metamyelocytes: "",
    cholesterol: "",
    hba1c: "",
    glucose: "",
    // step 3
    tkiType: "",
    tkiDose: "",
    // step 4
    model: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: keyof typeof form, hasValue: boolean) => {
    setErrors((prev) => {
      const next = { ...prev } as Record<string, string>;
      if (hasValue) delete next[key];
      return next;
    });
  };

  const handleInput = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.currentTarget.value;
      setForm((f) => ({ ...f, [key]: val }));
      clearError(key, val !== "");
    };

  const handleToggle = (key: keyof typeof form) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key, !!val);
  };

  const generatePatientId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CVD-${timestamp}-${random}`.toUpperCase();
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (activeIndex === 0) {
      if (!form.patientName) nextErrors.patientName = "This field is required";
      if (!form.patientId) nextErrors.patientId = "Please generate a patient ID";
      if (!form.age) nextErrors.age = "This field is required";
      if (!form.bmi) nextErrors.bmi = "This field is required";
      if (!form.diastolic) nextErrors.diastolic = "This field is required";
      if (!form.systolic) nextErrors.systolic = "This field is required";
      if (!form.gender) nextErrors.gender = "Please select an option";
      if (!form.diabetes) nextErrors.diabetes = "Please select an option";
      if (!form.ckd) nextErrors.ckd = "Please select an option";
    } else if (activeIndex === 1) {
      if (!form.rbc) nextErrors.rbc = "This field is required";
      if (!form.ureaNitrogen) nextErrors.ureaNitrogen = "This field is required";
      if (!form.albumin) nextErrors.albumin = "This field is required";
      if (!form.ldh) nextErrors.ldh = "This field is required";
      if (!form.metamyelocytes) nextErrors.metamyelocytes = "This field is required";
      if (!form.cholesterol) nextErrors.cholesterol = "This field is required";
      if (!form.hba1c) nextErrors.hba1c = "This field is required";
      if (!form.glucose) nextErrors.glucose = "This field is required";
    } else if (activeIndex === 2) {
      if (!form.tkiType) nextErrors.tkiType = "Please select TKI type";
      if (!form.tkiDose) nextErrors.tkiDose = "This field is required";
    } else if (activeIndex === 3) {
      if (!form.model) nextErrors.model = "Please choose a model";
    } else if (activeIndex === 4) {
      // no required fields, just review
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (activeIndex === 4) {
      setIsCompleted(true);
      return;
    }
    if (!validate()) return;
    setActiveIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goPrev = () => setActiveIndex((i) => Math.max(i - 1, 0));

  const handleFileUpload = (data: any) => {
    setUploadedData(data);
    // Auto-fill form with uploaded data
    setForm(prev => ({
      ...prev,
      patientName: data.patientName || "",
      patientId: data.patientId || "",
      age: data.age?.toString() || "",
      gender: data.gender || "",
      bmi: data.bmi?.toString() || "",
      diabetes: data.diabetes || "",
      diastolic: data.diastolic?.toString() || "",
      ckd: data.ckd || "",
      systolic: data.systolic?.toString() || "",
      rbc: data.rbc?.toString() || "",
      ureaNitrogen: data.ureaNitrogen?.toString() || "",
      albumin: data.albumin?.toString() || "",
      ldh: data.ldh?.toString() || "",
      metamyelocytes: data.metamyelocytes?.toString() || "",
      cholesterol: data.cholesterol?.toString() || "",
      hba1c: data.hba1c?.toString() || "",
      glucose: data.glucose?.toString() || "",
      tkiType: data.tkiType || "",
      tkiDose: data.tkiDose?.toString() || "",
    }));
    setIsIdGenerated(!!data.patientId);
    setShowFileInput(false);
    setActiveIndex(0); // Go to first step
  };

  const renderStep = () => {
    if (activeIndex === 0) {
      return (
        <>
          <PatientInfoStep
            form={{ patientName: form.patientName, patientId: form.patientId }}
            errors={errors}
            isIdGenerated={isIdGenerated}
            onInput={handleInput as any}
            onGenerateId={() => { 
              if (!isIdGenerated) {
                setForm(f => ({ ...f, patientId: generatePatientId() })); 
                setIsIdGenerated(true);
                clearError("patientId", true); 
              }
            }}
          />
          <DemographicStep
            form={{
              age: form.age,
              bmi: form.bmi,
              diastolic: form.diastolic,
              systolic: form.systolic,
              gender: form.gender,
              diabetes: form.diabetes,
              ckd: form.ckd,
            }}
            errors={errors}
            onInput={handleInput as any}
            onToggle={handleToggle as any}
          />
        </>
      );
    }

    if (activeIndex === 1) {
      return (
        <LaboratoryStep
          form={{
            rbc: form.rbc,
            ureaNitrogen: form.ureaNitrogen,
            albumin: form.albumin,
            ldh: form.ldh,
            metamyelocytes: form.metamyelocytes,
            cholesterol: form.cholesterol,
            hba1c: form.hba1c,
            glucose: form.glucose,
          }}
          errors={errors}
          onInput={handleInput as any}
        />
      );
    }

    if (activeIndex === 2) {
      return (
        <TreatmentStep
          form={{
            tkiType: form.tkiType,
            tkiDose: form.tkiDose,
          }}
          errors={errors}
          onToggle={handleToggle as any}
          onInput={handleInput as any}
          onTkiTypeChange={(v) => { 
            setForm((f) => ({ ...f, tkiType: v })); 
            clearError("tkiType", !!v); 
          }}
        />
      );
    }

    if (activeIndex === 3) {
      return (
        <ModelStep
          form={{ model: form.model }}
          errors={errors}
          onModelSelect={(modelId) => { 
            setForm((f) => ({ ...f, model: modelId })); 
            clearError("model", true); 
          }}
        />
      );
    }

    if (activeIndex === 4) {
      return <SummaryStep form={form} />;
    }

    return <div className="text-sm text-foreground/70">Coming soon…</div>;
  };

  const panelTitle = activeIndex === 0 ? "Demographic and Health" : activeIndex === 1 ? "Laboratory Tests Data" : activeIndex === 2 ? "CML Treatment (TKI) Data" : activeIndex === 3 ? "Predictive Models" : activeIndex === 4 ? "Review & Confirmation" : "Step";

  if (isCompleted) {
    return <CMLRiskAnalysis form={form} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Cardiovascular
              <br />
              Risk Assessment
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              Advanced AI-powered cardiovascular disease prediction tool specifically designed
              for Chronic Myelogenous Leukemia (CML) patients. Get accurate risk assessments using
              state-of-the-art machine learning algorithms.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">96.4%</div>
                <div className="text-xs uppercase tracking-wide">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">2319</div>
                <div className="text-xs uppercase tracking-wide">Patients Assessed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">24/7</div>
                <div className="text-xs uppercase tracking-wide">Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">AI</div>
                <div className="text-xs uppercase tracking-wide">Powered</div>
              </div>
            </div>
            
            {/* Upload JSON Button */}
            <div className="pt-6">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const jsonData = JSON.parse(event.target?.result as string);
                        handleFileUpload(jsonData);
                      } catch (error) {
                        alert("Invalid JSON file. Please check the format and try again.");
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
                id="json-upload"
              />
              <button
                onClick={() => document.getElementById('json-upload')?.click()}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload JSON Data
              </button>
              <p className="text-white/70 text-sm mt-2">
                Have patient data in JSON format? Upload it directly to skip manual entry.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Progress bar */}
        <section className="lg:col-span-2">
          <SegmentedProgress steps={steps} activeIndex={activeIndex} />
        </section>

        {/* Sidebar Steps */}
        <aside>
          <div className="mb-3 text-sm font-semibold text-foreground/80">Assessment Steps</div>
          <Stepper
            activeIndex={activeIndex}
            steps={[
              { id: "demographic", label: "Demographic and Health", helper: "Patient information, age, gender, vital signs" },
              { id: "lab", label: "Laboratory Tests Data", helper: "Blood values and biochemistry" },
              { id: "tki", label: "CML Treatment (TKI) Data", helper: "TKI type and dosage" },
              { id: "models", label: "Predictive Models", helper: "Model selection and result" },
              { id: "review", label: "Review & Confirmation", helper: "Summary of patient data" },
            ]}
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
              <button onClick={goPrev} className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold">Previous</button>
            )}
            <button onClick={goNext} className="rounded-pill bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-semibold">{activeIndex === 4 ? "Finish" : "Next"}</button>
          </div>
        </section>
      </main>

      <footer className="mt-auto py-8 text-center text-xs text-white/70">
        © UM Institute of Data Science
      </footer>
    </div>
  );
}
