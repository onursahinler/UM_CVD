import { useState, useCallback, useEffect } from 'react';
import { PatientForm, FormErrors, UploadedData } from '@/types';
import { validateStep, generatePatientId } from '@/utils/validation';
import { useFormContext } from '@/contexts/FormContext';

const initialFormState: PatientForm = {
  // Patient info
  patientName: "",
  patientId: "",
  
  // Demographics
  age: "",
  bmi: "",
  diastolic: "",
  systolic: "",
  gender: "",
  
  // Laboratory
  rbc: "",
  ureaNitrogen: "",
  albumin: "",
  ldh: "",
  metamyelocytes: "",
  cholesterol: "",
  hba1c: "",
  glucose: "",
  
  // Treatment
  tkiType: "",
  tkiDose: "",
  
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
      setForm((f) => ({ ...f, [key]: val }));
      clearError(key, val !== "");
    }, [clearError]);

  const handleToggle = useCallback((key: keyof PatientForm) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key, !!val);
  }, [clearError]);

  const handleModelSelect = useCallback((modelId: string) => {
    setForm((f) => ({ ...f, model: modelId }));
    clearError("model", true);
  }, [clearError]);

  const handleTkiTypeChange = useCallback((value: string) => {
    setForm((f) => ({ ...f, tkiType: value }));
    clearError("tkiType", !!value);
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

  const handleFileUpload = useCallback((data: UploadedData) => {
    // Auto-fill form with uploaded data
    setForm(prev => ({
      ...prev,
      patientName: data.patientName || "",
      patientId: data.patientId || "",
      age: data.age?.toString() || "",
      gender: data.gender || "",
      bmi: data.bmi?.toString() || "",
      diastolic: data.diastolic?.toString() || "",
      systolic: data.systolic?.toString() || "",
      rbc: data.rbc?.toString() || "",
      ureaNitrogen: data.ureaNitrogen?.toString() || "",
      albumin: data.albumin?.toString() || "",
      ldh: data.ldh?.toString() || "",
      metamyelocytes: data.metamyelocytes?.toString() || "",
      cholesterol: data.cholesterol?.toString() || "",
      hba1c: data.hba1c?.toString() || "",
      glucose: data.glucose?.toString() || "",
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
