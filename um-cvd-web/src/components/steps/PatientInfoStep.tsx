"use client";

import React from "react";

interface PatientInfoStepProps {
  form: {
    patientName: string;
    patientId: string;
  };
  errors: Record<string, string>;
  isIdGenerated: boolean;
  onInput: (key: "patientName" | "patientId") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateId: () => void;
}

export function PatientInfoStep({ form, errors, isIdGenerated, onInput, onGenerateId }: PatientInfoStepProps) {
  return (
    <div className="col-span-2">
      <div className="text-sm font-semibold mb-2">Patient Information</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">
            Full Name
            <span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            placeholder="Ex: John Doe"
            value={form.patientName}
            onChange={onInput("patientName")}
            className={`mt-2 w-full rounded-pill border ${errors.patientName ? "border-red-500" : "border-black/10"} bg-white px-4 py-3 outline-none focus:ring-2 ${errors.patientName ? "focus:ring-red-500" : "focus:ring-brand-400"} text-black placeholder-black/50`}
          />
          {errors.patientName && <p className="mt-1 text-xs text-red-600">{errors.patientName}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold">
            Patient ID
            <span className="text-red-500"> *</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={form.patientId}
              readOnly
              className={`w-full rounded-pill border ${errors.patientId ? "border-red-500" : "border-black/10"} bg-gray-50 px-4 py-3 text-black/70 cursor-not-allowed`}
            />
            <button
              type="button"
              onClick={onGenerateId}
              disabled={isIdGenerated}
              className={`rounded-pill px-4 py-3 font-semibold text-sm whitespace-nowrap ${
                isIdGenerated 
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed" 
                  : "bg-brand-600 hover:bg-brand-700 text-white"
              }`}
            >
              {isIdGenerated ? "ID Generated" : "Generate ID"}
            </button>
          </div>
          {errors.patientId ? (
            <p className="mt-1 text-xs text-red-600">{errors.patientId}</p>
          ) : isIdGenerated ? (
            <p className="mt-1 text-xs text-green-600">✓ Patient ID has been generated successfully</p>
          ) : (
            <p className="mt-1 text-xs text-foreground/60">Click to generate a unique patient identifier</p>
          )}
        </div>
      </div>
    </div>
  );
}
