'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metadataApi, ManagedTypeType, ManagedTypeClassifier, PropertyDef } from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder } from './PropertyBuilder';
import { TagInput } from '@/components/common/admin/TagInput';
import type { KV } from './types';

// ── Form state shape ──────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface MetadataFormProps {
  /** Pre-populated values for edit mode. Omit for create. */
  initialValues?: Partial<MetadataFormValues>;
  /** Original snapshot for diff (edit only) */
  original?: MetadataFormValues;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (values: MetadataFormValues, original?: MetadataFormValues) => Promise<void>;
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

  const [form, setForm] = useState<MetadataFormValues>({ ...EMPTY, ...initialValues });
  const [typeOptions, setTypeOptions] = useState<KV[]>([]);
  const [classifierOptions, setClassifierOptions] = useState<KV[]>([]);
  const [metaTypeOptions, setMetaTypeOptions] = useState<KV[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Track if initialValues were applied (for edit: values arrive after async load)
  const appliedRef = useRef(false);

  useEffect(() => {
    metadataApi
      .getManagedTypeTypes()
      .then((types) => {
        setTypeOptions(types);
        // Set default type only if not already set from initialValues
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

  // When initialValues change (edit page loads data), sync into form
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="mt-desc" className={fieldErrors.description ? 'text-destructive' : ''}>
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

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Properties</h3>
          <PropertyBuilder
            properties={form.properties}
            onChange={(properties) => set('properties', properties)}
            metaTypes={metaTypeOptions}
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <div className="flex gap-3">
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
    </div>
  );
}
