export interface PatientForm {
  // Patient info
  patientName: string;
  patientId: string;
  
  // Demographics
  age: string;
  bmi: string;
  diastolic: string;
  systolic: string;
  gender: string;
  diabetes: string;
  ckd: string;
  
  // Laboratory
  rbc: string;
  ureaNitrogen: string;
  albumin: string;
  ldh: string;
  metamyelocytes: string;
  cholesterol: string;
  hba1c: string;
  glucose: string;
  
  // Treatment
  tkiType: string;
  tkiDose: string;
  
  // Model
  model: string;
}

export interface Step {
  id: string;
  label: string;
  helper?: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface UploadedData {
  patientName?: string;
  patientId?: string;
  age?: number;
  gender?: string;
  bmi?: number;
  diabetes?: string;
  diastolic?: number;
  ckd?: string;
  systolic?: number;
  rbc?: number;
  ureaNitrogen?: number;
  albumin?: number;
  ldh?: number;
  metamyelocytes?: number;
  cholesterol?: number;
  hba1c?: number;
  glucose?: number;
  tkiType?: string;
  tkiDose?: number;
}

export interface FormStepProps {
  form: Partial<PatientForm>;
  errors: FormErrors;
  onInput?: (key: keyof PatientForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle?: (key: keyof PatientForm) => (val: string) => void;
  onGenerateId?: () => void;
  isIdGenerated?: boolean;
  onModelSelect?: (modelId: string) => void;
  onTkiTypeChange?: (value: string) => void;
}
