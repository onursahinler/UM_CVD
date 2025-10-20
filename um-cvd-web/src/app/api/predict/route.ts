import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Transform the form data to match Python API expectations
    const transformedData = {
      anchor_age: body.age ? parseFloat(body.age) : null,
      gender_encoded: body.gender !== undefined && body.gender !== -1 ? body.gender : null,
      BMI: body.bmi ? parseFloat(body.bmi) : null,
      systolic: body.systolic ? parseFloat(body.systolic) : null,
      diastolic: body.diastolic ? parseFloat(body.diastolic) : null,
      white_blood_cells: body.whiteBloodCells ? parseFloat(body.whiteBloodCells) : null,
      urea_nitrogen: body.ureaNitrogen ? parseFloat(body.ureaNitrogen) : null,
      neutrophils: body.neutrophils ? parseFloat(body.neutrophils) : null,
      monocytes: body.monocytes ? parseFloat(body.monocytes) : null,
      glucose: body.glucose ? parseFloat(body.glucose) : null,
      mch: body.mch ? parseFloat(body.mch) : null,
      calcium_total: body.calciumTotal ? parseFloat(body.calciumTotal) : null,
      lymphocytes: body.lymphocytes ? parseFloat(body.lymphocytes) : null,
      creatinine: body.creatinine ? parseFloat(body.creatinine) : null,
      sodium: body.sodium ? parseFloat(body.sodium) : null,
      pt: body.pt ? parseFloat(body.pt) : null,
      imatinib_dose: body.tkiDoses?.imatinib || 0,
      dasatinib_dose: body.tkiDoses?.dasatinib || 0,
      nilotinib_dose: body.tkiDoses?.nilotinib || 0,
      ponatinib_dose: body.tkiDoses?.ponatinib || 0,
      ruxolitinib_dose: body.tkiDoses?.ruxolitinib || 0,
    };

    // Call Python API
    const response = await fetch(`${PYTHON_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    const predictionResult = await response.json();
    
    return NextResponse.json(predictionResult);
    
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if Python API is healthy
    const response = await fetch(`${PYTHON_API_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Python API health check failed: ${response.statusText}`);
    }

    const healthData = await response.json();
    
    return NextResponse.json(healthData);
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
