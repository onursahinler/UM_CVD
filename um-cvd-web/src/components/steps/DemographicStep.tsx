"use client";

import React from "react";
import { PillNumberInput, PillToggle } from "../FormFields";

interface DemographicStepProps {
  form: {
    age: string;
    bmi: string;
    diastolic: string;
    systolic: string;
    gender: string;
    diabetes: string;
    ckd: string;
  };
  errors: Record<string, string>;
  onInput: (key: "age" | "bmi" | "diastolic" | "systolic") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: (key: "gender" | "diabetes" | "ckd") => (val: string) => void;
}

export function DemographicStep({ form, errors, onInput, onToggle }: DemographicStepProps) {
  return (
    <>
      <PillNumberInput
        label="Age (years)"
        placeholder="Ex: 65"
        step={1}
        required
        value={form.age}
        onChange={onInput("age")}
        error={errors.age}
      />
      <PillToggle
        label="Gender"
        required
        options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]}
        value={form.gender}
        onChange={onToggle("gender")}
        error={errors.gender}
      />
      <PillNumberInput
        label="BMI (kg/m²)"
        placeholder="Ex: 24.7"
        step={0.1}
        required
        value={form.bmi}
        onChange={onInput("bmi")}
        error={errors.bmi}
      />
      <PillToggle
        label="Diabetes Mellitus"
        required
        options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
        value={form.diabetes}
        onChange={onToggle("diabetes")}
        error={errors.diabetes}
      />
      <PillNumberInput
        label="Diastolic (mmHg)"
        placeholder="Ex: 80"
        step={1}
        required
        value={form.diastolic}
        onChange={onInput("diastolic")}
        error={errors.diastolic}
      />
      <PillToggle
        label="Chronic Kidney Disease"
        required
        options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
        value={form.ckd}
        onChange={onToggle("ckd")}
        error={errors.ckd}
      />
      <PillNumberInput
        label="Systolic (mmHg)"
        placeholder="Ex: 120"
        step={1}
        required
        value={form.systolic}
        onChange={onInput("systolic")}
        error={errors.systolic}
      />
    </>
  );
}
