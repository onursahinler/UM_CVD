"use client";

import React from 'react';

interface RiskScoreProps {
  riskScore: number;
  prediction: number;
  className?: string;
}

export const RiskScore: React.FC<RiskScoreProps> = ({ 
  riskScore, 
  prediction, 
  className = "" 
}) => {
  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { level: "Low", color: "text-green-600", bgColor: "bg-green-100" };
    if (score < 0.7) return { level: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "High", color: "text-red-600", bgColor: "bg-red-100" };
  };

  const getRiskDescription = (score: number) => {
    if (score < 0.3) return "Low risk of cardiovascular disease";
    if (score < 0.7) return "Medium risk of cardiovascular disease";
    return "High risk of cardiovascular disease";
  };

  const riskInfo = getRiskLevel(riskScore);
  const percentage = Math.round(riskScore * 100);

  return (
    <div className={`p-6 rounded-lg border-2 ${riskInfo.bgColor} ${className}`}>
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-4">CVD Risk Assessment</h3>
        
        <div className="mb-6">
          <div className="text-6xl font-bold mb-2">
            <span className={riskInfo.color}>{percentage}%</span>
          </div>
          <div className={`text-xl font-semibold ${riskInfo.color} mb-2`}>
            {riskInfo.level} Risk
          </div>
          <div className="text-gray-600">
            {getRiskDescription(riskScore)}
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ${
              riskScore < 0.3 ? 'bg-green-500' : 
              riskScore < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="text-sm text-gray-500">
          Prediction: {prediction === 1 ? "CVD Risk Detected" : "No CVD Risk"}
        </div>
      </div>
    </div>
  );
};
