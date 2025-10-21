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
  onTkiTypeChange: (val: string | number) => void;
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
          { value: "ponatinib", label: "Ponatinib" },
          { value: "ruxolitinib", label: "Ruxolitinib" },
        ]}
      />
      <PillNumberInput
        label="Dose (mg/day)"
        placeholder="Ex: 400"
        step={1}
        min={0}
        required={form.tkiType !== "none"}
        disabled={form.tkiType === "none"}
        value={form.tkiType === "none" ? "" : form.tkiDose}
        onChange={onInput("tkiDose")}
        error={errors.tkiDose}
      />
    </>
  );
}
