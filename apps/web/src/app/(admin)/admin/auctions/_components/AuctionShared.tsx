'use client';

import { Label } from '@repo/ui';

export interface SelectOption {
  value: string;
  label: string;
}

export const PRICE_PROGRESSION_OPTIONS: Record<string, SelectOption[]> = {
  FORWARD: [
    { value: 'STEP_BASED', label: 'Step based increment on highest bid' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage increment on highest bid' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range increment on highest bid' },
    { value: 'CLOCK_BASED', label: 'Clock based ascending price' },
  ],
  REVERSE: [
    { value: 'STEP_BASED', label: 'Step based decrement on lowest ask' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage decrement on lowest ask' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range decrement on lowest ask' },
    { value: 'CLOCK_BASED', label: 'Clock based descending price' },
  ],
};

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
      {children}
    </h3>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Select...',
  loading,
  required,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  loading?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}
