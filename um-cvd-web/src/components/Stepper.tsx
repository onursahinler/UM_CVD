import React from "react";

type Step = {
  id: string;
  label: string;
  helper?: string;
};

export function Stepper({ steps, activeIndex = 0 }: { steps: Step[]; activeIndex?: number }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={step.id}
            className={`${isActive ? "border-brand-400 ring-1 ring-brand-300/40" : "border-transparent"} bg-panel rounded-2xl p-5 shadow-sm border`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-full flex-shrink-0 w-6 h-6 text-xs grid place-items-center ${isActive ? "bg-brand-600 text-white" : "bg-muted text-foreground/70"}`}>
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{step.label}</div>
                {step.helper && (
                  <div className="text-xs text-foreground/60 mt-1 leading-snug whitespace-normal">
                    {step.helper}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 