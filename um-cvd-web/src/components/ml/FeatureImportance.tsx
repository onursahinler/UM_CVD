"use client";

import React from 'react';

interface FeatureImportanceProps {
  featureImportance: Record<string, number>;
  featureCategories?: Record<string, string[]>;
  className?: string;
}

export const FeatureImportance: React.FC<FeatureImportanceProps> = ({ 
  featureImportance, 
  featureCategories,
  className = "" 
}) => {
  // Sort features by importance
  const sortedFeatures = Object.entries(featureImportance)
    .sort(([,a], [,b]) => b - a)
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

  return (
    <div className={`p-6 rounded-lg border ${className}`}>
      <h3 className="text-xl font-bold mb-4">Feature Importance</h3>
      <p className="text-gray-600 mb-6">Top features contributing to the CVD risk prediction</p>
      
      <div className="space-y-3">
        {sortedFeatures.map(([feature, importance], index) => (
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
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {(importance * 100).toFixed(1)}%
                </div>
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${importance * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
