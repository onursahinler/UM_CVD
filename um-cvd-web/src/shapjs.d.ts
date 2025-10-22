// shapjs.d.ts (GÜNCELLENMİŞ)

declare module 'shapjs' {
  import * as React from 'react';

  // ForcePlot bileşeninin kabul ettiği props'lar
  interface ForcePlotProps {
    baseValue: number;
    features: { name: string; value: number; effect: number; }[];
    outNames?: string[];
    link?: "identity" | "logit";
    [key: string]: any; 
  }

  // Bileşenin kendisini tanımla
  const ForcePlot: React.ComponentType<ForcePlotProps>;
  
  // Modülün bu bileşeni "default" olarak DEĞİL,
  // "ForcePlot" adıyla (named export) ihraç ettiğini bildir
  export { ForcePlot };
}