"use client";

import React, { useState, useMemo, useEffect } from "react";

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

        <footer className="mt-auto py-8 text-center text-xs text-white/70">
          © UM Institute of Data Science
        </footer>
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
              Tweak the feature values on the left. The SHAP-style force bar and the prediction update instantly.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Left Sidebar - Feature Inputs */}
        <div className="w-80 bg-gray-800 p-6 border-r border-gray-600 min-h-screen">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Feature inputs</h3>
              <div className="space-y-4">
                {Object.entries(features).map(([key, feature]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-medium text-white">
                        {feature.label}
                      </label>
                      <div className="relative group">
                        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="text-center">
                            <div className="font-medium">Baseline: {feature.baseline}</div>
                            <div className="font-medium">Weight: {feature.weight}</div>
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={feature.min}
                        max={feature.max}
                        step={feature.step}
                        value={values[key]}
                        onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-red"
                        style={{
                          background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((values[key] - feature.min) / (feature.max - feature.min)) * 100}%, #374151 ${((values[key] - feature.min) / (feature.max - feature.min)) * 100}%, #374151 100%)`
                        }}
                      />
                      {/* Dynamic value display that moves with slider - below slider */}
                      <div 
                        className="absolute top-0 transform -translate-x-1/2 translate-y-8"
                        style={{
                          left: `${((values[key] - feature.min) / (feature.max - feature.min)) * 100}%`
                        }}
                      >
                        {/* Arrow pointing up */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-red-500"></div>
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg font-medium whitespace-nowrap">
                          {formatValue(values[key])}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{feature.min}</span>
                        <span>{feature.max}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Labels</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showImpacts}
                  onChange={(e) => setShowImpacts(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                />
                <span className="text-sm text-white">Show impact (Δ) next to values</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 p-6 space-y-6">
          {/* KPI Header */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Base value</div>
              <div className="text-2xl font-bold text-gray-800">{BASE_VALUE.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Prediction</div>
              <div className="text-2xl font-bold text-gray-800">{prediction.toLocaleString()}</div>
              <div className={`text-sm font-medium ${prediction - BASE_VALUE >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(prediction - BASE_VALUE >= 0 ? '+' : '') + (prediction - BASE_VALUE).toFixed(2)}
              </div>
            </div>
          </div>


          {/* SHAP Force Plot - Photo Style */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Force bar container */}
            <div className="relative h-40 bg-white p-4">
              <div className="relative h-full">
                {/* X-axis with ticks - Dynamic based on prediction */}
                <div className="absolute top-0 left-0 right-0 h-6 flex items-start justify-between text-xs text-gray-500">
                  {(() => {
                    // Calculate dynamic range based on prediction and contributions
                    const minContrib = Math.min(...Object.values(contribs));
                    const maxContrib = Math.max(...Object.values(contribs));
                    const range = Math.max(Math.abs(minContrib), Math.abs(maxContrib)) * 1.2; // 20% padding
                    const minValue = BASE_VALUE - range;
                    const maxValue = BASE_VALUE + range;
                    const step = Math.ceil(range / 1000) * 100; // Round to nearest 100
                    
                    const ticks = [];
                    for (let i = 0; i <= 10; i++) {
                      const value = minValue + (i * (maxValue - minValue) / 10);
                      const roundedValue = Math.round(value / step) * step;
                      ticks.push(roundedValue);
                    }
                    
                    return ticks.map((value, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className="mb-1">{value.toLocaleString()}</span>
                        <div className="w-px h-2 bg-gray-300"></div>
                      </div>
                    ));
                  })()}
                </div>
                
                {/* Base line */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-px h-12 bg-gray-400"></div>
                
                {/* Risk segments - sorted by magnitude */}
                {Object.entries(contribs)
                  .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                  .map(([key, contrib], index) => {
                    const maxContrib = Math.max(...Object.values(contribs).map(Math.abs));
                    const normalizedWidth = (Math.abs(contrib) / maxContrib) * 40; // Max 40% width
                    const isPositive = contrib > 0;
                    const left = isPositive ? 50 : 50 - normalizedWidth;
                    const height = 8; // Fixed height
                    
                    return (
                      <div
                        key={key}
                        className="absolute top-1/2 transform -translate-y-1/2 rounded-sm"
                        style={{
                          left: `${left}%`,
                          width: `${normalizedWidth}%`,
                          height: `${height}px`,
                          backgroundColor: isPositive ? '#2f80ff' : '#ff3b6a',
                          zIndex: 10 - index,
                          opacity: 0.9
                        }}
                      >
                        {/* Arrow indicators */}
                        <div className={`absolute top-1/2 transform -translate-y-1/2 ${
                          isPositive ? 'right-0' : 'left-0'
                        } w-0 h-0 ${
                          isPositive 
                            ? 'border-l-2 border-l-white border-t-1 border-t-transparent border-b-1 border-b-transparent' 
                            : 'border-r-2 border-r-white border-t-1 border-t-transparent border-b-1 border-b-transparent'
                        }`}></div>
                      </div>
                    );
                  })}
                
                {/* Prediction line */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-px h-12 bg-black"
                  style={{
                    left: `${50 + ((prediction - BASE_VALUE) / Math.max(...Object.values(contribs).map(Math.abs))) * 40}%`
                  }}
                ></div>
                
                {/* Base value label - below the center line */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 text-xs font-bold text-gray-700 bg-white px-3 py-2 rounded-lg shadow-lg border-2 border-gray-300 whitespace-nowrap z-20">
                  {BASE_VALUE.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Under-bar labels with stems - Photo Style */}
            <div className="bg-gray-50 px-32 py-12 border-t border-gray-200">
              <div className="relative min-h-[80px]">
                {(() => {
                  // Calculate actual segment positions like in the force bar
                  const totalWidth = 100; // 100% width
                  const basePosition = 50; // 50% for base value
                  
                  // Calculate cumulative positions for each segment
                  let currentLeft = basePosition;
                  let currentRight = basePosition;
                  
                  // Sort features by contribution magnitude for display order
                  const sortedFeatures = Object.entries(contribs)
                    .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));
                  
                  return sortedFeatures.map(([key, contrib], index) => {
                    const isPositive = contrib > 0;
                    let segmentCenter;
                    
                    if (isPositive) {
                      // Positive contribution: extends right from current right position
                      const segmentWidth = (Math.abs(contrib) / Math.max(...Object.values(contribs).map(Math.abs))) * 40;
                      segmentCenter = currentRight + segmentWidth / 2;
                      currentRight += segmentWidth;
                    } else {
                      // Negative contribution: extends left from current left position
                      const segmentWidth = (Math.abs(contrib) / Math.max(...Object.values(contribs).map(Math.abs))) * 40;
                      segmentCenter = currentLeft - segmentWidth / 2;
                      currentLeft -= segmentWidth;
                    }
                    
                    return (
                      <div key={key} className="absolute" style={{left: `${segmentCenter}%`, transform: 'translateX(-50%)'}}>
                        {/* Vertical stem */}
                        <div className="w-px h-6 bg-gray-400 mx-auto"></div>
                        {/* Label */}
                        <div className={`text-xs text-center mt-2 ${
                          isPositive ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          <div className="font-medium bg-white px-4 py-1 rounded shadow-sm border">
                            {features[key].label} = {formatValue(values[key])}
                          </div>
                          {showImpacts && (
                            <div className="font-bold mt-1 bg-white px-10 py-1 rounded shadow-sm border">
                              (Δ {formatDelta(contrib)})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Feature Contributions Table - Enhanced Style */}
          <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 m-4' : ''}`}>
            {/* Table Header with Controls */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800">Feature Contributions</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search features..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowColumnVisibilityMenu(!showColumnVisibilityMenu)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Columns
                  </button>
                  
                  {/* Column Visibility Menu */}
                  {showColumnVisibilityMenu && (
                    <div className="column-visibility-menu absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            toggleAllColumns();
                            setShowColumnVisibilityMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                        >
                          <div className={`w-4 h-4 border border-gray-400 flex items-center justify-center ${
                            hiddenColumns.size === 0 ? 'bg-red-500' : 'bg-transparent'
                          }`}>
                            {hiddenColumns.size === 0 ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-3 h-0.5 bg-white"></div>
                            )}
                          </div>
                          Select all
                        </button>
                        
                        {columns.map((column) => (
                          <button
                            key={column.key}
                            onClick={() => {
                              toggleColumnVisibility(column.key);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                          >
                            <div className={`w-4 h-4 border border-gray-400 flex items-center justify-center ${
                              !hiddenColumns.has(column.key) ? 'bg-red-500' : 'bg-transparent'
                            }`}>
                              {!hiddenColumns.has(column.key) ? (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : null}
                            </div>
                            {column.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={downloadTable}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CSV
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1"
                >
                  {isFullscreen ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                      </svg>
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Fullscreen
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    {orderedColumns.map((column) => {
                      if (hiddenColumns.has(column.key)) return null;
                      
                      return (
                        <th key={column.key} className="text-left py-4 px-4 font-bold text-gray-800 border-r border-gray-300 relative group">
                          <div className="flex items-center justify-between">
                            <span 
                              className="cursor-pointer hover:text-blue-600"
                              onClick={() => handleSort(column.key)}
                            >
                              {column.label}
                              {sortColumn === column.key && (
                                <span className="ml-1">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => setShowColumnMenu(showColumnMenu === column.key ? null : column.key)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Column Menu */}
                          {showColumnMenu === column.key && (
                            <div className="column-menu absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleSort(column.key);
                                    setShowColumnMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                  </svg>
                                  Sort {sortColumn === column.key ? (sortDirection === 'asc' ? 'Descending' : 'Ascending') : 'Ascending'}
                                </button>
                                <button
                                  onClick={() => {
                                    toggleColumnVisibility(column.key);
                                    setShowColumnMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                  </svg>
                                  Hide Column
                                </button>
                                <button
                                  onClick={() => {
                                    togglePinColumn(column.key);
                                    setShowColumnMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  {pinnedColumns.has(column.key) ? 'Unpin Column' : 'Pin Column'}
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    resetColumns();
                                    setShowColumnMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Reset All
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map(([key, contrib]) => {
                    const feature = features[key];
                    return (
                      <tr key={key} className="border-b border-gray-200 hover:bg-gray-50">
                        {orderedColumns.map((column) => {
                          if (hiddenColumns.has(column.key)) return null;
                          
                          let cellContent;
                          switch (column.key) {
                            case 'feature':
                              cellContent = feature.label;
                              break;
                            case 'value':
                              cellContent = values[key].toFixed(3);
                              break;
                            case 'baseline':
                              cellContent = feature.baseline.toFixed(1);
                              break;
                            case 'weight':
                              cellContent = feature.weight.toFixed(0);
                              break;
                            case 'contribution':
                              cellContent = contrib.toFixed(1);
                              break;
                            default:
                              cellContent = '';
                          }
                          
                          return (
                            <td key={column.key} className={`py-4 px-4 border-r border-gray-200 ${
                              column.key === 'feature' || column.key === 'contribution' 
                                ? 'font-medium text-gray-800' 
                                : 'text-gray-600'
                            }`}>
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto flex">
        {/* Left section matching sidebar */}
        <div className="w-80 bg-gray-800 from-blue-900 via-blue-800 to-blue-900 py-8 flex items-center justify-center">
          <div className="text-xs text-bg-gray-800">
          </div>
        </div>
        {/* Right section */}
        <div className="flex-1 p-6 py-8 flex items-center justify-center">
          <div className="text-xs text-gray-500">
            © UM Institute of Data Science
          </div>
        </div>
      </footer>
    </div>
  );
}
