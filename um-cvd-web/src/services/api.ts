// Backend API servisi
const API_BASE_URL = 'http://localhost:5001';

export interface PredictionResult {
  prediction: number;
  probability_score: number;
  shap_values_dict: Record<string, number>;
  baseValue: number;
  featureValues: Record<string, number | null>;
  features: Record<string, { effect: number; value: number | null }>;
  featureNames: string[];
  outNames: string[];
}

export interface PatientData {
  anchor_age: number | null;
  'White Blood Cells': number | null;
  'Urea Nitrogen': number | null;
  Neutrophils: number | null;
  BMI: number | null;
  Monocytes: number | null;
  Glucose: number | null;
  systolic: number | null;
  MCH: number | null;
  'Calcium, Total': number | null;
  Lymphocytes: number | null;
  Creatinine: number | null;
  Sodium: number | null;
  diastolic: number | null;
  PT: number | null;
  imatinib_dose: number | null;
  dasatinib_dose: number | null;
  gender_encoded: number | null;
  nilotinib_dose: number | null;
  ponatinib_dose: number | null;
  ruxolitinib_dose: number | null;
}

// Form verilerini backend formatına dönüştür
export function transformFormData(formData: any): PatientData {
  return {
    anchor_age: formData.anchor_age ? parseFloat(formData.anchor_age) : null,
    'White Blood Cells': formData.whiteBloodCells ? parseFloat(formData.whiteBloodCells) : null,
    'Urea Nitrogen': formData.ureaNitrogen ? parseFloat(formData.ureaNitrogen) : null,
    Neutrophils: formData.neutrophils ? parseFloat(formData.neutrophils) : null,
    BMI: formData.bmi ? parseFloat(formData.bmi) : null,
    Monocytes: formData.monocytes ? parseFloat(formData.monocytes) : null,
    Glucose: formData.glucose ? parseFloat(formData.glucose) : null,
    systolic: formData.systolic ? parseFloat(formData.systolic) : null,
    MCH: formData.mch ? parseFloat(formData.mch) : null,
    'Calcium, Total': formData.calciumTotal ? parseFloat(formData.calciumTotal) : null,
    Lymphocytes: formData.lymphocytes ? parseFloat(formData.lymphocytes) : null,
    Creatinine: formData.creatinine ? parseFloat(formData.creatinine) : null,
    Sodium: formData.sodium ? parseFloat(formData.sodium) : null,
    diastolic: formData.diastolic ? parseFloat(formData.diastolic) : null,
    PT: formData.pt ? parseFloat(formData.pt) : null,
    imatinib_dose: formData.imatinib_dose ? parseFloat(formData.imatinib_dose) : null,
    dasatinib_dose: formData.dasatinib_dose ? parseFloat(formData.dasatinib_dose) : null,
    gender_encoded: formData.gender !== undefined && formData.gender !== null ? formData.gender : null,
    nilotinib_dose: formData.nilotinib_dose ? parseFloat(formData.nilotinib_dose) : null,
    ponatinib_dose: formData.ponatinib_dose ? parseFloat(formData.ponatinib_dose) : null,
    ruxolitinib_dose: formData.ruxolitinib_dose ? parseFloat(formData.ruxolitinib_dose) : null,
  };
}

// Backend API'ye tahmin isteği gönder
export async function predictCVD(patientData: PatientData): Promise<PredictionResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
