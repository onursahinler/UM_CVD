import { useState, useCallback, useEffect } from 'react';
import { PatientForm, FormErrors, UploadedData } from '@/types';
import { validateStep, generatePatientId } from '@/utils/validation';
import { useFormContext } from '@/contexts/FormContext';

  const initialFormState: PatientForm = {
    // Patient info
    patientName: "",
    patientId: "",
    
    // Demographics
    anchor_age: "",
  bmi: "",
  diastolic: "",
  systolic: "",
  gender: -1,
  gender_encoded: "",
  
  // Laboratory
  ureaNitrogen: "",
  glucose: "",
  whiteBloodCells: "",
  neutrophils: "",
  monocytes: "",
  mch: "",
  calciumTotal: "",
  lymphocytes: "",
  creatinine: "",
  sodium: "",
  pt: "",
  
  // Treatment
  tkiType: "",
  tkiDose: "",
  tkiDoses: {
    none: 0,
    imatinib: 0,
    dasatinib: 0,
    nilotinib: 0,
    ponatinib: 0,
    ruxolitinib: 0,
  },
  
  // Backend API için gerekli alanlar
  imatinib_dose: "",
  dasatinib_dose: "",
  nilotinib_dose: "",
  ponatinib_dose: "",
  ruxolitinib_dose: "",
  
  // Model
  model: "",
};

export const usePatientForm = () => {
  const { loadForm, saveForm, clearSavedForm } = useFormContext();
  const [form, setForm] = useState<PatientForm>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isIdGenerated, setIsIdGenerated] = useState(false);

  // Load saved form data on mount
  useEffect(() => {
    const savedForm = loadForm();
    if (savedForm) {
      setForm(savedForm);
      // Check if patient ID was generated
      setIsIdGenerated(!!savedForm.patientId);
    }
  }, [loadForm]);

  // Auto-save form data when it changes
  useEffect(() => {
    const hasData = Object.values(form).some(value => value && value.toString().trim() !== '');
    if (hasData) {
      saveForm(form);
    }
  }, [form, saveForm]);

  const clearError = useCallback((key: keyof PatientForm, hasValue: boolean) => {
    setErrors((prev) => {
      const next = { ...prev } as FormErrors;
      if (hasValue) delete next[key];
      return next;
    });
  }, []);

  const handleInput = useCallback((key: keyof PatientForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.currentTarget.value;
      setForm((f) => {
        // When updating tkiDose, also reflect it into tkiDoses mapping for the selected type
        if (key === "tkiDose") {
          const selected = f.tkiType as keyof NonNullable<PatientForm["tkiDoses"]>;
          const doseNum = val ? parseFloat(val) : 0;
          const nextMap = {
            ...(f.tkiDoses || { none: 0, imatinib: 0, dasatinib: 0, nilotinib: 0, ponatinib: 0, ruxolitinib: 0 }),
          } as NonNullable<PatientForm["tkiDoses"]>;
          if (selected && selected !== "none") {
            // Zero out others, set only the selected
            Object.keys(nextMap).forEach((k) => {
              nextMap[k as keyof typeof nextMap] = k === selected ? doseNum : 0;
            });
          } else {
            // If none or no selection, keep all zeros
            Object.keys(nextMap).forEach((k) => { nextMap[k as keyof typeof nextMap] = 0; });
          }
          return { ...f, [key]: val, tkiDoses: nextMap };
        }
        return { ...f, [key]: val };
      });
      clearError(key, val !== "");
    }, [clearError]);

  const handleToggle = useCallback((key: keyof PatientForm) => (val: string | number) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key, !!val);
  }, [clearError]);

  const handleModelSelect = useCallback((modelId: string) => {
    setForm((f) => ({ ...f, model: modelId }));
    clearError("model", true);
  }, [clearError]);

  const handleTkiTypeChange = useCallback((value: string | number) => {
    setForm((f) => {
      const doseNum = f.tkiDose ? parseFloat(f.tkiDose) : 0;
      const nextMap = {
        ...(f.tkiDoses || { none: 0, imatinib: 0, dasatinib: 0, nilotinib: 0, ponatinib: 0, ruxolitinib: 0 }),
      } as NonNullable<PatientForm["tkiDoses"]>;
      if (value === "none") {
        Object.keys(nextMap).forEach((k) => { nextMap[k as keyof typeof nextMap] = 0; });
      } else {
        Object.keys(nextMap).forEach((k) => {
          nextMap[k as keyof typeof nextMap] = k === value ? doseNum : 0;
        });
      }
      return {
        ...f,
        tkiType: String(value),
        tkiDose: value === "none" ? "" : f.tkiDose,
        tkiDoses: nextMap,
      };
    });
    clearError("tkiType", !!value);
    // Clear dose error when "none" is selected
    if (value === "none") {
      clearError("tkiDose", true);
    }
  }, [clearError]);

  const handleGenerateId = useCallback(() => {
    if (!isIdGenerated) {
      const newId = generatePatientId();
      setForm(f => ({ ...f, patientId: newId }));
      setIsIdGenerated(true);
      clearError("patientId", true);
    }
  }, [isIdGenerated, clearError]);

  const validate = useCallback((activeIndex: number) => {
    const nextErrors = validateStep(activeIndex, form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleFileUpload = useCallback((raw: UploadedData | UploadedData[] | any) => {
    // Support array schema like: [{ anchor_age: ..., "White Blood Cells": ..., imatinib_dose: ... }]
    const payload = Array.isArray(raw) ? (raw[0] || {}) : raw;
    const hasNewSchema =
      payload && (
        Object.prototype.hasOwnProperty.call(payload, 'anchor_age') ||
        Object.prototype.hasOwnProperty.call(payload, 'imatinib_dose')
      );

    if (hasNewSchema) {
      const age = payload.anchor_age;
      const gender = payload.gender_encoded;
      // Determine TKI type and dose from the doses
      const tkiDoses = {
        none: 0,
        imatinib: Number(payload.imatinib_dose || 0),
        dasatinib: Number(payload.dasatinib_dose || 0),
        nilotinib: Number(payload.nilotinib_dose || 0),
        ponatinib: Number(payload.ponatinib_dose || 0),
        ruxolitinib: Number(payload.ruxolitinib_dose || 0),
      };
      
      // Find the TKI type with non-zero dose
      let selectedTkiType = "none";
      let selectedTkiDose = "";
      
      const tkiTypes = ['imatinib', 'dasatinib', 'nilotinib', 'ponatinib', 'ruxolitinib'];
      for (const type of tkiTypes) {
        if (tkiDoses[type as keyof typeof tkiDoses] > 0) {
          selectedTkiType = type;
          selectedTkiDose = String(tkiDoses[type as keyof typeof tkiDoses]);
          break;
        }
      }

      setForm(prev => ({
        ...prev,
        patientName: payload["Full name"] || prev.patientName || "",
        patientId: payload["Patient ID"] || prev.patientId || "",
        anchor_age: age != null ? String(age) : "",
        gender: typeof gender === 'number' ? gender : -1,
        bmi: payload.BMI != null ? String(payload.BMI) : "",
        diastolic: payload.diastolic != null ? String(payload.diastolic) : "",
        systolic: payload.systolic != null ? String(payload.systolic) : "",
        ureaNitrogen: payload["Urea Nitrogen"] != null ? String(payload["Urea Nitrogen"]) : "",
        glucose: payload.Glucose != null ? String(payload.Glucose) : "",
        whiteBloodCells: payload["White Blood Cells"] != null ? String(payload["White Blood Cells"]) : "",
        neutrophils: payload.Neutrophils != null ? String(payload.Neutrophils) : "",
        monocytes: payload.Monocytes != null ? String(payload.Monocytes) : "",
        mch: payload.MCH != null ? String(payload.MCH) : "",
        calciumTotal: payload["Calcium, Total"] != null ? String(payload["Calcium, Total"]) : "",
        lymphocytes: payload.Lymphocytes != null ? String(payload.Lymphocytes) : "",
        creatinine: payload.Creatinine != null ? String(payload.Creatinine) : "",
        sodium: payload.Sodium != null ? String(payload.Sodium) : "",
        pt: payload.PT != null ? String(payload.PT) : "",
        tkiType: selectedTkiType,
        tkiDose: selectedTkiDose,
        tkiDoses: tkiDoses,
        imatinib_dose: String(payload.imatinib_dose || 0),
        dasatinib_dose: String(payload.dasatinib_dose || 0),
        nilotinib_dose: String(payload.nilotinib_dose || 0),
        ponatinib_dose: String(payload.ponatinib_dose || 0),
        ruxolitinib_dose: String(payload.ruxolitinib_dose || 0),
        gender_encoded: String(gender || 0),
      }));
      setIsIdGenerated(false);
      return;
    }

    const data = payload as UploadedData;
    // Original flat schema support
    setForm(prev => ({
      ...prev,
      patientName: data.patientName || data["Full name"] || "",
      patientId: data.patientId || data["Patient ID"] || "",
      anchor_age: data.age?.toString() || "",
      gender: data.gender ?? -1,
      bmi: data.bmi?.toString() || "",
      diastolic: data.diastolic?.toString() || "",
      systolic: data.systolic?.toString() || "",
      ureaNitrogen: data.ureaNitrogen?.toString() || "",
      glucose: data.glucose?.toString() || "",
      whiteBloodCells: data.whiteBloodCells?.toString() || "",
      neutrophils: data.neutrophils?.toString() || "",
      monocytes: data.monocytes?.toString() || "",
      mch: data.mch?.toString() || "",
      calciumTotal: data.calciumTotal?.toString() || "",
      lymphocytes: data.lymphocytes?.toString() || "",
      creatinine: data.creatinine?.toString() || "",
      sodium: data.sodium?.toString() || "",
      pt: data.pt?.toString() || "",
      tkiType: data.tkiType || "",
      tkiDose: data.tkiDose?.toString() || "",
    }));
    setIsIdGenerated(!!data.patientId);
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setErrors({});
    setIsIdGenerated(false);
    clearSavedForm();
  }, [clearSavedForm]);

  return {
    form,
    errors,
    isIdGenerated,
    handleInput,
    handleToggle,
    handleGenerateId,
    handleModelSelect,
    handleTkiTypeChange,
    validate,
    handleFileUpload,
    resetForm,
    setForm,
    clearError,
  };
};
