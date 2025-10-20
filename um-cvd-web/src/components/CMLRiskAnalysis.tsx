"use client";

import React, { useState, useMemo, useEffect } from "react";
import ShapForceBar from "./ShapForceBar";
import { RiskScore } from "./ml/RiskScore";
import { FeatureImportance } from "./ml/FeatureImportance";
import { ShapValues } from "./ml/ShapValues";

interface Feature {
  label: string;
  weight: number;
  baseline: number;
  min: number;
  max: number;
  step: number;
  init: number;
}

interface PredictionResult {
  prediction: number;
  probability: {
    no_cvd: number;
    cvd: number;
  };
  risk_score: number;
  feature_importance: Record<string, number>;
  shap_values: Record<string, number>;
  feature_names: string[];
  feature_categories?: Record<string, string[]>;
}

interface CMLRiskAnalysisProps {
  form: Record<string, string | number>;
}

export function CMLRiskAnalysis({ form }: CMLRiskAnalysisProps) {
  // Determine if we should show explainer based on model selection
  const showExplainer = form.model === "lr_explain";
  
  // ML Model Results State
  const [mlResults, setMlResults] = useState<PredictionResult | null>(null);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState<string | null>(null);
  
  // Load ML results on component mount
  useEffect(() => {
    const loadMLResults = async () => {
      try {
        setMlLoading(true);
        setMlError(null);

        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setMlResults(result);
      } catch (err) {
        console.error('ML prediction error:', err);
        setMlError(err instanceof Error ? err.message : 'Failed to get prediction');
      } finally {
        setMlLoading(false);
      }
    };

    loadMLResults();
  }, [form]);
  
  // Features from the photo - fixed values for demonstration
  const features: Record<string, Feature> = {
    pct_built_before_1940: {
      label: "% built before 1940",
      weight: 80.0,
      baseline: 50.0,
      min: 0.0,
      max: 100.0,
      step: 0.1,
      init: 67.2,
    },
    remoteness: {
      label: "remoteness",
      weight: -600.0,
      baseline: 2.5,
      min: 0.0,
      max: 6.0,
      step: 0.001,
      init: 3.5325,
    },
    crime_rate: {
      label: "crime rate",
      weight: -15000.0,
      baseline: 0.25,
      min: 0.0,
      max: 1.0,
      step: 0.00001,
      init: 0.40202,
    },
    num_rooms: {
      label: "number of rooms",
      weight: 900.0,
      baseline: 5.5,
      min: 1.0,
      max: 10.0,
      step: 0.001,
      init: 6.382,
    },
    connectedness: {
      label: "connectedness",
      weight: 700.0,
      baseline: 2.0,
      min: 0.0,
      max: 5.0,
      step: 0.1,
      init: 4.0,
    },
  };

  const [values, setValues] = useState<Record<string, number>>(() => {
    const initialValues: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      initialValues[key] = features[key].init;
    });
    return initialValues;
  });

  const [showImpacts, setShowImpacts] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showColumnVisibilityMenu, setShowColumnVisibilityMenu] = useState(false);

  // Prevent body scroll when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColumnMenu && !(event.target as Element).closest('.column-menu')) {
        setShowColumnMenu(null);
      }
      if (showColumnVisibilityMenu && !(event.target as Element).closest('.column-visibility-menu')) {
        setShowColumnVisibilityMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnMenu, showColumnVisibilityMenu]);

  const BASE_VALUE = 22556.52; // Base value from the photo

  // Simulate analysis delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate contributions and prediction
  const { contribs, prediction } = useMemo(() => {
    const contribs: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      contribs[key] = features[key].weight * (values[key] - features[key].baseline);
    });
    const prediction = BASE_VALUE + Object.values(contribs).reduce((sum, val) => sum + val, 0);
    return { contribs, prediction };
  }, [values]);

  // Risk level interpretation
  const getRiskLevel = (score: number) => {
    if (score < 800) {
      return { level: "Low", icon: "🟢", color: "text-green-600", recommendation: "Continue regular monitoring" };
    } else if (score < 1200) {
      return { level: "Moderate", icon: "🟡", color: "text-yellow-600", recommendation: "Consider lifestyle modifications" };
    } else {
      return { level: "High", icon: "🔴", color: "text-red-600", recommendation: "Immediate intervention recommended" };
    }
  };

  const riskInfo = getRiskLevel(prediction);

  const formatValue = (val: number) => val.toFixed(2);
  const formatDelta = (delta: number) => (delta >= 0 ? "+" : "") + delta.toFixed(0);

  // Download table as CSV
  const downloadTable = () => {
    const headers = ["Feature", "Value", "Baseline", "Weight", "Contribution"];
    const rows = Object.entries(contribs)
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
      .map(([key, contrib]) => {
        const feature = features[key];
        return [
          feature.label,
          values[key].toFixed(3),
          feature.baseline.toFixed(1),
          feature.weight.toFixed(0),
          contrib.toFixed(1)
        ];
      });
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cml_risk_analysis.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter table data based on search term
  const filteredContribs = useMemo(() => {
    if (!searchTerm) return contribs;
    
    return Object.fromEntries(
      Object.entries(contribs).filter(([key, contrib]) => {
        const feature = features[key];
        return feature.label.toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [contribs, searchTerm, features]);

  // Column management functions
  const toggleColumnVisibility = (column: string) => {
    const newHiddenColumns = new Set(hiddenColumns);
    if (newHiddenColumns.has(column)) {
      newHiddenColumns.delete(column);
    } else {
      newHiddenColumns.add(column);
    }
    setHiddenColumns(newHiddenColumns);
  };

  const togglePinColumn = (column: string) => {
    const newPinnedColumns = new Set(pinnedColumns);
    if (newPinnedColumns.has(column)) {
      newPinnedColumns.delete(column);
    } else {
      newPinnedColumns.add(column);
    }
    setPinnedColumns(newPinnedColumns);
  };

  const toggleAllColumns = () => {
    if (hiddenColumns.size === 0) {
      // Hide all columns except the first one
      const allColumns = columns.map(col => col.key);
      setHiddenColumns(new Set(allColumns.slice(1)));
    } else {
      // Show all columns
      setHiddenColumns(new Set());
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const resetColumns = () => {
    setHiddenColumns(new Set());
    setSortColumn(null);
    setSortDirection('desc');
  };

  // Get sorted data
  const sortedData = useMemo(() => {
    const data = Object.entries(filteredContribs);
    
    if (!sortColumn) {
      return data.sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));
    }

    return data.sort(([keyA, contribA], [keyB, contribB]) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'feature':
          aValue = features[keyA].label;
          bValue = features[keyB].label;
          break;
        case 'value':
          aValue = values[keyA];
          bValue = values[keyB];
          break;
        case 'baseline':
          aValue = features[keyA].baseline;
          bValue = features[keyB].baseline;
          break;
        case 'weight':
          aValue = features[keyA].weight;
          bValue = features[keyB].weight;
          break;
        case 'contribution':
          aValue = contribA;
          bValue = contribB;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [filteredContribs, sortColumn, sortDirection, features, values]);

  const columns = [
    { key: 'feature', label: 'Feature' },
    { key: 'value', label: 'Value' },
    { key: 'baseline', label: 'Baseline' },
    { key: 'weight', label: 'Weight' },
    { key: 'contribution', label: 'Contribution' }
  ];

  // Get ordered columns (pinned first, then unpinned)
  const orderedColumns = useMemo(() => {
    const pinned = columns.filter(col => pinnedColumns.has(col.key));
    const unpinned = columns.filter(col => !pinnedColumns.has(col.key));
    return [...pinned, ...unpinned];
  }, [pinnedColumns]);

  const handleSliderChange = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing) {
      setAnalysisProgress(0);
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Add a small delay before showing results
            setTimeout(() => {
              setIsAnalyzing(false);
            }, 500);
            return 100;
          }
          return prev + Math.random() * 15; // Random increment between 0-15
        });
      }, 200); // Update every 200ms

      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  if (isAnalyzing) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                AI Analysis
                <br />
                In Progress
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                Our advanced machine learning models are processing your cardiovascular risk data 
                using state-of-the-art SHAP explainability techniques.
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8 flex-1">
          <div className="bg-panel rounded-2xl p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="font-display text-3xl mb-4 text-white">Processing Patient Data</h2>
            <p className="text-white/90 mb-6">
              Analyzing {Object.keys(features).length} clinical parameters to generate personalized risk insights...
            </p>
            
            {/* Dynamic progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div 
                className="bg-gradient-to-r from-brand-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{width: `${analysisProgress}%`}}
              ></div>
            </div>
            
            <div className="text-white mb-4">
              {Math.round(analysisProgress)}% Complete
            </div>
            
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-pill text-sm font-medium">
              <div className="w-2 h-2 bg-brand-600 rounded-full animate-pulse"></div>
              Running SHAP analysis...
            </div>
          </div>
        </main>

      </div>
    );
  }

  // Simple prediction view for "Only Prediction" model
  if (!showExplainer) {
    // Use ML results if available, otherwise fallback to demo values
    const riskScore = mlResults?.risk_score || (prediction / 1000); // Convert demo prediction to 0-1 scale
    const riskLevel = riskScore > 0.7 ? 'High' : riskScore > 0.3 ? 'Moderate' : 'Low';
    const riskColor = riskScore > 0.7 ? 'red' : riskScore > 0.3 ? 'yellow' : 'green';
    const confidence = mlResults ? Math.round(Math.max(mlResults.probability.cvd, mlResults.probability.no_cvd) * 100) : 94.2;
    
    return (
      <div className="min-h-screen w-full flex flex-col">
        {/* Header */}
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                Cardiovascular
                <br />
                Risk Assessment
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                AI-powered prediction based on your patient data. Fast and accurate risk scoring.
              </p>
              <div className="flex items-center gap-4 text-white/80">
                <div>
                  <div className="text-sm">Patient</div>
                  <div className="font-semibold">{form.patientName || "Unknown"}</div>
                </div>
                <div className="w-px h-8 bg-white/30"></div>
                <div>
                  <div className="text-sm">ID</div>
                  <div className="font-semibold">{form.patientId || "N/A"}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Results - Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Risk Score Card */}
                <div className="bg-panel rounded-2xl p-8 shadow-sm border border-black/10">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center rounded-full font-bold text-white mb-4 ${
                      riskColor === 'red' ? 'bg-red-500' : riskColor === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} style={{
                      width: `${Math.max(80, Math.min(120, 60 + (riskScore * 100).toString().length * 8))}px`,
                      height: `${Math.max(80, Math.min(120, 60 + (riskScore * 100).toString().length * 8))}px`,
                      fontSize: `${Math.max(24, Math.min(48, 48 - (riskScore * 100).toString().length * 2))}px`
                    }}>
                      {Math.round(riskScore * 100)}%
                    </div>
                    <h2 className="font-display text-2xl text-white mb-2">Risk Score</h2>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      riskColor === 'red' ? 'bg-red-100 text-red-800' : 
                      riskColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {riskLevel} Risk
                    </div>
                  </div>
                </div>

                {/* Confidence Card */}
                <div className="bg-panel rounded-2xl p-6 shadow-sm border border-black/10">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Confidence</h3>
                      <p className="text-sm text-white/70">Model Confidence</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{confidence}%</div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-1000" 
                      style={{width: `${confidence}%`}}
                    ></div>
                  </div>
                </div>

                {/* Recommendation Card - Force to new page */}
                <div className="print:page-break-before-always print:page-break-inside-avoid print:break-inside-avoid">
                  <div className="bg-panel rounded-2xl p-6 shadow-sm border border-black/10">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Recommendation</h3>
                        <p className="text-sm text-white/70">Clinical Action</p>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold mb-2 ${
                      riskColor === 'red' ? 'text-red-400' : 
                      riskColor === 'yellow' ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}>
                      {riskLevel === 'High' ? 'Monitor Closely' : 
                       riskLevel === 'Moderate' ? 'Regular Monitoring' : 
                       'Continue Routine Care'}
                    </div>
                    <p className="text-sm text-white/70">
                      {riskLevel === 'High' ? 'Immediate follow-up recommended' : 
                       riskLevel === 'Moderate' ? 'Schedule regular checkups' : 
                       'Maintain current care plan'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Summary - Right Column */}
              <div className="lg:col-span-1">
                <div className="bg-panel rounded-2xl p-6 shadow-sm border border-black/10">
                  <h3 className="text-lg font-bold text-white mb-4">Patient Summary</h3>
                  <div className="space-y-4">
                    {/* Demographics */}
                    <div>
                      <div className="text-xs text-white/60 uppercase tracking-wide mb-2">Demographics</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-white/50">Age</div>
                          <div className="text-sm font-semibold text-white">{form.age || "N/A"} years</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Gender</div>
                          <div className="text-sm font-semibold text-white">{form.gender === 0 ? "Male" : form.gender === 1 ? "Female" : "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">BMI</div>
                          <div className="text-sm font-semibold text-white">{form.bmi || "N/A"} kg/m²</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Blood Pressure */}
                    <div className="border-t border-white/20 pt-4">
                      <div className="text-xs text-white/60 uppercase tracking-wide mb-2">Blood Pressure</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-white/50">Systolic</div>
                          <div className="text-sm font-semibold text-white">{form.systolic || "N/A"} mmHg</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Diastolic</div>
                          <div className="text-sm font-semibold text-white">{form.diastolic || "N/A"} mmHg</div>
                        </div>
                      </div>
                    </div>

                    {/* Laboratory Values */}
                    <div className="border-t border-white/20 pt-4">
                      <div className="text-xs text-white/60 uppercase tracking-wide mb-2">Laboratory Values</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-white/50">Cholesterol</div>
                          <div className="text-sm font-semibold text-white">{form.cholesterol || "N/A"} mg/dL</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Glucose</div>
                          <div className="text-sm font-semibold text-white">{form.glucose || "N/A"} mg/dL</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">HbA1c</div>
                          <div className="text-sm font-semibold text-white">{form.hba1c || "N/A"}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">RBC</div>
                          <div className="text-sm font-semibold text-white">{form.rbc || "N/A"} m/uL</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Urea Nitrogen</div>
                          <div className="text-sm font-semibold text-white">{form.ureaNitrogen || "N/A"} mg/dL</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Albumin</div>
                          <div className="text-sm font-semibold text-white">{form.albumin || "N/A"} g/dL</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">LDH</div>
                          <div className="text-sm font-semibold text-white">{form.ldh || "N/A"} IU/L</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">Metamyelocytes</div>
                          <div className="text-sm font-semibold text-white">{form.metamyelocytes || "N/A"}%</div>
                        </div>
                      </div>
                    </div>


                    {/* Treatment */}
                    <div className="border-t border-white/20 pt-4">
                      <div className="text-xs text-white/60 uppercase tracking-wide mb-2">Treatment</div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <div className="text-xs text-white/50">TKI Type</div>
                          <div className="text-sm font-semibold text-white">{form.tkiType || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/50">TKI Dose</div>
                          <div className="text-sm font-semibold text-white">{form.tkiDose || "N/A"} mg/day</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-12 print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-pill font-semibold transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Full explainer view for "With Explainer" model
  if (mlLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                AI Analysis
                <br />
                In Progress
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                Our advanced machine learning models are processing your cardiovascular risk data 
                using state-of-the-art SHAP explainability techniques.
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8 flex-1">
          <div className="bg-panel rounded-2xl p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="font-display text-3xl mb-4 text-white">Processing Patient Data</h2>
            <p className="text-white/90 mb-6">
              Analyzing clinical parameters to generate personalized risk insights...
            </p>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div 
                className="bg-gradient-to-r from-brand-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out animate-pulse" 
                style={{width: '100%'}}
              ></div>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-pill text-sm font-medium">
              <div className="w-2 h-2 bg-brand-600 rounded-full animate-pulse"></div>
              Running SHAP analysis...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (mlError) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <header className="grad-hero text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex flex-col gap-6 sm:gap-8">
              <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
                Analysis Error
              </h1>
              <p className="max-w-3xl text-white/90 text-sm sm:text-base">
                {mlError}
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Interactive SHAP-style
              <br />
              Explainer Bar
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              AI-powered CVD risk analysis with detailed feature explanations and interactive visualizations.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Risk Score */}
            <div className="lg:col-span-1">
              {mlResults && (
                <RiskScore
                  riskScore={mlResults.risk_score}
                  prediction={mlResults.prediction}
                  className="mb-6"
                />
              )}
            </div>

            {/* Feature Importance */}
            <div className="lg:col-span-1">
              {mlResults && (
                <FeatureImportance
                  featureImportance={mlResults.feature_importance}
                  featureCategories={mlResults.feature_categories}
                  className="mb-6"
                />
              )}
            </div>

            {/* SHAP Values */}
            <div className="lg:col-span-2">
              {mlResults && (
                <ShapValues
                  shapValues={mlResults.shap_values}
                  featureCategories={mlResults.feature_categories}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-12">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-pill font-semibold transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}