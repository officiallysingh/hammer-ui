'use client';

import { useState } from 'react';
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

function emptyProperty(): PropertyDef {
  return { type: 'SIMPLE_PROPERTY', name: '', label: '', metaType: 'STRING', validators: [] };
}

interface PropertyItemProps {
  prop: PropertyDef;
  index: number;
  total: number;
  onUpdate: (patch: Partial<PropertyDef>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function PropertyItem({ prop, index, total, onUpdate, onRemove, onMove }: PropertyItemProps) {
  const [open, setOpen] = useState(true);

  const addValidator = () =>
    onUpdate({ validators: [...(prop.validators ?? []), { type: 'NOT_NULL', message: '' }] });

  const updateValidator = (vi: number, patch: Partial<{ type: string; message: string }>) =>
    onUpdate({
      validators: (prop.validators ?? []).map((v, i) => (i === vi ? { ...v, ...patch } : v)),
    });

  const removeValidator = (vi: number) =>
    onUpdate({ validators: (prop.validators ?? []).filter((_, i) => i !== vi) });

  const displayName = prop.label || prop.name || `Property ${index + 1}`;

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      {/* Accordion header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{displayName}</span>
        {!open && prop.metaType && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">{prop.metaType}</span>
        )}
        {/* Move + delete — stop propagation so clicks don't toggle accordion */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Accordion body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={prop.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="ram"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={prop.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
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
                onChange={(e) => onUpdate({ type: e.target.value as PropertyType })}
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
                onChange={(e) => onUpdate({ metaType: e.target.value as MetaType })}
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
                    onChange={(e) => updateValidator(vi, { type: e.target.value })}
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
                    onChange={(e) => updateValidator(vi, { message: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeValidator(vi)}
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
            onClick={addValidator}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add validator
          </button>
        </div>
      )}
    </div>
  );
}

interface PropertyBuilderProps {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
}

export function PropertyBuilder({ properties, onChange }: PropertyBuilderProps) {
  const update = (i: number, patch: Partial<PropertyDef>) =>
    onChange(properties.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => onChange(properties.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...properties];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      {properties.map((prop, i) => (
        <PropertyItem
          key={i}
          prop={prop}
          index={i}
          total={properties.length}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
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
