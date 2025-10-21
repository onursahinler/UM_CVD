"use client";

import React from "react";
import { PatientForm } from "@/types";

interface SummaryStepProps {
  form: PatientForm;
}

export function SummaryStep({ form }: SummaryStepProps) {
  const downloadJSON = () => {
    // Build array with single object in the requested schema
    const exportObj = {
      "Full name": form.patientName || "",
      "Patient ID": form.patientId || "",
      anchor_age: form.anchor_age ? parseFloat(form.anchor_age) : null,
      "White Blood Cells": form.whiteBloodCells ? parseFloat(form.whiteBloodCells) : null,
      "Urea Nitrogen": form.ureaNitrogen ? parseFloat(form.ureaNitrogen) : null,
      Neutrophils: form.neutrophils ? parseFloat(form.neutrophils) : null,
      BMI: form.bmi ? parseFloat(form.bmi) : null,
      Monocytes: form.monocytes ? parseFloat(form.monocytes) : null,
      Glucose: form.glucose ? parseFloat(form.glucose) : null,
      systolic: form.systolic ? parseFloat(form.systolic) : null,
      MCH: form.mch ? parseFloat(form.mch) : null,
      "Calcium, Total": form.calciumTotal ? parseFloat(form.calciumTotal) : null,
      Lymphocytes: form.lymphocytes ? parseFloat(form.lymphocytes) : null,
      Creatinine: form.creatinine ? parseFloat(form.creatinine) : null,
      Sodium: form.sodium ? parseFloat(form.sodium) : null,
      diastolic: form.diastolic ? parseFloat(form.diastolic) : null,
      PT: form.pt ? parseFloat(form.pt) : null,
      imatinib_dose: form.tkiDoses?.imatinib ?? 0,
      dasatinib_dose: form.tkiDoses?.dasatinib ?? 0,
      gender_encoded: typeof form.gender === 'number' ? form.gender : null,
      nilotinib_dose: form.tkiDoses?.nilotinib ?? 0,
      ponatinib_dose: form.tkiDoses?.ponatinib ?? 0,
      ruxolitinib_dose: form.tkiDoses?.ruxolitinib ?? 0,
    };

    const dataStr = JSON.stringify([exportObj], null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cvd-patient-data-${form.patientId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const dataSections = [
    {
      title: "Patient Information",
      fields: [
        { k: "patientName", label: "Full Name" },
        { k: "patientId", label: "Patient ID" },
      ]
    },
    {
      title: "Demographics & Health",
      fields: [
        { k: "anchor_age", label: "Age" },
        { k: "gender", label: "Gender", transform: (val: string | number) => val === 0 ? "Male" : val === 1 ? "Female" : val === -1 ? "Not selected" : "-" },
        { k: "bmi", label: "BMI (kg/m²)" },
        { k: "diastolic", label: "Diastolic (mmHg)" },
        { k: "systolic", label: "Systolic (mmHg)" },
      ]
    },
    {
      title: "Laboratory Tests",
      fields: [
        { k: "ureaNitrogen", label: "Urea Nitrogen (mg/dL)" },
        { k: "glucose", label: "Glucose (mg/dL)" },
        { k: "whiteBloodCells", label: "White Blood Cells (K/uL)" },
        { k: "neutrophils", label: "Neutrophils (%)" },
        { k: "monocytes", label: "Monocytes (%)" },
        { k: "mch", label: "MCH (pg)" },
        { k: "calciumTotal", label: "Calcium, Total (mg/dL)" },
        { k: "lymphocytes", label: "Lymphocytes (%)" },
        { k: "creatinine", label: "Creatinine (mg/dL)" },
        { k: "sodium", label: "Sodium (mEq/L)" },
        { k: "pt", label: "PT (seconds)" },
      ]
    },
    {
      title: "Treatment & Analysis",
      fields: [
        { k: "tkiType", label: "TKI Type" },
        { k: "tkiDose", label: "Dose (mg/day)" },
        { k: "model", label: "Selected Model", transform: (value: string) => {
          if (value === "lr_pred") return "Logistic Regression (Prediction Only)";
          if (value === "lr_explain") return "Logistic Regression (With Explainer)";
          return value || "-";
        }},
      ]
    }
  ];

  return (
    <div className="col-span-2 space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Review & Confirmation</h2>
        <div className="flex gap-3">
          <button
            onClick={downloadJSON}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download JSON
          </button>
        </div>
      </div>

      {dataSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-panel rounded-2xl border border-black/10 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/20 pb-2">
            {section.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.fields.map((field) => (
              <div key={field.k} className="bg-white rounded-xl p-3 border border-black/10">
                <div className="text-xs text-gray-600 font-medium">{field.label}</div>
                <div className="mt-1 text-sm font-semibold text-black">
                  {field.transform ? field.transform(form[field.k as keyof PatientForm] as any) : String(form[field.k as keyof PatientForm] || "-")}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
