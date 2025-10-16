export interface PatientForm {
  // Patient info
  patientName: string;
  patientId: string;
  
  // Demographics
  age: string;
  bmi: string;
  diastolic: string;
  systolic: string;
  gender: number;
  
  // Laboratory
  ureaNitrogen: string;
  glucose: string;
  whiteBloodCells: string;
  neutrophils: string;
  monocytes: string;
  mch: string;
  calciumTotal: string;
  lymphocytes: string;
  creatinine: string;
  sodium: string;
  pt: string;
  
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
  gender?: number;
  bmi?: number;
  diastolic?: number;
  systolic?: number;
  ureaNitrogen?: number;
  glucose?: number;
  whiteBloodCells?: number;
  neutrophils?: number;
  monocytes?: number;
  mch?: number;
  calciumTotal?: number;
  lymphocytes?: number;
  creatinine?: number;
  sodium?: number;
  pt?: number;
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
