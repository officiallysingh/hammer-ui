'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@repo/ui';
import type { ValidatorDef } from '@repo/api';
import type { KV } from './types';

interface ValidatorRowProps {
  validator: ValidatorDef;
  validatorOptions: KV[];
  onChange: (patch: Partial<ValidatorDef>) => void;
  onRemove: () => void;
}

/** Safely extract a string key from whatever shape the server returned. */
function resolveType(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['type'] === 'string') return obj['type'];
    const firstKey = Object.keys(obj)[0];
    if (firstKey) return firstKey;
  }
  return '';
}

// Validators that require extra fields
const NEEDS_MIN = new Set(['MIN', 'SIZE']);
const NEEDS_MAX = new Set(['MAX', 'SIZE']);
const NEEDS_REGEX = new Set(['REGEX_PATTERN']);

export function ValidatorRow({
  validator,
  validatorOptions,
  onChange,
  onRemove,
}: ValidatorRowProps) {
  const typeKey = resolveType(validator.type);

  const handleTypeChange = (newType: string) => {
    onChange({ type: newType, max: undefined, min: undefined, regex: undefined });
  };

  const minVal = validator.min !== undefined && validator.min !== '' ? String(validator.min) : '';
  const maxVal = validator.max !== undefined && validator.max !== '' ? String(validator.max) : '';
  const regexVal = validator.regex ?? '';

  const minMissing = NEEDS_MIN.has(typeKey) && minVal === '';
  const maxMissing = NEEDS_MAX.has(typeKey) && maxVal === '';
  const regexMissing = NEEDS_REGEX.has(typeKey) && regexVal === '';

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/10 p-2">
      {/* Type + message + delete */}
      <div className="flex items-center gap-2">
        <select
          value={typeKey}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-40 shrink-0"
        >
          {validatorOptions.map((v) => (
            <option key={v.key} value={v.key}>
              {v.value}
            </option>
          ))}
        </select>
        <Input
          value={validator.message ?? ''}
          placeholder="Custom message (optional)"
          onChange={(e) => onChange({ message: e.target.value })}
          className="h-7 text-xs flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Extra fields — mandatory for MIN, MAX, SIZE, REGEX_PATTERN */}
      {(NEEDS_MIN.has(typeKey) || NEEDS_MAX.has(typeKey) || NEEDS_REGEX.has(typeKey)) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {NEEDS_MIN.has(typeKey) && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium text-muted-foreground">
                Min <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                value={minVal}
                placeholder="e.g. 1"
                onChange={(e) =>
                  onChange({ min: e.target.value === '' ? undefined : Number(e.target.value) })
                }
                className={`h-7 text-xs w-24 ${minMissing ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {minMissing && <p className="text-[10px] text-destructive">Required</p>}
            </div>
          )}

          {NEEDS_MAX.has(typeKey) && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium text-muted-foreground">
                Max <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                value={maxVal}
                placeholder="e.g. 255"
                onChange={(e) =>
                  onChange({ max: e.target.value === '' ? undefined : Number(e.target.value) })
                }
                className={`h-7 text-xs w-24 ${maxMissing ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {maxMissing && <p className="text-[10px] text-destructive">Required</p>}
            </div>
          )}

          {NEEDS_REGEX.has(typeKey) && (
            <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-medium text-muted-foreground">
                Pattern <span className="text-destructive">*</span>
              </label>
              <Input
                value={regexVal}
                placeholder="e.g. ^[a-zA-Z]+$"
                onChange={(e) => onChange({ regex: e.target.value })}
                className={`h-7 text-xs font-mono ${regexMissing ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {regexMissing && <p className="text-[10px] text-destructive">Required</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
