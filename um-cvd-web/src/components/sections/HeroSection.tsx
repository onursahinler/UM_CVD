import { memo } from 'react';
import { UploadedData } from '@/types';

interface HeroSectionProps {
  onFileUpload: (data: UploadedData) => void;
  hideUploadButton?: boolean;
}

const HeroSection = memo(({ onFileUpload, hideUploadButton = false }: HeroSectionProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          onFileUpload(jsonData);
        } catch (error) {
          alert("Invalid JSON file. Please check the format and try again.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="grad-hero text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:gap-8">
          <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
            Cardiovascular Risk Assessment
          </h1>
          <p className="max-w-3xl text-white/90 text-sm sm:text-base">
            Advanced AI-powered cardiovascular disease prediction tool specifically designed
            for Chronic Myelogenous Leukemia (CML) patients. Get accurate risk assessments using
            state-of-the-art machine learning algorithms.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
              <div className="text-xl sm:text-2xl font-bold mb-3">Transparent Risk Analysis</div>
              <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                No "black box". See clearly how factors (BMI, blood pressure, etc.) affect your risk with XAI and SHAP technology.
              </div>
            </div>
            <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
              <div className="text-xl sm:text-2xl font-bold mb-3">Proactive Scenario Planning</div>
              <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Simulate instantly how changing your values affects risk with "What-If" analysis. Discover the power of your decisions.
              </div>
            </div>
            <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
              <div className="text-xl sm:text-2xl font-bold mb-3">Round-the-Clock Access</div>
              <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Get instant risk assessments whenever you need them. Available 24/7 for your convenience and peace of mind.
              </div>
            </div>
          </div>
          
          {/* Upload JSON Button - Hidden on results pages */}
          {!hideUploadButton && (
            <div className="pt-6">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="json-upload"
              />
              <button
                onClick={() => document.getElementById('json-upload')?.click()}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload JSON Data
              </button>
              <p className="text-white/70 text-sm mt-2">
                Have patient data in JSON format? Upload it directly to skip manual entry.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

HeroSection.displayName = 'HeroSection';

export { HeroSection };
