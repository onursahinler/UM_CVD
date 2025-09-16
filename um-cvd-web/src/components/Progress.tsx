import React from "react";

export type ProgressStep = {
  id: string;
  label: string;
};

export function SegmentedProgress({
  steps,
  activeIndex,
}: {
  steps: ProgressStep[];
  activeIndex: number; // 0-based
}) {
  const stepPercent = Math.max(0, Math.min(activeIndex, steps.length)) * (100 / (steps.length));
  const percent = Math.round(stepPercent);
  return (
    <div className="bg-panel rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Assessment Progress</div>
        <div className="text-xs font-medium text-foreground/70">{percent}% Complete</div>
      </div>
      <div className="flex items-center gap-3">
        {steps.map((s, idx) => {
          const isDone = idx < activeIndex; // only fill strictly less than active
          return (
            <div key={s.id} className="flex-1">
              <div className={`h-2 rounded-full ${isDone ? "bg-brand-600" : "bg-muted"}`}></div>
              <div className="mt-2 text-[11px] text-foreground/70 truncate">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 