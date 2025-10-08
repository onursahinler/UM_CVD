'use client';

import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import Plot from 'react-plotly.js';

// Colors tuned to resemble the reference image
const RED = "#ff3b6a";
const BLUE = "#2f80ff";
const AXIS_GREY = "#6d6d6d";
const STEM_GREY = "rgba(120,120,120,0.8)";

// Toy linear model (easy to replace with your own)
const BASE_VALUE = 22556.52; // model expected value (e.g., mean prediction)

const features = {
  "pct_built_before_1940": {
    "label": "% built before 1940",
    "weight": +80.0,
    "baseline": 50.0,
    "min": 0.0,
    "max": 100.0,
    "step": 0.1,
    "init": 67.2,
  },
  "remoteness": {
    "label": "remoteness",
    "weight": -600.0,
    "baseline": 2.5,
    "min": 0.0,
    "max": 6.0,
    "step": 0.001,
    "init": 3.5325,
  },
  "crime_rate": {
    "label": "crime rate",
    "weight": -15000.0,
    "baseline": 0.25,
    "min": 0.0,
    "max": 1.0,
    "step": 0.00001,
    "init": 0.40202,
  },
  "num_rooms": {
    "label": "number of rooms",
    "weight": +900.0,
    "baseline": 5.5,
    "min": 1.0,
    "max": 10.0,
    "step": 0.001,
    "init": 6.382,
  },
  "connectedness": {
    "label": "connectedness",
    "weight": +700.0,
    "baseline": 2.0,
    "min": 0.0,
    "max": 5.0,
    "step": 0.1,
    "init": 4.0,
  },
};

interface ShapForceBarProps {
  className?: string;
}

const ShapForceBar: React.FC<ShapForceBarProps> = ({ className }) => {
  // Initial values for the first (fixed) graph
  const [originalValues, setOriginalValues] = useState<Record<string, number>>(() => {
    const initialValues: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      initialValues[key] = features[key as keyof typeof features].init;
    });
    return initialValues;
  });

  // Current values for the second (interactive) graph
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initialValues: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      initialValues[key] = features[key as keyof typeof features].init;
    });
    return initialValues;
  });

  // State for saved comparison graph
  const [savedValues, setSavedValues] = useState<Record<string, number> | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const [showImpacts, setShowImpacts] = useState(true);
  const [showColumnMenu, setShowColumnMenu] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showColumnVisibilityMenu, setShowColumnVisibilityMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

  // Helper functions
  const fmt = (x: number) => `${x.toLocaleString()}.${(x % 1).toFixed(2).split('.')[1]}`;
  const fmtValue = (v: number) => v.toFixed(4);
  const fmtDelta = (d: number) => (d >= 0 ? "+" : "") + d.toLocaleString();

  const niceBounds = (xmin: number, xmax: number, tick: number = 500) => {
    const lo = Math.floor(Math.min(xmin, xmax) / tick) * tick;
    let hi = Math.ceil(Math.max(xmin, xmax) / tick) * tick;
    if (hi - lo < 5 * tick) {
      return [lo - tick, hi + tick];
    }
    return [lo, hi];
  };

  const trianglePath = (x: number, y0: number, y1: number, direction: "right" | "left" = "right", scale: number = 0.80) => {
    const h = y1 - y0;
    const w = h * scale;
    const mid = (y0 + y1) / 2;
    if (direction === "right") {
      return `M${x},${y0} L${x + w},${mid} L${x},${y1} Z`;
    } else {
      return `M${x},${y0} L${x - w},${mid} L${x},${y1} Z`;
    }
  };

  // Calculate contributions and prediction for current values
  const { contribs, prediction } = useMemo(() => {
    const contribs: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      const feature = features[key as keyof typeof features];
      contribs[key] = feature.weight * (values[key] - feature.baseline);
    });
    const prediction = BASE_VALUE + Object.values(contribs).reduce((sum, val) => sum + val, 0);
    return { contribs, prediction };
  }, [values]);

  // Calculate contributions and prediction for original values
  const { contribs: originalContribs, prediction: originalPrediction } = useMemo(() => {
    const contribs: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      const feature = features[key as keyof typeof features];
      contribs[key] = feature.weight * (originalValues[key] - feature.baseline);
    });
    const prediction = BASE_VALUE + Object.values(contribs).reduce((sum, val) => sum + val, 0);
    return { contribs, prediction };
  }, [originalValues]);

  // Calculate contributions and prediction for saved values (if any)
  const { contribs: savedContribs, prediction: savedPrediction } = useMemo(() => {
    if (!savedValues) return { contribs: {}, prediction: 0 };
    
    const contribs: Record<string, number> = {};
    Object.keys(features).forEach(key => {
      const feature = features[key as keyof typeof features];
      contribs[key] = feature.weight * (savedValues[key] - feature.baseline);
    });
    const prediction = BASE_VALUE + Object.values(contribs).reduce((sum, val) => sum + val, 0);
    return { contribs, prediction };
  }, [savedValues]);

  // Build force figure with custom contributions
  const buildForceFigure = (customContribs: Record<string, number>, customPrediction: number, customValues: Record<string, number>) => {
    const height = 0.22;
    const y0 = 0.5 - height / 2.0;
    const y1 = 0.5 + height / 2.0;

    // Split and sort by magnitude
    const neg: Array<{label: string, val: number, key: string}> = [];
    const pos: Array<{label: string, val: number, key: string}> = [];
    
    Object.keys(customContribs).forEach(key => {
      const val = customContribs[key];
      const pair = { label: features[key as keyof typeof features].label, val: val, key };
      if (val < 0) {
        neg.push(pair);
      } else {
        pos.push(pair);
      }
    });
    
    neg.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
    pos.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    const shapes: any[] = [];
    const annotations: any[] = [];
    const segmentsForLabels: Array<{
      cx: number;
      side: "neg" | "pos";
      label: string;
      val: number;
      delta: number;
    }> = [];

    let leftCursor = BASE_VALUE;
    let rightCursor = BASE_VALUE;

    // NEGATIVE (RED) side
    neg.forEach(({ label, val, key }) => {
      const x0 = leftCursor + val; // val < 0
      const x1 = leftCursor;
      const actualX0 = Math.min(x0, x1);
      const actualX1 = Math.max(x0, x1);
      
      // rectangle
      shapes.push({
        type: "rect",
        x0: actualX0,
        x1: actualX1,
        y0: y0,
        y1: y1,
        line: { width: 0 },
        fillcolor: RED
      });
      
      // boundary chevron (single, more prominent)
      shapes.push({
        type: "path",
        path: trianglePath(actualX0, y0, y1, "left"),
        line: { width: 2, color: "white" },
        fillcolor: "white"
      });

      const cx = (actualX0 + actualX1) / 2;
      segmentsForLabels.push({
        cx,
        side: "neg",
        label,
        val: customValues[key],
        delta: val,
      });
      leftCursor = actualX0;
    });

    // end-cap chevron on far left
    shapes.push({
      type: "path",
      path: trianglePath(leftCursor, y0, y1, "left"),
      line: { width: 2, color: "white" },
      fillcolor: "white"
    });

    // POSITIVE (BLUE) side
    pos.forEach(({ label, val, key }) => {
      const x0 = rightCursor;
      const x1 = rightCursor + val; // val > 0
      const actualX0 = Math.min(x0, x1);
      const actualX1 = Math.max(x0, x1);
      
      // rectangle
      shapes.push({
        type: "rect",
        x0: actualX0,
        x1: actualX1,
        y0: y0,
        y1: y1,
        line: { width: 0 },
        fillcolor: BLUE
      });
      
      // boundary chevron (single, more prominent)
      shapes.push({
        type: "path",
        path: trianglePath(actualX1, y0, y1, "right"),
        line: { width: 2, color: "white" },
        fillcolor: "white"
      });

      const cx = (actualX0 + actualX1) / 2;
      segmentsForLabels.push({
        cx,
        side: "pos",
        label,
        val: customValues[key],
        delta: val,
      });
      rightCursor = actualX1;
    });

    // end-cap chevron on far right
    shapes.push({
      type: "path",
      path: trianglePath(rightCursor, y0, y1, "right"),
      line: { width: 2, color: "white" },
      fillcolor: "white"
    });

    // dashed center line at the base value
    shapes.push({
      type: "line",
      x0: BASE_VALUE,
      x1: BASE_VALUE,
      y0: 0.25,
      y1: 0.75,
      yref: "paper",
      line: { color: "rgba(0,0,0,0.7)", width: 3, dash: "dot" }
    });
    
    // Base value chevron (pointing right)
    shapes.push({
      type: "path",
      path: trianglePath(BASE_VALUE, y0, y1, "right"),
      line: { width: 2, color: "rgba(0,0,0,0.7)" },
      fillcolor: "rgba(0,0,0,0.7)"
    });

    // Base value label above the line
    annotations.push({
      x: BASE_VALUE,
      y: 0.8,
      text: "Base Value",
      showarrow: false,
      font: { size: 12, color: "rgba(0,0,0,0.7)", family: "Arial, sans-serif" },
      xanchor: "center",
      yanchor: "middle",
    });

    // Prediction line
    shapes.push({
      type: "line",
      x0: customPrediction,
      x1: customPrediction,
      y0: 0.3,
      y1: 0.7,
      yref: "paper",
      line: { color: "rgba(0, 246, 0, 0.8)", width: 2, dash: "solid" }
    });
    
    // Prediction chevron (pointing right)
    shapes.push({
      type: "path",
      path: trianglePath(customPrediction, y0, y1, "right"),
      line: { width: 2, color: "rgba(0,150,0,0.8)" },
      fillcolor: "rgba(0,150,0,0.8)"
    });

    // Prediction label above the line
    annotations.push({
      x: customPrediction,
      y: 0.75,
      text: "Prediction f(x)",
      showarrow: false,
      font: { size: 12, color: "rgba(0,150,0,0.8)", family: "Arial, sans-serif" },
      xanchor: "center",
      yanchor: "middle",
    });

    // axis bounds and ticks
    const [xmin, xmax] = niceBounds(Math.min(leftCursor, BASE_VALUE), Math.max(rightCursor, customPrediction), 500);

    // Under-bar labels with colored connecting lines
    segmentsForLabels.sort((a, b) => a.cx - b.cx);
    const labelYTop = y0 - 0.08; // Top row labels
    const labelYBottom = y0 - 0.18; // Bottom row labels

    segmentsForLabels.forEach((seg, index) => {
      // Determine if this label should be on top or bottom row
      // 1st, 3rd, 5th (index 0, 2, 4) go to top row
      // 2nd, 4th (index 1, 3) go to bottom row
      const isTopRow = index % 2 === 0; // 0, 2, 4 are top row
      const labelY = isTopRow ? labelYTop : labelYBottom;
      
      // Colored connecting line from segment to label
      const lineColor = seg.side === "neg" ? RED : BLUE;
      
      // Vertical line from segment to label
      shapes.push({
        type: "line",
        x0: seg.cx,
        x1: seg.cx,
        y0: y0 - 0.001,
        y1: labelY + 0.00001,
        line: { color: lineColor, width: 3 }
      });
      
      // Small horizontal line at the bottom
      shapes.push({
        type: "line",
        x0: seg.cx - 0.01,
        x1: seg.cx + 0.01,
        y0: labelY + 0.25,
        y1: labelY + 0.1,
        line: { color: lineColor, width: 2 }
      });
      
      // Label background (colored rectangle)
      const labelText = `${seg.label} = ${fmtValue(seg.val)}`;
      const textWidth = labelText.length * 0.008; // Approximate text width
      
      shapes.push({
        type: "rect",
        x0: seg.cx - textWidth/2 - 0.005,
        x1: seg.cx + textWidth/2 + 0.005,
        y0: labelY - 0.005,
        y1: labelY + 0.025,
        line: { width: 1, color: lineColor },
        fillcolor: seg.side === "neg" ? "rgba(255, 59, 106, 0.1)" : "rgba(47, 128, 255, 0.1)",
        opacity: 0.8
      });
      
      // Label text
      annotations.push({
        x: seg.cx,
        y: labelY - 0.08,
        text: labelText,
        showarrow: false,
        font: { size: 13, color: lineColor, family: "Arial, sans-serif" },
        xanchor: "center",
        yanchor: "middle",
      });
      
      // Impact text below the label
      if (showImpacts) {
        const impactText = `Δ ${fmtDelta(seg.delta)}`;
        annotations.push({
          x: seg.cx,
          y: labelY - 0.125,
          text: impactText,
          showarrow: false,
          font: { size: 12, color: lineColor, family: "Arial, sans-serif" },
          xanchor: "center",
          yanchor: "middle",
        });
      }
    });

    return {
      data: [],
      layout: {
        height: 380,
        margin: { l: 40, r: 40, t: 20, b: 120 },
        shapes,
        annotations,
        plot_bgcolor: "rgba(0,0,0,0)",
        paper_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          range: [xmin, xmax],
          side: "top" as const,
          showgrid: false,
          zeroline: false,
          dtick: 500,
          tickformat: ",",
          tickfont: { color: AXIS_GREY, size: 12 },
        },
        yaxis: { visible: false, range: [0, 1] },
        showlegend: false,
      },
      config: {
        displayModeBar: false,
        responsive: true,
        scrollZoom: false,
        showTips: false,
        editable: false,
        staticPlot: true
      }
    };
  };

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

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return Object.entries(contribs);
    
    return Object.entries(contribs).filter(([key, contrib]) => {
      const feature = features[key as keyof typeof features];
      return feature.label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [contribs, searchTerm, features]);

  // Get sorted data
  const sortedData = useMemo(() => {
    const data = filteredData;
    
    if (!sortColumn) {
      return data.sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));
    }

    return data.sort(([keyA, contribA], [keyB, contribB]) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'feature':
          aValue = features[keyA as keyof typeof features].label;
          bValue = features[keyB as keyof typeof features].label;
          break;
        case 'value':
          aValue = values[keyA];
          bValue = values[keyB];
          break;
        case 'baseline':
          aValue = features[keyA as keyof typeof features].baseline;
          bValue = features[keyB as keyof typeof features].baseline;
          break;
        case 'weight':
          aValue = features[keyA as keyof typeof features].weight;
          bValue = features[keyB as keyof typeof features].weight;
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
  }, [filteredData, sortColumn, sortDirection, features, values]);

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

  // Handle fullscreen table
  useEffect(() => {
    if (isTableFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isTableFullscreen]);

  // Create plot data for current values
  const plotData = buildForceFigure(contribs, prediction, values);
  
  // Create plot data for original values
  const originalPlotData = buildForceFigure(originalContribs, originalPrediction, originalValues);
  
  // Create plot data for saved values (if any)
  const savedPlotData = savedValues ? buildForceFigure(savedContribs, savedPrediction, savedValues) : null;

  return (
    <div className="flex w-full">
      {/* Left Sidebar - Feature Controls */}
      <div className="w-80 bg-gray-800 p-6 border-r border-gray-600 min-h-screen flex flex-col">
        <div className="flex-1 space-y-6">
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
                      onChange={(e) => setValues(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
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
                        {fmtValue(values[key])}
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
        
        {/* Copyright at bottom */}
        <div className="mt-auto pt-6 border-t border-gray-600">
          <div className="text-center text-xs text-gray-400">
            © UM Institute of Data Science
          </div>
        </div>
      </div>

      {/* Right Main Content Area */}
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Header */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Base value</div>
            <div className="text-3xl font-bold text-gray-900">{BASE_VALUE.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Prediction</div>
            <div className="text-3xl font-bold text-gray-900">{prediction.toLocaleString()}</div>
            <div className={`text-sm font-semibold ${prediction - BASE_VALUE >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(prediction - BASE_VALUE >= 0 ? '+' : '') + (prediction - BASE_VALUE).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              // Move current values to original (fixed) chart
              setOriginalValues({ ...values });
              // Keep current values as they are for the interactive chart
            }}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Current Values
          </button>
          <button
            onClick={() => {
              // Reset current values to initial feature values
              const initialValues: Record<string, number> = {};
              Object.keys(features).forEach(key => {
                initialValues[key] = features[key as keyof typeof features].init;
              });
              setValues(initialValues);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Original
          </button>
          {savedValues && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                showComparison 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {showComparison ? 'Hide Comparison' : 'Show Comparison'}
            </button>
          )}
        </div>

        {/* Original Values Graph (Fixed) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Original Values (Fixed)</h3>
            <p className="text-sm text-gray-600">Initial values: {originalPrediction.toFixed(2)}</p>
          </div>
          <Plot
            data={originalPlotData.data}
            layout={originalPlotData.layout}
            config={originalPlotData.config}
            style={{ width: '100%', height: '380px' }}
          />
        </div>

        {/* Current Values Graph (Interactive) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Current Values (Interactive)</h3>
            <p className="text-sm text-gray-600">Current prediction: {prediction.toFixed(2)}</p>
          </div>
          <Plot
            data={plotData.data}
            layout={plotData.layout}
            config={plotData.config}
            style={{ width: '100%', height: '380px' }}
          />
        </div>

        {/* Saved Values Graph (Comparison) */}
        {showComparison && savedValues && savedPlotData && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Saved Values (Comparison)</h3>
              <p className="text-sm text-gray-600">Saved prediction: {savedPrediction.toFixed(2)}</p>
            </div>
            <Plot
              data={savedPlotData.data}
              layout={savedPlotData.layout}
              config={savedPlotData.config}
              style={{ width: '100%', height: '380px' }}
            />
          </div>
        )}

        {/* Feature Contributions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-gray-500 hover:text-gray-700 p-1"
                    title="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
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
                onClick={() => {
                  const headers = ["Feature", "Value", "Baseline", "Weight", "Contribution"];
                  const rows = sortedData.map(([key, contrib]) => {
                    const feature = features[key as keyof typeof features];
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
                  link.download = `cml_risk_analysis${searchTerm ? `_${searchTerm}` : ''}.csv`;
                  link.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
              
              <button
                onClick={() => setIsTableFullscreen(!isTableFullscreen)}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1"
                title={isTableFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isTableFullscreen ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v-4.5M15 15h4.5M15 15l5.5 5.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
                {isTableFullscreen ? "Exit Fullscreen" : "Fullscreen"}
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
                  const feature = features[key as keyof typeof features];
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

      {/* Fullscreen Table Modal */}
      {isTableFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Feature Contributions - Fullscreen</h3>
              <button
                onClick={() => setIsTableFullscreen(false)}
                className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                title="Close fullscreen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content - Same table as above */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                {/* Search and Controls */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search features..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowColumnVisibilityMenu(!showColumnVisibilityMenu)}
                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1"
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
                      onClick={() => {
                        const headers = ["Feature", "Value", "Baseline", "Weight", "Contribution"];
                        const rows = sortedData.map(([key, contrib]) => {
                          const feature = features[key as keyof typeof features];
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
                        link.download = `cml_risk_analysis${searchTerm ? `_${searchTerm}` : ''}.csv`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                </div>
                
                {/* Fullscreen Table */}
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
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map(([key, contrib]) => {
                        const feature = features[key as keyof typeof features];
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ShapForceBar;
