"use client";

import React from "react";
import { PillNumberInput, PillToggle } from "../FormFields";

interface DemographicStepProps {
  form: {
    anchor_age: string;
    bmi: string;
    diastolic: string;
    systolic: string;
    gender: number;
  };
  errors: Record<string, string>;
  onInput: (key: "anchor_age" | "bmi" | "diastolic" | "systolic") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: (key: "gender") => (val: string | number) => void;
}

export function DemographicStep({ form, errors, onInput, onToggle }: DemographicStepProps) {
  return (
    <>
      <PillNumberInput
        label="Age (years)"
        placeholder="Ex: 65"
        step={1}
        min={0}
        required
        integerOnly
        value={form.anchor_age}
        onChange={onInput("anchor_age")}
        error={errors.anchor_age}
      />
      <PillToggle
        label="Gender"
        required
        options={[{ value: 0, label: "Male" }, { value: 1, label: "Female" }]}
        value={form.gender}
        onChange={onToggle("gender")}
        error={errors.gender}
      />
      <PillNumberInput
        label="BMI (kg/m²)"
        placeholder="Ex: 24.7"
        step={0.1}
        min={0}
        required
        value={form.bmi}
        onChange={onInput("bmi")}
        error={errors.bmi}
      />
      <PillNumberInput
        label="Diastolic (mmHg)"
        placeholder="Ex: 80"
        step={1}
        min={0}
        required
        integerOnly
        value={form.diastolic}
        onChange={onInput("diastolic")}
        error={errors.diastolic}
      />
      <PillNumberInput
        label="Systolic (mmHg)"
        placeholder="Ex: 120"
        step={1}
        min={0}
        required
        integerOnly
        value={form.systolic}
        onChange={onInput("systolic")}
        error={errors.systolic}
      />
    </>
  );
}
