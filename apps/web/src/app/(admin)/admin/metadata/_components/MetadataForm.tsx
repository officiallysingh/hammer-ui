'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metadataApi, PropertyDef } from '@repo/api';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder } from './PropertyBuilder';
import { TagInput } from '@/components/common/admin/TagInput';
import type { KV } from './types';

export interface MetadataFormValues {
  name: string;
  description: string;
  type: string;
  classifier: string;
  properties: PropertyDef[];
  tags: string[];
}

const EMPTY: MetadataFormValues = {
  name: '',
  description: '',
  type: '',
  classifier: '',
  properties: [],
  tags: [],
};

interface MetadataFormProps {
  initialValues?: Partial<MetadataFormValues>;
  original?: MetadataFormValues;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (values: MetadataFormValues, original?: MetadataFormValues) => Promise<void>;
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  const STEPS = ['Details', 'Properties'];
  return (
    <div className="flex items-center mb-8 px-8 max-w-lg">
      {STEPS.map((label, i) => {
        const s = i + 1;
        const done = s < step;
        const active = s === step;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 mb-5 transition-colors ${done ? 'bg-primary' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MetadataForm({
  initialValues,
  original,
  title,
  description,
  submitLabel,
  onSubmit,
}: MetadataFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<MetadataFormValues>({ ...EMPTY, ...initialValues });
  const [typeOptions, setTypeOptions] = useState<KV[]>([]);
  const [classifierOptions, setClassifierOptions] = useState<KV[]>([]);
  const [metaTypeOptions, setMetaTypeOptions] = useState<KV[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    metadataApi
      .getManagedTypeTypes()
      .then((types) => {
        setTypeOptions(types);
        setForm((prev) => ({ ...prev, type: prev.type || types[0]?.key || '' }));
      })
      .catch(() => {});

    metadataApi
      .getClassifierTypes()
      .then((classifiers) => {
        setClassifierOptions(classifiers);
        setForm((prev) => ({ ...prev, classifier: prev.classifier || classifiers[0]?.key || '' }));
      })
      .catch(() => {});

    metadataApi
      .getMetaTypes()
      .then(setMetaTypeOptions)
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (initialValues && !appliedRef.current) {
      appliedRef.current = true;
      setForm((prev) => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const set = <K extends keyof MetadataFormValues>(key: K, value: MetadataFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  // Step 1 validation before proceeding
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (form.properties.length === 0) {
      setError('At least one property is required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form, original);
      router.push('/admin/metadata');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/metadata')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <StepIndicator step={step} />

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Type details</h3>

            <div className="space-y-1.5">
              <Label htmlFor="mt-name" className={fieldErrors.name ? 'text-destructive' : ''}>
                Name
              </Label>
              <Input
                id="mt-name"
                value={form.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  clearErr('name');
                }}
                placeholder="Mobile Phones"
                autoComplete="off"
                className={
                  fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="mt-desc"
                className={fieldErrors.description ? 'text-destructive' : ''}
              >
                Description
              </Label>
              <Input
                id="mt-desc"
                value={form.description}
                onChange={(e) => {
                  set('description', e.target.value);
                  clearErr('description');
                }}
                placeholder="Managed type for mobile phone listings"
                className={
                  fieldErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {fieldErrors.description && (
                <p className="text-xs text-destructive">{fieldErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {typeOptions.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Classifier</Label>
                <select
                  value={form.classifier}
                  onChange={(e) => set('classifier', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {classifierOptions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Tags <span className="text-muted-foreground font-normal">(optional, max 5)</span>
              </Label>
              <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} max={5} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/metadata')}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2: Properties ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Properties</h3>
              <span className="text-xs text-muted-foreground">
                {form.name} · {form.type} · {form.classifier}
              </span>
            </div>
            <PropertyBuilder
              properties={form.properties}
              onChange={(properties) => set('properties', properties)}
              metaTypes={metaTypeOptions}
            />
          </div>

          {error && <ErrorAlert message={error} />}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={saving}>
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
                submitLabel
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/metadata')}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
