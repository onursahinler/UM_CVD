"use client";

import React from "react";
import { PillToggle, PillNumberInput } from "../FormFields";

interface TreatmentStepProps {
  form: {
    tkiType: string;
    tkiDose: string;
  };
  errors: Record<string, string>;
  onToggle: (key: "tkiType") => (val: string) => void;
  onInput: (key: "tkiDose") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTkiTypeChange: (val: string) => void;
}

export function TreatmentStep({ form, errors, onToggle, onInput, onTkiTypeChange }: TreatmentStepProps) {
  return (
    <>
      <PillToggle
        label="TKI type"
        required
        value={form.tkiType}
        onChange={onTkiTypeChange}
        error={errors.tkiType}
        options={[
          { value: "none", label: "None" },
          { value: "imatinib", label: "Imatinib" },
          { value: "dasatinib", label: "Dasatinib" },
          { value: "nilotinib", label: "Nilotinib" },
        ]}
      />
      <PillNumberInput
        label="Dose (mg/day)"
        placeholder="Ex: 400"
        step={1}
        min={0}
        required
        value={form.tkiDose}
        onChange={onInput("tkiDose")}
        error={errors.tkiDose}
      />
    </>
  );
}
