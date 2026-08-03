'use client';

import { HelpCircle } from 'lucide-react';
import { Input, Label, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Shows a HelpCircle tooltip next to the label */
  tip?: string;
}

/**
 * A labelled input field with optional tooltip, error message, and
 * required/optional annotations. Used across admin create/edit forms.
 */
export function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  error,
  optional,
  required,
  disabled,
  tip,
}: FormFieldProps) {
  const labelClass = error ? 'text-destructive' : disabled ? 'text-muted-foreground' : '';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className={labelClass}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={[
          error ? 'border-destructive focus-visible:ring-destructive' : '',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
