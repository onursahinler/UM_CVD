import { Step } from '@/types';

export const ASSESSMENT_STEPS: Step[] = [
  { id: "demographic", label: "Demographics" },
  { id: "laboratory", label: "Laboratory" },
  { id: "treatment", label: "Treatment" },
  { id: "analysis", label: "Analysis" },
  { id: "confirmation", label: "Confirmation" },
];

export const STEPPER_STEPS: Step[] = [
  { 
    id: "demographic", 
    label: "Demographic and Health", 
    helper: "Patient information, age, gender, vital signs" 
  },
  { 
    id: "lab", 
    label: "Laboratory Tests Data", 
    helper: "Blood values and biochemistry" 
  },
  { 
    id: "tki", 
    label: "CML Treatment (TKI) Data", 
    helper: "TKI type and dosage" 
  },
  { 
    id: "models", 
    label: "Predictive Models", 
    helper: "Model selection and result" 
  },
  { 
    id: "review", 
    label: "Review & Confirmation", 
    helper: "Summary of patient data" 
  },
];

export const PANEL_TITLES = {
  0: "Demographic and Health",
  1: "Laboratory Tests Data", 
  2: "CML Treatment (TKI) Data",
  3: "Predictive Models",
  4: "Review & Confirmation"
} as const;
