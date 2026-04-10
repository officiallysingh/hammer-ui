'use client';

import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import type { PropertyDef, MetaType, PropertyType } from '@repo/api';

const PROPERTY_TYPES: PropertyType[] = [
  'SIMPLE_PROPERTY',
  'COMPOSITE_PROPERTY',
  'COMPLEX_PROPERTY',
  'LIST_PROPERTY',
  'SET_PROPERTY',
];

const META_TYPES: MetaType[] = [
  'STRING',
  'BOOLEAN',
  'INTEGER',
  'LONG',
  'DOUBLE',
  'BIG_DECIMAL',
  'LOCAL_DATE',
  'LOCAL_DATE_TIME',
  'INSTANT',
  'LIST',
  'SET',
  'FILE',
  'ADDRESS',
  'COORDINATES',
];

const VALIDATOR_TYPES = [
  'NOT_NULL',
  'NOT_EMPTY',
  'NOT_BLANK',
  'EMAIL',
  'URL',
  'MIN',
  'MAX',
  'SIZE',
  'POSITIVE',
  'POSITIVE_OR_ZERO',
  'NEGATIVE',
  'NEGATIVE_OR_ZERO',
  'REGEX_PATTERN',
  'PAST',
  'PAST_OR_PRESENT',
  'FUTURE',
  'FUTURE_OR_PRESENT',
];

interface PropertyBuilderProps {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
}

function emptyProperty(): PropertyDef {
  return { type: 'SIMPLE_PROPERTY', name: '', label: '', metaType: 'STRING', validators: [] };
}

export function PropertyBuilder({ properties, onChange }: PropertyBuilderProps) {
  const update = (i: number, patch: Partial<PropertyDef>) => {
    onChange(properties.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const remove = (i: number) => onChange(properties.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...properties];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  const addValidator = (i: number) => {
    const p = properties[i];
    update(i, { validators: [...(p.validators ?? []), { type: 'NOT_NULL', message: '' }] });
  };

  const updateValidator = (
    pi: number,
    vi: number,
    patch: Partial<{ type: string; message: string }>,
  ) => {
    const p = properties[pi];
    const validators = (p.validators ?? []).map((v, idx) => (idx === vi ? { ...v, ...patch } : v));
    update(pi, { validators });
  };

  const removeValidator = (pi: number, vi: number) => {
    const p = properties[pi];
    update(pi, { validators: (p.validators ?? []).filter((_, idx) => idx !== vi) });
  };

  return (
    <div className="space-y-3">
      {properties.map((prop, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Property {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === properties.length - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1 text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={prop.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="ram"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={prop.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="RAM"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Property type</Label>
              <select
                value={prop.type}
                onChange={(e) => update(i, { type: e.target.value as PropertyType })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meta type</Label>
              <select
                value={prop.metaType}
                onChange={(e) => update(i, { metaType: e.target.value as MetaType })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {META_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validators */}
          {(prop.validators ?? []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Validators</Label>
              {(prop.validators ?? []).map((v, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <select
                    value={v.type}
                    onChange={(e) => updateValidator(i, vi, { type: e.target.value })}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-44"
                  >
                    {VALIDATOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={v.message ?? ''}
                    placeholder="Custom message (optional)"
                    onChange={(e) => updateValidator(i, vi, { message: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeValidator(i, vi)}
                    className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => addValidator(i)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add validator
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...properties, emptyProperty()])}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add property
      </Button>
    </div>
  );
}
