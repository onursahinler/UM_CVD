"use client";

import React from 'react';
import { ApiResult } from './steps/ResultsStep';

interface SHAPValuesSidebarProps {
  result: ApiResult;
  patientData: any; // Patient form data
}

export function SHAPValuesSidebar({ result, patientData }: SHAPValuesSidebarProps) {

  // SHAP values ile feature names'leri eşleştir
  const shapData = result.feature_names.map((featureName, index) => ({
    feature: featureName,
    value: result.feature_values[index],
    shapValue: result.shap_values[index],
    impact: result.shap_values[index] > 0 ? 'positive' : 'negative'
  })).sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue)); // En yüksek etkiye göre sırala

  return (
    <div className="w-80 bg-panel border-r border-white/20 h-full overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">SHAP Values</h2>
            <p className="text-sm text-gray-400 mt-1">Feature contributions to risk prediction</p>
          </div>

          {/* Base Value */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Base Value</h3>
            <p className="text-2xl font-bold text-white">{result.base_value.toFixed(3)}</p>
            <p className="text-xs text-gray-400 mt-1">Model's baseline prediction</p>
          </div>

          {/* SHAP Values List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Feature Contributions</h3>
            {shapData.map((item, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium text-gray-300 capitalize">
                    {item.feature.replace(/_/g, ' ')}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.impact === 'positive' 
                      ? 'bg-red-900 text-red-300' 
                      : 'bg-blue-900 text-blue-300'
                  }`}>
                    {item.impact === 'positive' ? '↑ Risk' : '↓ Risk'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Value:</span>
                    <span className="text-white font-medium">{item.value.toFixed(3)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">SHAP:</span>
                    <span className={`font-bold ${
                      item.shapValue > 0 ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {item.shapValue > 0 ? '+' : ''}{item.shapValue.toFixed(3)}
                    </span>
                  </div>
                  
                  {/* Visual bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.shapValue > 0 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(Math.abs(item.shapValue) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Patient Info Summary */}
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Patient Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Age:</span>
                <span className="text-white">{patientData?.anchor_age || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gender:</span>
                <span className="text-white">{patientData?.gender === 1 ? 'Male' : 'Female'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">BMI:</span>
                <span className="text-white">{patientData?.bmi || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
