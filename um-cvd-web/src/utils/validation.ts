import { PatientForm, FormErrors } from '@/types';

export const validateStep = (activeIndex: number, form: PatientForm): FormErrors => {
  const errors: FormErrors = {};

  switch (activeIndex) {
    case 0:
      if (!form.patientName) errors.patientName = "This field is required";
      if (!form.patientId) errors.patientId = "Please generate a patient ID";
      if (!form.age) errors.age = "This field is required";
      if (form.age && (isNaN(parseFloat(form.age)) || !Number.isInteger(parseFloat(form.age)))) {
        errors.age = "Please enter a valid whole number";
      }
      if (!form.bmi) errors.bmi = "This field is required";
      if (!form.diastolic) errors.diastolic = "This field is required";
      if (form.diastolic && (isNaN(parseFloat(form.diastolic)) || !Number.isInteger(parseFloat(form.diastolic)))) {
        errors.diastolic = "Please enter a valid whole number";
      }
      if (!form.systolic) errors.systolic = "This field is required";
      if (form.systolic && (isNaN(parseFloat(form.systolic)) || !Number.isInteger(parseFloat(form.systolic)))) {
        errors.systolic = "Please enter a valid whole number";
      }
      if (form.gender === undefined || form.gender === null || form.gender === -1) errors.gender = "Please select an option";
      break;
    
    case 1:
      if (!form.ureaNitrogen) errors.ureaNitrogen = "This field is required";
      if (form.ureaNitrogen && (isNaN(parseFloat(form.ureaNitrogen)) || !Number.isInteger(parseFloat(form.ureaNitrogen)))) {
        errors.ureaNitrogen = "Please enter a valid whole number";
      }
      if (!form.glucose) errors.glucose = "This field is required";
      if (form.glucose && (isNaN(parseFloat(form.glucose)) || !Number.isInteger(parseFloat(form.glucose)))) {
        errors.glucose = "Please enter a valid whole number";
      }
      if (!form.whiteBloodCells) errors.whiteBloodCells = "This field is required";
      if (!form.neutrophils) errors.neutrophils = "This field is required";
      if (!form.monocytes) errors.monocytes = "This field is required";
      if (!form.mch) errors.mch = "This field is required";
      if (!form.calciumTotal) errors.calciumTotal = "This field is required";
      if (!form.lymphocytes) errors.lymphocytes = "This field is required";
      if (!form.creatinine) errors.creatinine = "This field is required";
      if (!form.sodium) errors.sodium = "This field is required";
      if (!form.pt) errors.pt = "This field is required";
      break;
    
    case 2:
      if (!form.tkiType) errors.tkiType = "Please select TKI type";
      if (form.tkiType && form.tkiType !== "none" && !form.tkiDose) {
        errors.tkiDose = "This field is required";
      }
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
