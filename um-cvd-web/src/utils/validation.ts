import { PatientForm, FormErrors } from '@/types';

export const validateStep = (activeIndex: number, form: PatientForm): FormErrors => {
  const errors: FormErrors = {};

  switch (activeIndex) {
    case 0:
      if (!form.patientName) errors.patientName = "This field is required";
      if (!form.patientId) errors.patientId = "Please generate a patient ID";
      if (!form.age) errors.age = "This field is required";
      if (!form.bmi) errors.bmi = "This field is required";
      if (!form.diastolic) errors.diastolic = "This field is required";
      if (!form.systolic) errors.systolic = "This field is required";
      if (!form.gender) errors.gender = "Please select an option";
      break;
    
    case 1:
      if (!form.rbc) errors.rbc = "This field is required";
      if (!form.ureaNitrogen) errors.ureaNitrogen = "This field is required";
      if (!form.albumin) errors.albumin = "This field is required";
      if (!form.ldh) errors.ldh = "This field is required";
      if (!form.metamyelocytes) errors.metamyelocytes = "This field is required";
      if (!form.cholesterol) errors.cholesterol = "This field is required";
      if (!form.hba1c) errors.hba1c = "This field is required";
      if (!form.glucose) errors.glucose = "This field is required";
      break;
    
    case 2:
      if (!form.tkiType) errors.tkiType = "Please select TKI type";
      if (!form.tkiDose) errors.tkiDose = "This field is required";
      break;
    
    case 3:
      if (!form.model) errors.model = "Please choose a model";
      break;
    
    case 4:
      // No required fields for review step
      break;
  }

  return errors;
};

export const generatePatientId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `CVD-${timestamp}-${random}`.toUpperCase();
};
