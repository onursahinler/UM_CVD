"use client";

import React from "react";
import { PillNumberInput } from "../FormFields";

interface LaboratoryStepProps {
  form: {
    rbc: string;
    ureaNitrogen: string;
    albumin: string;
    ldh: string;
    metamyelocytes: string;
    cholesterol: string;
    hba1c: string;
    glucose: string;
  };
  errors: Record<string, string>;
  onInput: (key: "rbc" | "ureaNitrogen" | "albumin" | "ldh" | "metamyelocytes" | "cholesterol" | "hba1c" | "glucose") => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LaboratoryStep({ form, errors, onInput }: LaboratoryStepProps) {
  return (
    <>
      <PillNumberInput
        label="Red Blood Cells (m/uL)"
        placeholder="Ex: 4.5"
        step={0.01}
        required
        value={form.rbc}
        onChange={onInput("rbc")}
        error={errors.rbc}
      />
      <PillNumberInput
        label="Urea Nitrogen (mg/dL)"
        placeholder="Ex: 14"
        step={0.1}
        required
        value={form.ureaNitrogen}
        onChange={onInput("ureaNitrogen")}
        error={errors.ureaNitrogen}
      />
      <PillNumberInput
        label="Albumin (g/dL)"
        placeholder="Ex: 4.1"
        step={0.01}
        required
        value={form.albumin}
        onChange={onInput("albumin")}
        error={errors.albumin}
      />
      <PillNumberInput
        label="Lactate Dehydrogenase (IU/L)"
        placeholder="Ex: 180"
        step={1}
        required
        value={form.ldh}
        onChange={onInput("ldh")}
        error={errors.ldh}
      />
      <PillNumberInput
        label="Metamyelocytes (%)"
        placeholder="Ex: 2.5"
        step={0.1}
        required
        value={form.metamyelocytes}
        onChange={onInput("metamyelocytes")}
        error={errors.metamyelocytes}
      />
      <PillNumberInput
        label="Cholesterol (Total, mg/dL)"
        placeholder="Ex: 190"
        step={1}
        required
        value={form.cholesterol}
        onChange={onInput("cholesterol")}
        error={errors.cholesterol}
      />
      <PillNumberInput
        label="Hemoglobin A1c (%)"
        placeholder="Ex: 5.6"
        step={0.1}
        required
        value={form.hba1c}
        onChange={onInput("hba1c")}
        error={errors.hba1c}
      />
      <PillNumberInput
        label="Glucose (mg/dL)"
        placeholder="Ex: 95"
        step={1}
        required
        value={form.glucose}
        onChange={onInput("glucose")}
        error={errors.glucose}
      />
    </>
  );
}
