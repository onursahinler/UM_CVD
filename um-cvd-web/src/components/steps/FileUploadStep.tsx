"use client";

import React, { useRef } from "react";

interface FileUploadStepProps {
  onFileUpload: (data: any) => void;
  uploadedData: any;
}

export function FileUploadStep({ onFileUpload, uploadedData }: FileUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      alert("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        onFileUpload(jsonData);
      } catch (error) {
        alert("Invalid JSON file. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="col-span-2">
      <div className="text-center">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-black mb-2">Upload Patient Data</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Upload a JSON file containing patient data to process multiple assessments at once.
        </p>

        {!uploadedData ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-pill font-semibold transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose JSON File
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="bg-gray-50 rounded-xl p-4 max-w-md mx-auto">
              <h4 className="font-semibold text-black mb-2">Expected JSON Format:</h4>
              <pre className="text-xs text-gray-600 text-left overflow-x-auto">
{`[
  {
    "anchor_age": 56.0,
    "White Blood Cells": 85.1,
    "Urea Nitrogen": 16.0,
    "Neutrophils": 57.0,
    "BMI": 39.1,
    "Monocytes": 1.0,
    "Glucose": 87.0,
    "systolic": 148.0,
    "MCH": 28.6,
    "Calcium, Total": 8.5,
    "Lymphocytes": 7.0,
    "Creatinine": 1.2,
    "Sodium": 140.0,
    "diastolic": 81.0,
    "PT": 12.6,
    "imatinib_dose": 0.0,
    "dasatinib_dose": 0.0,
    "gender_encoded": 1.0,
    "nilotinib_dose": 0.0,
    "ponatinib_dose": 0.0,
    "ruxolitinib_dose": 0.0
  }
]`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h4 className="font-semibold text-green-800 mb-2">File Uploaded Successfully!</h4>
            <p className="text-green-700 text-sm mb-4">
              Patient data has been loaded. You can now proceed to model selection.
            </p>
            <div className="text-xs text-green-600 bg-green-100 rounded-lg p-2">
              <strong>Patient:</strong> {uploadedData.patientName || "Unknown"}<br />
              <strong>ID:</strong> {uploadedData.patientId || "N/A"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
