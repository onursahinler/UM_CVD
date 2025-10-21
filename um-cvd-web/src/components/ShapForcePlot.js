// components/ShapForcePlot.js
import React, { useEffect, useRef } from 'react';

const ShapForcePlot = ({ baseValue, features, featureNames, outNames }) => {
  const plotRef = useRef(null);

  useEffect(() => {
    console.log('ShapForcePlot useEffect triggered with:', {
      baseValue,
      features,
      featureNames,
      outNames,
      hasPlotRef: !!plotRef.current
    });

    if (!plotRef.current || !baseValue || !features || !featureNames || !outNames) {
      console.log('Missing required data for SHAP visualization');
      return;
    }

    // Gerçek SHAP Force Plot oluştur
    const createShapForcePlot = () => {
      try {
        console.log('Creating SHAP Force Plot...');
        
        // Container'ı temizle
        plotRef.current.innerHTML = '';

        // SHAP değerlerini sırala (mutlak değere göre)
        const sortedFeatures = Object.entries(features)
          .sort(([,a], [,b]) => Math.abs(b.effect) - Math.abs(a.effect))
          .slice(0, 20); // En önemli 20 özelliği göster

        // Toplam etkiyi hesapla
        const totalEffect = sortedFeatures.reduce((sum, [, featureData]) => sum + featureData.effect, 0);
        const finalValue = baseValue + totalEffect;

        // Ölçek hesapla
        const minValue = Math.min(baseValue, finalValue) - 0.1;
        const maxValue = Math.max(baseValue, finalValue) + 0.1;
        const range = maxValue - minValue;

        // Base value ortada sabit
        const basePosition = 50; // Base value ortada (%50)
        const maxLeft = 5; // Sol sınır %5
        const maxRight = 95; // Sağ sınır %95
        
        // f(x) değerinin sayı doğrusundaki pozisyonunu hesapla
        const fXPosition = 5 + ((finalValue - minValue) / range) * 90; // %5 ile %95 arasında
        
        // Pozisyon değişkenlerini başlat
        let leftPosition = basePosition;
        let rightPosition = basePosition;

        // HTML oluştur
        let html = `
          <div style="font-family: Arial, sans-serif; color: #333; background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #2563eb; font-size: 16px;">SHAP Force Plot</h3>
            
            <!-- Ölçek -->
            <div style="margin-bottom: 8px; position: relative; height: 20px;">
              <div style="position: absolute; top: 0; left: 0; width: 90%; height: 1px; background: #e5e7eb;"></div>
              ${[0, 0.25, 0.5, 0.75, 1].map(pos => {
                const value = minValue + (range * pos);
                return `
                  <div style="position: absolute; top: 3px; left: ${pos * 90}%; transform: translateX(-50%); font-size: 10px; color: #666;">
                    ${value.toFixed(3)}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Ana çizgi container -->
            <div style="position: relative; height: 40px; margin-bottom: 20px;">
              <!-- Ana yatay çizgi -->
              <div style="position: absolute; top: 20px; left: 0; width: 90%; height: 3px; background: #374151; border-radius: 2px;"></div>
              
              <!-- Base value noktası -->
              <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); text-align: center;">
                <div style="font-size: 10px; color: #666; margin-bottom: 1px;">base value</div>
                <div style="font-size: 12px; font-weight: bold; color: #374151;">${baseValue.toFixed(4)}</div>
              </div>
              
              <!-- Final value - sayı doğrusunda gerçek pozisyon -->
              <div style="position: absolute; top: 5px; left: ${fXPosition}%; transform: translateX(-50%); text-align: center;">
                <div style="font-size: 10px; color: #666; margin-bottom: 1px;">f(x)</div>
                <div style="font-size: 12px; font-weight: bold; color: #374151; background: white; padding: 2px 6px; border-radius: 3px; border: 1px solid #d1d5db;">${finalValue.toFixed(4)}</div>
              </div>
        `;
        
        // Kırmızı segment'ler (pozitif etkiler) - base value'nun solunda
        const positiveFeatures = sortedFeatures.filter(([, featureData]) => featureData.effect >= 0);
        
        positiveFeatures.forEach(([featureName, featureData]) => {
          const effect = featureData.effect;
          
          // Segment genişliği
          let segmentWidth = (Math.abs(effect) / range) * 40; // Maksimum %40
          if (segmentWidth < 0.5) segmentWidth = 0.5;
          
          // Sol sınırı kontrol et
          if (leftPosition - segmentWidth < maxLeft) {
            segmentWidth = leftPosition - maxLeft;
            if (segmentWidth < 0.5) return;
          }
          
          // Segment pozisyonu (base value'nun solunda)
          const segmentLeft = leftPosition - segmentWidth;
          
          // Segment rengi
          const segmentColor = '#ef4444';
          const arrowColor = '#dc2626';
          
          // Segment HTML'i
          html += `
            <div style="position: absolute; top: 18px; left: ${segmentLeft}%; width: ${segmentWidth}%; height: 8px; background: ${segmentColor}; border-radius: 1px;">
              <!-- Ok işareti (sağa doğru - base value'yu gösterir) -->
              <div style="position: absolute; top: 50%; right: -3px; transform: translateY(-50%); width: 0; height: 0; border-left: 3px solid ${arrowColor}; border-top: 3px solid transparent; border-bottom: 3px solid transparent;"></div>
            </div>
          `;
          
          leftPosition -= segmentWidth;
        });
        
        // Mavi segment'ler (negatif etkiler) - base value'nun sağında
        const negativeFeatures = sortedFeatures.filter(([, featureData]) => featureData.effect < 0);
        
        negativeFeatures.forEach(([featureName, featureData]) => {
          const effect = featureData.effect;
          
          // Segment genişliği
          let segmentWidth = (Math.abs(effect) / range) * 40; // Maksimum %40
          if (segmentWidth < 0.5) segmentWidth = 0.5;
          
          // Sağ sınırı kontrol et
          if (rightPosition + segmentWidth > maxRight) {
            segmentWidth = maxRight - rightPosition;
            if (segmentWidth < 0.5) return;
          }
          
          // Segment pozisyonu (base value'nun sağında)
          const segmentLeft = rightPosition;
          
          // Segment rengi
          const segmentColor = '#3b82f6';
          const arrowColor = '#1d4ed8';
          
          // Segment HTML'i
          html += `
            <div style="position: absolute; top: 18px; left: ${segmentLeft}%; width: ${segmentWidth}%; height: 8px; background: ${segmentColor}; border-radius: 1px;">
              <!-- Ok işareti (sola doğru - base value'yu gösterir) -->
              <div style="position: absolute; top: 50%; left: -3px; transform: translateY(-50%); width: 0; height: 0; border-right: 3px solid ${arrowColor}; border-top: 3px solid transparent; border-bottom: 3px solid transparent;"></div>
            </div>
          `;
          
          rightPosition += segmentWidth;
        });

        html += `
            </div>

            <!-- Özellik etiketleri -->
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 15px;">
        `;

        // Özellik etiketlerini oluştur (sadece en önemli 10 tanesini göster)
        sortedFeatures.slice(0, 10).forEach(([featureName, featureData]) => {
          const effect = featureData.effect;
          const value = featureData.value;
          const isPositive = effect >= 0;
          const labelColor = isPositive ? '#dc2626' : '#2563eb';
          
          html += `
            <div style="display: flex; align-items: center; gap: 3px; padding: 2px 6px; background: white; border-radius: 3px; border: 1px solid #e5e7eb; font-size: 10px;">
              <div style="width: 6px; height: 6px; background: ${labelColor}; border-radius: 50%;"></div>
              <span style="color: ${labelColor}; font-weight: 500;">${featureName}</span>
              <span style="color: #666;">(${value !== null ? value.toFixed(1) : 'N/A'})</span>
            </div>
          `;
        });

        html += `
            </div>

            <!-- Legend -->
            <div style="display: flex; align-items: center; gap: 15px; padding: 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #ef4444; border-radius: 1px;"></div>
                <span style="font-size: 10px; color: #666;">Higher</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #3b82f6; border-radius: 1px;"></div>
                <span style="font-size: 10px; color: #666;">Lower</span>
              </div>
            </div>
          </div>
        `;

        plotRef.current.innerHTML = html;
        console.log('SHAP Force Plot created successfully');

      } catch (error) {
        console.error('SHAP visualization error:', error);
        plotRef.current.innerHTML = '<div style="color: red; padding: 20px;">SHAP görselleştirmesi oluşturulurken hata oluştu: ' + error.message + '</div>';
      }
    };

    createShapForcePlot();
  }, [baseValue, features, featureNames, outNames]);

  // Eğer gerekli veri yoksa boş render et
  if (!baseValue || !features || !featureNames || !outNames) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>SHAP verisi yükleniyor veya eksik...</div>;
  }

  return (
    <div ref={plotRef} style={{ 
      width: '100%', 
      minHeight: '300px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: '#f9fafb'
    }}>
      {/* SHAP Force Plot buraya render edilecek */}
    </div>
  );
};

export default ShapForcePlot;
