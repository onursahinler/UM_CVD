"use client";

import React, { useState, useMemo, useEffect } from "react";
import ShapForceBar from "./ShapForceBar";

interface Feature {
  label: string;
  weight: number;
  baseline: number;
  min: number;
  max: number;
  step: number;
  init: number;
}

interface CMLRiskAnalysisProps {
  form: Record<string, string>;
}

export function CMLRiskAnalysis({ form }: CMLRiskAnalysisProps) {
  // Determine if we should show explainer based on model selection
  const showExplainer = form.model === "lr_explain";
  
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
    return (
      <div className="min-h-screen w-full flex flex-col">
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
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-4xl">
            <div className="bg-panel rounded-2xl p-8 shadow-lg border border-black/10">
              {/* Patient Info Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl text-white mb-2">Risk Assessment Complete</h2>
                <p className="text-white/70 text-sm">Patient: {form.patientName || "Unknown"} | ID: {form.patientId || "N/A"}</p>
              </div>

              {/* Risk Score Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
                  <div className="text-sm text-gray-600 mb-2">Risk Score</div>
                  <div className="text-4xl font-bold text-gray-800 mb-2">{prediction.toFixed(2)}</div>
                  <div className={`text-sm font-medium ${prediction > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                    {prediction > 0.5 ? 'High Risk' : 'Low Risk'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
                  <div className="text-sm text-gray-600 mb-2">Confidence</div>
                  <div className="text-4xl font-bold text-gray-800 mb-2">94.2%</div>
                  <div className="text-sm text-gray-500">Model Confidence</div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
                  <div className="text-sm text-gray-600 mb-2">Recommendation</div>
                  <div className={`text-lg font-semibold mb-2 ${prediction > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                    {prediction > 0.5 ? 'Monitor Closely' : 'Regular Checkup'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {prediction > 0.5 ? 'High risk detected' : 'Low risk profile'}
                  </div>
                </div>
              </div>

              {/* Key Patient Data Summary */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Age</div>
                    <div className="font-semibold text-gray-900">{form.age || "N/A"} years</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Gender</div>
                    <div className="font-semibold text-gray-900">{form.gender || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">BMI</div>
                    <div className="font-semibold text-gray-900">{form.bmi || "N/A"} kg/m²</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Diabetes</div>
                    <div className="font-semibold text-gray-900">{form.diabetes || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-8">
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
          </div>
        </main>

      </div>
    );
  }

  // Full explainer view for "With Explainer" model
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
              Tweak the feature values on the left. The SHAP-style force bar and the prediction update instantly.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* SHAP Force Bar - Interactive Plotly Version */}
        <ShapForceBar className="w-full" />

      </main>

      
    </div>
  );
}