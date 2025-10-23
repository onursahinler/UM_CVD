// components/steps/SimpleResultsStep.tsx
"use client";

import React from "react";

// Backend'den (app.py) gelecek olan basit JSON yanıtının tipi
export interface SimpleApiResult {
  status: "success";
  prediction: number;
}

interface SimpleResultsStepProps {
  result: SimpleApiResult;
  onBack: () => void;
  patientId: string;
}

export function SimpleResultsStep({ 
  result, 
  onBack, 
  patientId 
}: SimpleResultsStepProps) {

  // Risk score hesaplama
  const riskScore = (result.prediction * 100).toFixed(2);

  return (
    <div className="col-span-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">
          Analysis Results (Patient ID: {patientId || "N/A"})
        </h2>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Summary
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Risk Score Card */}
        <div className="bg-panel rounded-2xl border border-black/10 p-8 shadow-sm text-center">
          <h3 className="text-2xl font-semibold text-gray-300 mb-4">
            CVD Risk Score
          </h3>
          <div className="mb-6">
            <p className={`text-8xl font-bold ${parseFloat(riskScore) > 50 ? 'text-red-400' : 'text-green-400'}`}>
              {riskScore}%
            </p>
          </div>
          
          {/* Risk Level Indicator */}
          <div className="mt-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              parseFloat(riskScore) > 70 
                ? 'bg-red-100 text-red-800' 
                : parseFloat(riskScore) > 50 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                parseFloat(riskScore) > 70 
                  ? 'bg-red-500' 
                  : parseFloat(riskScore) > 50 
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}></div>
              {parseFloat(riskScore) > 70 
                ? 'High Risk' 
                : parseFloat(riskScore) > 50 
                ? 'Moderate Risk'
                : 'Low Risk'
              }
            </div>
          </div>
        </div>

        {/* Information Card */}
        <div className="bg-panel rounded-2xl border border-black/10 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-white mb-4">
            About This Result
          </h3>
          <div className="space-y-4 text-gray-300">
            <p className="text-sm leading-relaxed">
              This risk score represents the probability of developing cardiovascular disease 
              based on your current health parameters and demographic information.
            </p>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Risk Categories:</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Low Risk: 0-50%</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Moderate Risk: 51-70%</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span>High Risk: 71-100%</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/30">
              <h4 className="font-semibold text-blue-300 mb-2">Note:</h4>
              <p className="text-sm text-blue-200">
                This is a simplified prediction model. For detailed feature analysis 
                and explanations, please use the "Logistic Regression with explainer" option.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
