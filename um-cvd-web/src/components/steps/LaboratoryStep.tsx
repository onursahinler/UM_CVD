"use client";

import React from "react";
import { PillNumberInput } from "../FormFields";

interface LaboratoryStepProps {
  form: {
    ureaNitrogen: string;
    glucose: string;
    whiteBloodCells: string;
    neutrophils: string;
    monocytes: string;
    mch: string;
    calciumTotal: string;
    lymphocytes: string;
    creatinine: string;
    sodium: string;
    pt: string;
  };
  errors: Record<string, string>;
  onInput: (key: "ureaNitrogen" | "glucose" | "whiteBloodCells" | "neutrophils" | "monocytes" | "mch" | "calciumTotal" | "lymphocytes" | "creatinine" | "sodium" | "pt") => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LaboratoryStep({ form, errors, onInput }: LaboratoryStepProps) {
  return (
    <>
      <PillNumberInput
        label="Urea Nitrogen (mg/dL)"
        placeholder="Ex: 14"
        step={1}
        min={0}
        required
        integerOnly
        value={form.ureaNitrogen}
        onChange={onInput("ureaNitrogen")}
        error={errors.ureaNitrogen}
      />
      <PillNumberInput
        label="Glucose (mg/dL)"
        placeholder="Ex: 95"
        step={1}
        min={0}
        required
        integerOnly
        value={form.glucose}
        onChange={onInput("glucose")}
        error={errors.glucose}
      />
      <PillNumberInput
        label="White Blood Cells (K/uL)"
        placeholder="Ex: 7.2"
        step={0.1}
        min={0}
        required
        value={form.whiteBloodCells}
        onChange={onInput("whiteBloodCells")}
        error={errors.whiteBloodCells}
      />
      <PillNumberInput
        label="Neutrophils (%)"
        placeholder="Ex: 65.5"
        step={0.1}
        min={0}
        required
        value={form.neutrophils}
        onChange={onInput("neutrophils")}
        error={errors.neutrophils}
      />
      <PillNumberInput
        label="Monocytes (%)"
        placeholder="Ex: 8.2"
        step={0.1}
        min={0}
        required
        value={form.monocytes}
        onChange={onInput("monocytes")}
        error={errors.monocytes}
      />
      <PillNumberInput
        label="MCH (pg)"
        placeholder="Ex: 28.5"
        step={0.1}
        min={0}
        required
        value={form.mch}
        onChange={onInput("mch")}
        error={errors.mch}
      />
      <PillNumberInput
        label="Calcium, Total (mg/dL)"
        placeholder="Ex: 9.8"
        step={0.1}
        min={0}
        required
        value={form.calciumTotal}
        onChange={onInput("calciumTotal")}
        error={errors.calciumTotal}
      />
      <PillNumberInput
        label="Lymphocytes (%)"
        placeholder="Ex: 25.3"
        step={0.1}
        min={0}
        required
        value={form.lymphocytes}
        onChange={onInput("lymphocytes")}
        error={errors.lymphocytes}
      />
      <PillNumberInput
        label="Creatinine (mg/dL)"
        placeholder="Ex: 1.1"
        step={0.01}
        min={0}
        required
        value={form.creatinine}
        onChange={onInput("creatinine")}
        error={errors.creatinine}
      />
      <PillNumberInput
        label="Sodium (mEq/L)"
        placeholder="Ex: 140"
        step={1}
        min={0}
        required
        integerOnly
        value={form.sodium}
        onChange={onInput("sodium")}
        error={errors.sodium}
      />
      <PillNumberInput
        label="PT (seconds)"
        placeholder="Ex: 12.5"
        step={0.1}
        min={0}
        required
        value={form.pt}
        onChange={onInput("pt")}
        error={errors.pt}
      />
    </>
  );
}
