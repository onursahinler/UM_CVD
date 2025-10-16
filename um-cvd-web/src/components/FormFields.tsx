 "use client";

import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
};

export function PillInput({ label, helper, error, required, ...rest }: InputProps) {
  const border = error ? "border-red-500" : "border-black/10";
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        {...rest}
        aria-invalid={!!error}
        className={`mt-2 w-full rounded-pill border ${border} bg-white px-4 py-3 outline-none focus:ring-2 ${error ? "focus:ring-red-500" : "focus:ring-brand-400"} text-black placeholder-black/50`}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        helper && <p className="mt-1 text-xs text-foreground/60">{helper}</p>
      )}
    </div>
  );
}

// Number input (controlled) without custom controls
export function PillNumberInput({ label, helper, error, required, step = 1, min, max, onChange, value, integerOnly = false, ...rest }: InputProps & { step?: number; integerOnly?: boolean }) {
  const [localError, setLocalError] = React.useState<string>("");
  const border = error || localError ? "border-red-500" : "border-black/10";
  const effectiveMin = typeof min === "number" ? min : 0; // default no negatives

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const inputValue = e.target.value;
    const numValue = parseFloat(inputValue);
    
    // Clear local error when user starts typing
    if (localError) {
      setLocalError("");
    }
    
    // Check for integer-only constraint
    if (integerOnly && inputValue !== "" && !isNaN(numValue) && !Number.isInteger(numValue)) {
      setLocalError("Please enter a whole number");
      return; // Don't update the value
    }
    
    // Check for negative values
    if (inputValue !== "" && !isNaN(numValue) && numValue < effectiveMin) {
      setLocalError(`Please enter a value greater than or equal to ${effectiveMin}`);
      return; // Don't update the value
    }
    
    // Check for maximum value
    if (max !== undefined && inputValue !== "" && !isNaN(numValue) && numValue > (max as number)) {
      setLocalError(`Please enter a value less than or equal to ${max}`);
      return; // Don't update the value
    }
    
    // forward event to parent
    onChange?.(e);
  };

  const displayError = error || localError;

  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        {...rest}
        type="number"
        step={step}
        min={effectiveMin}
        max={max as number | undefined}
        inputMode="decimal"
        aria-invalid={!!displayError}
        value={value as any}
        onChange={handleChange}
        className={`mt-2 w-full rounded-pill border ${border} bg-white px-4 py-3 outline-none focus:ring-2 ${displayError ? "focus:ring-red-500" : "focus:ring-brand-400"} text-black placeholder-black/50`}
      />
      {displayError ? (
        <p className="mt-1 text-xs text-red-600">{displayError}</p>
      ) : (
        helper && <p className="mt-1 text-xs text-foreground/60">{helper}</p>
      )}
    </div>
  );
}

type ToggleProps = {
  label: string;
  options: { value: string | number; label: string }[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  required?: boolean;
};

export function PillToggle({ label, options, value, onChange, error, required }: ToggleProps) {
  const selected = value;

  const handleClick = (val: string | number) => {
    onChange?.(val);
  };

  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className={`mt-2 grid grid-cols-2 gap-3 ${error ? "[&>button]:border-red-500" : ""}`}>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => handleClick(opt.value)}
              className={`rounded-pill border px-4 py-3 font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white hover:bg-white text-black"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

type SelectProps = {
  label: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function PillSelect({ label, value, onChange, error, required, options, placeholder }: SelectProps) {
  const border = error ? "border-red-500" : "border-black/10";
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        className={`mt-2 w-full rounded-pill border ${border} bg-white px-4 py-3 outline-none focus:ring-2 ${error ? "focus:ring-red-500" : "focus:ring-brand-400"} text-black`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
} 