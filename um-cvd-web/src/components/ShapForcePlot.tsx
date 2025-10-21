"use client";

import React, { useEffect, useRef } from 'react';
import { PredictionResult } from '@/services/api';

interface ShapForcePlotProps {
  baseValue: number;
  shapValues: Record<string, number>;
  featureValues: Record<string, number | null>;
  width?: number;
  height?: number;
}

export function ShapForcePlot({ 
  baseValue, 
  shapValues, 
  featureValues, 
  width = 800, 
  height = 200 
}: ShapForcePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Container'ı temizle
    containerRef.current.innerHTML = '';

    // SHAP değerlerini sırala (pozitif ve negatif değerler)
    const sortedFeatures = Object.entries(shapValues)
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 15); // En önemli 15 özellik

    // Pozitif ve negatif değerleri ayır
    const positiveFeatures = sortedFeatures.filter(([, value]) => value > 0);
    const negativeFeatures = sortedFeatures.filter(([, value]) => value < 0);

    // SVG oluştur
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = '#f8f9fa';
    svg.style.border = '1px solid #e9ecef';
    svg.style.borderRadius = '8px';

    // Base value çizgisi
    const baseX = width * 0.5;
    const baseY = height * 0.5;
    
    const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baseLine.setAttribute('x1', '0');
    baseLine.setAttribute('y1', baseY.toString());
    baseLine.setAttribute('x2', width.toString());
    baseLine.setAttribute('y2', baseY.toString());
    baseLine.setAttribute('stroke', '#6c757d');
    baseLine.setAttribute('stroke-width', '2');
    baseLine.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(baseLine);

    // Base value etiketi
    const baseText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    baseText.setAttribute('x', '10');
    baseText.setAttribute('y', (baseY - 5).toString());
    baseText.setAttribute('font-family', 'Arial, sans-serif');
    baseText.setAttribute('font-size', '12');
    baseText.setAttribute('fill', '#6c757d');
    baseText.textContent = `Base: ${baseValue.toFixed(3)}`;
    svg.appendChild(baseText);

    // Pozitif değerler (sağa doğru)
    let currentX = baseX;
    positiveFeatures.forEach(([feature, value], index) => {
      const barWidth = Math.min(Math.abs(value) * 200, 100);
      const barHeight = 20;
      const y = baseY - (positiveFeatures.length - index) * 25;

      // Bar
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', currentX.toString());
      rect.setAttribute('y', (y - barHeight/2).toString());
      rect.setAttribute('width', barWidth.toString());
      rect.setAttribute('height', barHeight.toString());
      rect.setAttribute('fill', '#dc3545');
      rect.setAttribute('rx', '3');
      svg.appendChild(rect);

      // Feature name
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (currentX + barWidth + 5).toString());
      text.setAttribute('y', (y + 5).toString());
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#333');
      text.textContent = `${feature}: ${value.toFixed(3)}`;
      svg.appendChild(text);

      currentX += barWidth + 120;
    });

    // Negatif değerler (sola doğru)
    currentX = baseX;
    negativeFeatures.forEach(([feature, value], index) => {
      const barWidth = Math.min(Math.abs(value) * 200, 100);
      const barHeight = 20;
      const y = baseY + (index + 1) * 25;

      // Bar
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (currentX - barWidth).toString());
      rect.setAttribute('y', (y - barHeight/2).toString());
      rect.setAttribute('width', barWidth.toString());
      rect.setAttribute('height', barHeight.toString());
      rect.setAttribute('fill', '#28a745');
      rect.setAttribute('rx', '3');
      svg.appendChild(rect);

      // Feature name
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (currentX - barWidth - 5).toString());
      text.setAttribute('y', (y + 5).toString());
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#333');
      text.setAttribute('text-anchor', 'end');
      text.textContent = `${feature}: ${value.toFixed(3)}`;
      svg.appendChild(text);

      currentX -= barWidth + 120;
    });

    // Final prediction değeri
    const finalValue = baseValue + Object.values(shapValues).reduce((sum, val) => sum + val, 0);
    const finalX = baseX + Object.values(shapValues).reduce((sum, val) => sum + val, 0) * 200;
    
    const finalRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    finalRect.setAttribute('x', (finalX - 2).toString());
    finalRect.setAttribute('y', (baseY - 10).toString());
    finalRect.setAttribute('width', '4');
    finalRect.setAttribute('height', '20');
    finalRect.setAttribute('fill', '#007bff');
    svg.appendChild(finalRect);

    const finalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    finalText.setAttribute('x', (finalX + 8).toString());
    finalText.setAttribute('y', (baseY + 5).toString());
    finalText.setAttribute('font-family', 'Arial, sans-serif');
    finalText.setAttribute('font-size', '12');
    finalText.setAttribute('font-weight', 'bold');
    finalText.setAttribute('fill', '#007bff');
    finalText.textContent = `Final: ${finalValue.toFixed(3)}`;
    svg.appendChild(finalText);

    containerRef.current.appendChild(svg);
  }, [baseValue, shapValues, featureValues, width, height]);

  return (
    <div className="w-full">
      <h4 className="text-lg font-semibold text-white mb-4">SHAP Force Plot</h4>
      <div className="bg-white rounded-lg p-4 border border-black/10">
        <div ref={containerRef} className="w-full overflow-x-auto"></div>
        <div className="mt-4 text-sm text-gray-600">
          <p><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Pozitif etki (risk artırıcı)</p>
          <p><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Negatif etki (risk azaltıcı)</p>
          <p><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>Final tahmin değeri</p>
        </div>
      </div>
    </div>
  );
}
