"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PatientForm } from '@/types';

interface FormContextType {
  savedForm: PatientForm | null;
  hasIncompleteForm: boolean;
  saveForm: (form: PatientForm) => void;
  loadForm: () => PatientForm | null;
  clearSavedForm: () => void;
  updateFormProgress: (form: Partial<PatientForm>) => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  children: ReactNode;
}

export const FormProvider = ({ children }: FormProviderProps) => {
  const [savedForm, setSavedForm] = useState<PatientForm | null>(null);
  const [hasIncompleteForm, setHasIncompleteForm] = useState(false);

  useEffect(() => {
    // Check for saved form data on app start
    const savedFormData = localStorage.getItem('patientForm');
    if (savedFormData) {
      try {
        const parsedForm = JSON.parse(savedFormData);
        setSavedForm(parsedForm);
        setHasIncompleteForm(true);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        localStorage.removeItem('patientForm');
      }
    }
  }, []);

  const saveForm = useCallback((form: PatientForm) => {
    // Only save if form has some meaningful data
    const hasData = Object.values(form).some(value => value && value.toString().trim() !== '');
    
    if (hasData) {
      localStorage.setItem('patientForm', JSON.stringify(form));
      setSavedForm(form);
      setHasIncompleteForm(true);
    }
  }, []);

  const loadForm = useCallback((): PatientForm | null => {
    const savedFormData = localStorage.getItem('patientForm');
    if (savedFormData) {
      try {
        return JSON.parse(savedFormData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        localStorage.removeItem('patientForm');
        return null;
      }
    }
    return null;
  }, []);

  const clearSavedForm = useCallback(() => {
    localStorage.removeItem('patientForm');
    setSavedForm(null);
    setHasIncompleteForm(false);
  }, []);

  const updateFormProgress = useCallback((form: Partial<PatientForm>) => {
    if (savedForm) {
      const updatedForm = { ...savedForm, ...form };
      saveForm(updatedForm);
    }
  }, [savedForm, saveForm]);

  const value = {
    savedForm,
    hasIncompleteForm,
    saveForm,
    loadForm,
    clearSavedForm,
    updateFormProgress,
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

