'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Button, Label, DatePicker, TimePicker, DateTimePicker, YearPicker } from '@repo/ui';
import { ManagedTypeVM, ManagedTypeListItem, PropertyDef } from '@repo/api';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { AddressField } from '@/components/common/admin/AddressField';

interface Step3Props {
  typeListItems: ManagedTypeListItem[];
  managedTypeId: string;
  selectedManagedType: ManagedTypeVM | null;
  loadingType: boolean;
  fieldValues: Record<string, unknown>;
  onTypeChange: (id: string) => void;
  onFieldChange: (name: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

export function Step3Catalog({
  typeListItems,
  managedTypeId,
  selectedManagedType,
  loadingType,
  fieldValues,
  onTypeChange,
  onFieldChange,
  onSubmit,
  onBack,
  onCancel,
  saving,
  error,
}: Step3Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Catalog type</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the type definition and fill in its fields
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mtype">Type definition</Label>
          <select
            id="mtype"
            value={managedTypeId}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select type...</option>
            {typeListItems.map((m) => (
              <option key={m.key} value={m.key}>
                {m.value}
              </option>
            ))}
          </select>
        </div>

        {loadingType && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading type fields...
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-5">
            {selectedManagedType.description && (
              <p className="text-xs text-muted-foreground">{selectedManagedType.description}</p>
            )}
            {selectedManagedType.properties?.map((prop: PropertyDef) => (
              <PropertyFieldGroup
                key={prop.name}
                prop={prop}
                value={fieldValues[prop.name]}
                onChange={(value) => onFieldChange(prop.name, value)}
              />
            ))}
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">This type has no properties defined.</p>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save listing'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRequired(prop: PropertyDef): boolean {
  return (prop.validators ?? []).some((v) => {
    const t = v.type as unknown;
    if (typeof t === 'string') return t === 'NOT_NULL';
    if (typeof t === 'object' && t !== null) return 'NOT_NULL' in (t as object);
    return false;
  });
}

const META_TYPE_LABELS: Partial<Record<string, string>> = {
  BOOLEAN: 'Boolean',
  BYTE: 'Byte',
  SHORT: 'Small Int',
  INTEGER: 'Integer',
  LONG: 'Long',
  FLOAT: 'Float',
  DOUBLE: 'Double',
  BIG_INTEGER: 'Big Int',
  BIG_DECIMAL: 'Decimal',
  STRING: 'Text',
  YEAR: 'Year',
  MONTH: 'Month',
  DAY_OF_WEEK: 'Day',
  YEAR_MONTH: 'Year/Month',
  LOCAL_DATE: 'Date',
  LOCAL_TIME: 'Time',
  LOCAL_DATE_TIME: 'Date & Time',
  COORDINATES: 'Coordinates',
  ADDRESS: 'Address',
  FILE: 'File',
  LIST: 'List',
  DURATION: 'Duration',
};

// ─── PropertyFieldGroup ───────────────────────────────────────────────────────

interface FieldGroupProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}

function PropertyFieldGroup({ prop, value, onChange, depth = 0 }: FieldGroupProps) {
  const indent = depth > 0 ? 'ml-4 pl-3 border-l border-border' : '';
  const required = isRequired(prop);

  // COMPOSITE_PROPERTY → labeled card with child fields inside
  if (prop.type === 'COMPOSITE_PROPERTY') {
    const children = prop.value ?? [];
    const obj =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return (
      <div className={`rounded-lg border border-border overflow-hidden ${indent}`}>
        {/* section header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold text-foreground tracking-wide">{prop.label}</span>
          {required && <span className="text-destructive text-xs leading-none">*</span>}
        </div>

        {/* child fields */}
        {children.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">No child properties defined.</p>
        ) : (
          <div className="px-4 py-4 space-y-4 bg-background/60">
            {children.map((child: PropertyDef) => (
              <PropertyFieldGroup
                key={child.name}
                prop={child}
                value={obj[child.name]}
                onChange={(v) => onChange({ ...obj, [child.name]: v })}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // LIST_PROPERTY / SET_PROPERTY → array of schema-defined items
  if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
    return (
      <CompositeListField
        prop={prop}
        value={value}
        onChange={onChange}
        depth={depth}
        indent={indent}
        required={required}
      />
    );
  }

  // SIMPLE / COMPLEX / default → scalar input
  return (
    <div className={`space-y-1.5 ${indent}`}>
      <div className="flex items-center gap-2">
        <FieldLabel label={prop.label} required={required} />
        {prop.metaType && prop.metaType !== 'STRING' && (
          <span className="text-[10px] text-muted-foreground/70 font-mono bg-muted/40 px-1.5 py-0.5 rounded">
            {META_TYPE_LABELS[prop.metaType] ?? prop.metaType}
          </span>
        )}
      </div>
      <ScalarField prop={prop} value={value} onChange={onChange} />
    </div>
  );
}

// ─── CompositeListField ───────────────────────────────────────────────────────
// Shared renderer for lists of composite items (COMPOSITE_PROPERTY+LIST and LIST_PROPERTY).

function CompositeListField({
  prop,
  value,
  onChange,
  depth,
  indent,
  required,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  indent: string;
  required: boolean;
}) {
  const children = prop.value ?? [];
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const addItem = () => {
    const empty: Record<string, unknown> = {};
    children.forEach((c: PropertyDef) => {
      empty[c.name] = '';
    });
    onChange([...items, empty]);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: string, v: unknown) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, [key]: v } : item)));
  };

  return (
    <div className={`space-y-2 ${indent}`}>
      <div className="flex items-center justify-between">
        <FieldLabel label={prop.label} required={required} />
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="h-3 w-3" />
          Add item
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/10 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            No items yet —{' '}
            <button
              type="button"
              onClick={addItem}
              className="text-primary hover:underline font-medium"
            >
              add the first one
            </button>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border bg-background/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                {prop.label} #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove item ${idx + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {children.length > 0 ? (
              children.map((child: PropertyDef) => (
                <PropertyFieldGroup
                  key={child.name}
                  prop={child}
                  value={item[child.name]}
                  onChange={(v) => updateItem(idx, child.name, v)}
                  depth={depth + 1}
                />
              ))
            ) : (
              <ScalarField
                prop={prop}
                value={typeof item === 'string' ? item : ''}
                onChange={(v) => onChange(items.map((it, i) => (i === idx ? v : it)))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}

// ─── ScalarField ──────────────────────────────────────────────────────────────

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseISODuration(val: string) {
  if (!val || typeof val !== 'string') {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  const match = val.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  return { hours, minutes, seconds };
}

// ─── SliderField ──────────────────────────────────────────────────────────────

function SliderField({
  name,
  value,
  onChange,
  min,
  max,
  step,
}: {
  name: string;
  value: string;
  onChange: (v: unknown) => void;
  min?: string;
  max?: string;
  step?: string;
}) {
  const minNum = min ? Number(min) : 0;
  const maxNum = max ? Number(max) : 100;
  const stepNum = step ? Number(step) : 1;
  const numVal = value !== '' ? Number(value) : minNum;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <input
          id={`prop-${name}`}
          type="range"
          min={minNum}
          max={maxNum}
          step={stepNum}
          value={numVal}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-sm font-mono w-10 text-right tabular-nums text-foreground shrink-0">
          {numVal}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
        <span>{minNum}</span>
        <span>{maxNum}</span>
      </div>
    </div>
  );
}

// ─── TagInputField ─────────────────────────────────────────────────────────────

function TagInputField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: unknown) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const tags = value
    ? value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) {
      setInput('');
      return;
    }
    onChange([...tags, tag].join(','));
    setInput('');
  };

  const removeTag = (idx: number) => onChange(tags.filter((_, i) => i !== idx).join(','));

  return (
    <div
      className="min-h-[2.25rem] w-full rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring cursor-text"
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-sm font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="leading-none hover:text-primary/60 transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          } else if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags.length - 1);
        }}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

// ─── FileField ────────────────────────────────────────────────────────────────

function FileField({
  name,
  value,
  onChange,
  accept,
}: {
  name: string;
  value: string;
  onChange: (v: unknown) => void;
  accept?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = !!accept?.includes('image');

  const handleFile = (file: File) => {
    onChange(file.name);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-muted/20'
      }`}
    >
      <input
        ref={inputRef}
        id={`prop-${name}`}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <div className="p-3 flex items-center gap-3">
          <img
            src={preview}
            alt="preview"
            className="h-16 w-16 object-cover rounded-md border border-border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click or drop to replace</p>
          </div>
        </div>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center gap-2 text-center">
          <Upload className="h-7 w-7 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
            </p>
            {value && <p className="text-xs text-primary mt-0.5 truncate max-w-xs">{value}</p>}
            {accept && <p className="text-[10px] text-muted-foreground/50 mt-1">{accept}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ScalarField ──────────────────────────────────────────────────────────────

function ScalarField({
  prop,
  value,
  onChange,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const base =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60';

  const strVal = typeof value === 'string' ? value : value != null ? String(value) : '';

  // ── Read attributes as typed rendering hints (namespaced protocol) ────────
  const attrs = prop.attributes ?? {};
  const uiComponent = attrs['ui:component'];
  const placeholder = attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`;
  const multiline = attrs['ui:multiline'] === 'true' || uiComponent === 'textarea';
  const rows = attrs['ui:rows'] ? Number(attrs['ui:rows']) : 3;
  const step = attrs['html:step'];
  const attrMin = attrs['html:min'];
  const attrMax = attrs['html:max'];
  const pattern = attrs['html:pattern'];
  // style:options — comma-separated "Label:value" or "value"
  const optionsRaw = attrs['style:options'];
  const options: { label: string; value: string }[] | null = optionsRaw
    ? optionsRaw.split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;
  // style:color-options — comma-separated color names or hex values
  const colorOptionsRaw = attrs['style:color-options'];
  const colorOptions: string[] | null = colorOptionsRaw
    ? colorOptionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : null;

  switch (prop.metaType) {
    // ── Numeric ──────────────────────────────────────────────────────────────
    case 'BYTE':
    case 'SHORT':
    case 'INTEGER':
    case 'LONG':
    case 'BIG_INTEGER':
      if (uiComponent === 'slider')
        return (
          <SliderField
            name={prop.name}
            value={strVal}
            onChange={onChange}
            min={attrMin}
            max={attrMax}
            step={step}
          />
        );
      if (uiComponent === 'stepper') {
        const stepN = step ? Number(step) : 1;
        const numV = strVal !== '' ? Number(strVal) : 0;
        return (
          <div className="flex items-center w-fit rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => onChange(String(numV - stepN))}
              className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium transition-colors border-r border-input"
            >
              −
            </button>
            <input
              type="number"
              value={strVal}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-16 text-center text-sm bg-background focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange(String(numV + stepN))}
              className="h-9 w-9 flex items-center justify-center bg-muted hover:bg-muted/80 text-lg font-medium transition-colors border-l border-input"
            >
              +
            </button>
          </div>
        );
      }
      if (uiComponent === 'rating') {
        return (
          <div className="flex gap-0.5 pt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(String(strVal === String(star) ? 0 : star))}
                className={`text-2xl leading-none transition-colors ${
                  Number(strVal) >= star
                    ? 'text-yellow-400'
                    : 'text-muted-foreground/25 hover:text-yellow-300'
                }`}
              >
                ★
              </button>
            ))}
            {strVal && Number(strVal) > 0 && (
              <span className="text-xs text-muted-foreground self-center ml-1.5">{strVal}/5</span>
            )}
          </div>
        );
      }
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step={step ?? '1'}
          min={attrMin}
          max={attrMax}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      );

    case 'FLOAT':
    case 'DOUBLE':
    case 'BIG_DECIMAL':
      if (uiComponent === 'slider')
        return (
          <SliderField
            name={prop.name}
            value={strVal}
            onChange={onChange}
            min={attrMin}
            max={attrMax}
            step={step}
          />
        );
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step={step ?? 'any'}
          min={attrMin}
          max={attrMax}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      );

    // ── Boolean ──────────────────────────────────────────────────────────────
    case 'BOOLEAN':
      if (uiComponent === 'toggle') {
        const on = strVal === 'true';
        return (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(on ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              on ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                on ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        );
      }
      if (uiComponent === 'checkbox') {
        return (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={strVal === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-muted-foreground">{strVal === 'true' ? 'Yes' : 'No'}</span>
          </label>
        );
      }
      return (
        <div className="flex gap-4 pt-0.5">
          {[
            { label: 'Yes', val: 'true' },
            { label: 'No', val: 'false' },
          ].map(({ label, val }) => (
            <label key={val} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="radio"
                name={`prop-${prop.name}`}
                value={val}
                checked={strVal === val}
                onChange={() => onChange(val)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      );

    // ── Date / Time ──────────────────────────────────────────────────────────
    case 'LOCAL_DATE':
      return (
        <DatePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'LOCAL_TIME':
      return (
        <TimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'LOCAL_DATE_TIME':
    case 'ZONED_DATE_TIME':
    case 'OFFSET_DATE_TIME':
    case 'INSTANT':
      return (
        <DateTimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
        />
      );

    case 'YEAR':
      return (
        <YearPicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={placeholder}
          minYear={attrMin ? Number(attrMin) : undefined}
          maxYear={attrMax ? Number(attrMax) : undefined}
        />
      );

    case 'YEAR_MONTH':
      return (
        <input
          id={`prop-${prop.name}`}
          type="month"
          value={strVal}
          min={attrMin}
          max={attrMax}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );

    case 'MONTH':
      return (
        <select
          id={`prop-${prop.name}`}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select month…</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={m}>
              {MONTH_LABELS[i]}
            </option>
          ))}
        </select>
      );

    case 'DAY_OF_WEEK':
      return (
        <select
          id={`prop-${prop.name}`}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select day…</option>
          {DAYS_OF_WEEK.map((d, i) => (
            <option key={d} value={d}>
              {DAY_LABELS[i]}
            </option>
          ))}
        </select>
      );

    // ── Spatial ───────────────────────────────────────────────────────────────
    case 'COORDINATES': {
      // Store as { latitude: number, longitude: number } object (not a string)
      const coordObj =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const lat = coordObj['latitude'] != null ? String(coordObj['latitude']) : '';
      const lng = coordObj['longitude'] != null ? String(coordObj['longitude']) : '';

      const updateCoord = (latVal: string, lngVal: string) => {
        const latNum = latVal !== '' ? parseFloat(latVal) : undefined;
        const lngNum = lngVal !== '' ? parseFloat(lngVal) : undefined;
        onChange({
          latitude: latNum,
          longitude: lngNum,
        });
      };

      return (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => updateCoord(e.target.value, lng)}
              className={base}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              lat
            </span>
          </div>
          <div className="flex-1 relative">
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => updateCoord(lat, e.target.value)}
              className={base}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
              lng
            </span>
          </div>
        </div>
      );
    }

    // ── Address ───────────────────────────────────────────────────────────────
    case 'ADDRESS':
      return <AddressField value={value} onChange={onChange} />;

    // ── File ──────────────────────────────────────────────────────────────────
    case 'FILE':
      return (
        <FileField
          name={prop.name}
          value={strVal}
          onChange={onChange}
          accept={attrs['html:accept']}
        />
      );

    case 'DURATION': {
      const { hours, minutes, seconds } = parseISODuration(strVal);

      const handleDurationChange = (h: number, m: number, s: number) => {
        onChange(`PT${h}H${m}M${s}S`);
      };

      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <select
              id={`prop-${prop.name}-hours`}
              value={hours}
              onChange={(e) => handleDurationChange(parseInt(e.target.value, 10), minutes, seconds)}
              className={base}
            >
              {Array.from({ length: 100 }, (_, i) => (
                <option key={i} value={i}>
                  {i} hr{i !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              id={`prop-${prop.name}-minutes`}
              value={minutes}
              onChange={(e) => handleDurationChange(hours, parseInt(e.target.value, 10), seconds)}
              className={base}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {i} min{i !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              id={`prop-${prop.name}-seconds`}
              value={seconds}
              onChange={(e) => handleDurationChange(hours, minutes, parseInt(e.target.value, 10))}
              className={base}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {i} sec{i !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    // ── String & default ──────────────────────────────────────────────────────
    case 'STRING':
    default:
      // color swatches → clickable color picker
      if (colorOptions) {
        return (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => onChange(strVal === color ? '' : color)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                  strVal === color
                    ? 'border-primary scale-105'
                    : 'border-transparent hover:border-border'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-border/40 block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-muted-foreground capitalize leading-none">
                  {color}
                </span>
              </button>
            ))}
          </div>
        );
      }
      // tag-input → chip input, value stored as comma-separated
      if (uiComponent === 'tag-input')
        return <TagInputField value={strVal} onChange={onChange} placeholder={placeholder} />;
      // option-pills → pill button group
      if (uiComponent === 'option-pills' && options) {
        return (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(strVal === o.value ? '' : o.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  strVal === o.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        );
      }
      // options attribute → render as select
      if (options) {
        return (
          <select
            id={`prop-${prop.name}`}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            className={base}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }
      // multiline attribute → render as textarea
      if (multiline) {
        return (
          <textarea
            id={`prop-${prop.name}`}
            value={strVal}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${base} resize-none`}
          />
        );
      }
      return (
        <input
          id={`prop-${prop.name}`}
          type={attrs['html:type'] ?? 'text'}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          pattern={pattern}
          minLength={attrMin ? Number(attrMin) : undefined}
          maxLength={attrMax ? Number(attrMax) : undefined}
          className={base}
        />
      );
  }
}
