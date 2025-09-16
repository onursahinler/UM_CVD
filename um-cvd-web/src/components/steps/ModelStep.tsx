"use client";

import React from "react";

interface ModelStepProps {
  form: {
    model: string;
  };
  errors: Record<string, string>;
  onModelSelect: (modelId: string) => void;
}

export function ModelStep({ form, errors, onModelSelect }: ModelStepProps) {
  const models = [
    {
      id: "lr_pred",
      title: "Logistic Regression",
      subtitle: "Only prediction",
      desc: "Fast baseline producing a risk score without explanations.",
    },
    {
      id: "lr_explain",
      title: "Logistic Regression",
      subtitle: "With explainer",
      desc: "Includes SHAP-like feature importance for interpretability.",
    },
  ];

  return (
    <div className="col-span-2">
      <div className="text-sm font-semibold mb-2">Choose a model</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m) => {
          const active = form.model === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-selected={active}
              onClick={() => onModelSelect(m.id)}
              className={`relative text-left rounded-2xl border p-4 transition ${
                active
                  ? "border-brand-600 ring-4 ring-brand-300/60 bg-brand-50 text-black shadow-md"
                  : "border-transparent bg-brand-700 hover:bg-brand-700/95 text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-semibold ${active ? "text-black" : "text-white"}`}>{m.title}</div>
                  <div className={`text-xs ${active ? "text-black" : "text-white/90"}`}>{m.subtitle}
                    {active && (
                      <span className="ml-2 align-middle rounded-pill bg-brand-600 text-white px-2 py-0.5 text-[10px]">Selected</span>
                    )}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${active ? "bg-brand-600" : "bg-white"}`} />
              </div>
              <div className={`text-xs mt-2 ${active ? "text-black" : "text-white/90"}`}>{m.desc}</div>
              {active && (
                <svg className="absolute top-3 right-3 w-5 h-5 text-brand-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {errors.model && <p className="text-xs text-red-600 mt-2">{errors.model}</p>}
    </div>
  );
}
