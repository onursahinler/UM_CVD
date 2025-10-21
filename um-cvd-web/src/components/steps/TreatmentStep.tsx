"use client";

import React from "react";
import { PillToggle, PillNumberInput } from "../FormFields";

interface TreatmentStepProps {
  form: {
    tkiType: string;
    tkiDose: string;
    imatinib_dose: string;
    dasatinib_dose: string;
    nilotinib_dose: string;
    ponatinib_dose: string;
    ruxolitinib_dose: string;
  };
  errors: Record<string, string>;
  onToggle: (key: "tkiType") => (val: string) => void;
  onInput: (key: "tkiDose" | "imatinib_dose" | "dasatinib_dose" | "nilotinib_dose" | "ponatinib_dose" | "ruxolitinib_dose") => (e: React.ChangeEvent<HTMLInputElement>) => void;
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
      
      {/* TKI Dozları için ayrı alanlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <PillNumberInput
          label="Imatinib Dozu (mg/day)"
          placeholder="Ex: 400"
          step={1}
          min={0}
          value={form.imatinib_dose}
          onChange={onInput("imatinib_dose")}
          error={errors.imatinib_dose}
        />
        <PillNumberInput
          label="Dasatinib Dozu (mg/day)"
          placeholder="Ex: 100"
          step={1}
          min={0}
          value={form.dasatinib_dose}
          onChange={onInput("dasatinib_dose")}
          error={errors.dasatinib_dose}
        />
        <PillNumberInput
          label="Nilotinib Dozu (mg/day)"
          placeholder="Ex: 300"
          step={1}
          min={0}
          value={form.nilotinib_dose}
          onChange={onInput("nilotinib_dose")}
          error={errors.nilotinib_dose}
        />
        <PillNumberInput
          label="Ponatinib Dozu (mg/day)"
          placeholder="Ex: 45"
          step={1}
          min={0}
          value={form.ponatinib_dose}
          onChange={onInput("ponatinib_dose")}
          error={errors.ponatinib_dose}
        />
        <PillNumberInput
          label="Ruxolitinib Dozu (mg/day)"
          placeholder="Ex: 20"
          step={1}
          min={0}
          value={form.ruxolitinib_dose}
          onChange={onInput("ruxolitinib_dose")}
          error={errors.ruxolitinib_dose}
        />
      </div>
    </>
  );
}
