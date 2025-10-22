// shapjs.d.ts

declare module 'shapjs' {
    import * as React from 'react';
  
    // ForcePlot'a gönderdiğimiz 'features' dizisindeki her bir objenin tipi
    interface ForcePlotFeature {
      name: string;
      value: number;
      effect: number;
    }
  
    // ForcePlot bileşeninin kabul ettiği props'lar
    interface ForcePlotProps {
      baseValue: number;
      features: ForcePlotFeature[];
      outNames?: string[];
      link?: "identity" | "logit";
      // Kütüphanenin alabileceği diğer tüm bilinmeyen proplara izin ver
      [key: string]: any; 
    }
  
    // ForcePlot'un bir React bileşeni olduğunu ve bu props'ları aldığını bildir
    export const ForcePlot: React.ComponentType<ForcePlotProps>;
  }