"use client";

import { useState, lazy, Suspense } from "react";
import { HeroSection } from "@/components/sections/HeroSection";
import { AssessmentForm } from "@/components/sections/AssessmentForm";
import { usePatientForm } from "@/hooks/usePatientForm";

// Lazy load the heavy analysis component
const CMLRiskAnalysis = lazy(() => import("@/components/CMLRiskAnalysis").then(module => ({ default: module.CMLRiskAnalysis })));

export default function Dashboard() {
  const [isCompleted, setIsCompleted] = useState(false);
  const {
    form,
    errors,
    isIdGenerated,
    handleInput,
    handleToggle,
    handleGenerateId,
    handleModelSelect,
    handleTkiTypeChange,
    validate,
    handleFileUpload,
  } = usePatientForm();

  const handleComplete = () => {
    setIsCompleted(true);
  };

  const handleFileUploadWithReset = (data: any) => {
    handleFileUpload(data);
    setIsCompleted(false);
  };

  if (isCompleted) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analysis...</p>
          </div>
        </div>
      }>
        <CMLRiskAnalysis form={form} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <HeroSection onFileUpload={handleFileUploadWithReset} />
      
      <AssessmentForm
        form={form}
        errors={errors}
        isIdGenerated={isIdGenerated}
        onInput={handleInput}
        onToggle={handleToggle}
        onGenerateId={handleGenerateId}
        onModelSelect={handleModelSelect}
        onTkiTypeChange={handleTkiTypeChange}
        onComplete={handleComplete}
        validate={validate}
      />

      <footer className="mt-auto py-8 text-center text-xs text-white/70">
        © UM Institute of Data Science
      </footer>
    </div>
  );
}
