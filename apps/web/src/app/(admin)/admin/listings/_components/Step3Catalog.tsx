'use client';

import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
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

  // ── Read attributes as typed rendering hints ──────────────────────────────
  const attrs = prop.attributes ?? {};
  const placeholder = attrs['placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`;
  const multiline = attrs['multiline'] === 'true';
  const rows = attrs['rows'] ? Number(attrs['rows']) : 3;
  const step = attrs['step'];
  const attrMin = attrs['min'];
  const attrMax = attrs['max'];
  const pattern = attrs['pattern'];
  // options: comma-separated "Label:value,Label:value" or just "value,value"
  const optionsRaw = attrs['options'];
  const options: { label: string; value: string }[] | null = optionsRaw
    ? optionsRaw.split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;

  switch (prop.metaType) {
    // ── Numeric ──────────────────────────────────────────────────────────────
    case 'BYTE':
    case 'SHORT':
    case 'INTEGER':
    case 'LONG':
    case 'BIG_INTEGER':
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
          placeholder={attrs['placeholder'] ?? 'Pick a date…'}
        />
      );

    case 'LOCAL_TIME':
      return (
        <TimePicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={attrs['placeholder'] ?? 'Pick a time…'}
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
          placeholder={attrs['placeholder'] ?? 'Pick date & time…'}
        />
      );

    case 'YEAR':
      return (
        <YearPicker
          id={`prop-${prop.name}`}
          value={strVal || undefined}
          onChange={onChange}
          placeholder={attrs['placeholder'] ?? 'Pick a year…'}
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
      const parts = strVal.split(',').map((s) => s.trim());
      const lat = parts[0] ?? '';
      const lng = parts[1] ?? '';
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
              onChange={(e) => onChange(`${e.target.value},${lng}`)}
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
              onChange={(e) => onChange(`${lat},${e.target.value}`)}
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
        <input
          id={`prop-${prop.name}`}
          type="file"
          accept={attrs['accept']}
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          className={base}
        />
      );

    // ── String & default ──────────────────────────────────────────────────────
    case 'STRING':
    default:
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
          type={attrs['type'] ?? 'text'}
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
