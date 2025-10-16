"use client";

import React from "react";
import { PatientForm } from "@/types";

interface SummaryStepProps {
  form: PatientForm;
}

export function SummaryStep({ form }: SummaryStepProps) {
  const downloadJSON = () => {
    // Create a flat JSON object with proper data types
    const jsonData = {
      patientName: form.patientName || "",
      patientId: form.patientId || "",
      age: form.age ? parseFloat(form.age) : null,
      gender: form.gender === 0 ? "Male" : form.gender === 1 ? "Female" : "",
      bmi: form.bmi ? parseFloat(form.bmi) : null,
      diastolic: form.diastolic ? parseFloat(form.diastolic) : null,
      systolic: form.systolic ? parseFloat(form.systolic) : null,
      rbc: form.rbc ? parseFloat(form.rbc) : null,
      ureaNitrogen: form.ureaNitrogen ? parseFloat(form.ureaNitrogen) : null,
      albumin: form.albumin ? parseFloat(form.albumin) : null,
      ldh: form.ldh ? parseFloat(form.ldh) : null,
      metamyelocytes: form.metamyelocytes ? parseFloat(form.metamyelocytes) : null,
      cholesterol: form.cholesterol ? parseFloat(form.cholesterol) : null,
      hba1c: form.hba1c ? parseFloat(form.hba1c) : null,
      glucose: form.glucose ? parseFloat(form.glucose) : null,
      tkiType: form.tkiType || "",
      tkiDose: form.tkiDose ? parseFloat(form.tkiDose) : null,
      model: form.model || ""
    };

    // Create and download the file
    const dataStr = JSON.stringify(jsonData, null, 2);
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
        { k: "age", label: "Age" },
        { k: "gender", label: "Gender", transform: (val: string | number) => val === 0 ? "Male" : val === 1 ? "Female" : "-" },
        { k: "bmi", label: "BMI (kg/m²)" },
        { k: "diastolic", label: "Diastolic (mmHg)" },
        { k: "systolic", label: "Systolic (mmHg)" },
      ]
    },
    {
      title: "Laboratory Tests",
      fields: [
        { k: "rbc", label: "Red Blood Cells (m/uL)" },
        { k: "ureaNitrogen", label: "Urea Nitrogen (mg/dL)" },
        { k: "albumin", label: "Albumin (g/dL)" },
        { k: "ldh", label: "Lactate Dehydrogenase (IU/L)" },
        { k: "metamyelocytes", label: "Metamyelocytes (%)" },
        { k: "cholesterol", label: "Cholesterol (Total, mg/dL)" },
        { k: "hba1c", label: "Hemoglobin A1c (%)" },
        { k: "glucose", label: "Glucose (mg/dL)" },
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
      {/* Header with Download Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Review & Confirmation</h2>
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
