"use client";

import React from 'react';

interface ShapValuesProps {
  shapValues: Record<string, number>;
  featureCategories?: Record<string, string[]>;
  className?: string;
}

export const ShapValues: React.FC<ShapValuesProps> = ({ 
  shapValues, 
  featureCategories,
  className = "" 
}) => {
  // Sort features by absolute SHAP value
  const sortedFeatures = Object.entries(shapValues)
    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 10); // Top 10 features

  const getCategoryColor = (feature: string) => {
    if (!featureCategories) return 'bg-blue-100 text-blue-800';
    
    for (const [category, features] of Object.entries(featureCategories)) {
      if (features.includes(feature)) {
        switch (category) {
          case 'Demographics': return 'bg-purple-100 text-purple-800';
          case 'Vitals': return 'bg-red-100 text-red-800';
          case 'TKI Medications': return 'bg-green-100 text-green-800';
          case 'Lab Tests': return 'bg-blue-100 text-blue-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getCategoryName = (feature: string) => {
    if (!featureCategories) return 'Other';
    
    for (const [category, features] of Object.entries(featureCategories)) {
      if (features.includes(feature)) {
        return category;
      }
    }
    return 'Other';
  };

  const getShapColor = (value: number) => {
    if (value > 0) return 'text-red-600 bg-red-50 border-red-200';
    if (value < 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getShapIcon = (value: number) => {
    if (value > 0) return '↗';
    if (value < 0) return '↘';
    return '→';
  };

  return (
    <div className={`p-6 rounded-lg border ${className}`}>
      <h3 className="text-xl font-bold mb-4">SHAP Values</h3>
      <p className="text-gray-600 mb-6">
        Feature contributions to the prediction. Positive values increase CVD risk, negative values decrease it.
      </p>
      
      <div className="space-y-3">
        {sortedFeatures.map(([feature, value], index) => (
          <div key={feature} className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="text-sm font-medium text-gray-500 w-6">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(feature)}`}>
                  {getCategoryName(feature)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`text-right px-3 py-1 rounded-lg border ${getShapColor(value)}`}>
                <div className="flex items-center space-x-1">
                  <span className="text-lg">{getShapIcon(value)}</span>
                  <span className="font-semibold">
                    {value > 0 ? '+' : ''}{value.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Increases CVD Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Decreases CVD Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
