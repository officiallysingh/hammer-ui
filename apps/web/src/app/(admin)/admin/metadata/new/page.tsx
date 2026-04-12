'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metadataApi, PropertyDef } from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder, KV } from '../_components/PropertyBuilder';
import { TagInput } from '@/components/common/admin/TagInput';

export default function NewMetadataPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [classifier, setClassifier] = useState('');
  const [properties, setProperties] = useState<PropertyDef[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<KV[]>([]);
  const [classifierOptions, setClassifierOptions] = useState<KV[]>([]);
  const [metaTypeOptions, setMetaTypeOptions] = useState<KV[]>([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<KV[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      metadataApi.getManagedTypeTypes(),
      metadataApi.getClassifierTypes(),
      metadataApi.getMetaTypes(),
    ])
      .then(([types, classifiers, metaTypes]) => {
        setTypeOptions(types);
        setType(types[0]?.key ?? '');
        setClassifierOptions(classifiers);
        setClassifier(classifiers[0]?.key ?? '');
        setMetaTypeOptions(metaTypes);
        // Property types are fixed structural types — fetch from meta-types or use known set
        // The API doesn't have a separate endpoint for property types, use known values
        setPropertyTypeOptions([
          { key: 'SIMPLE_PROPERTY', value: 'Simple' },
          { key: 'COMPOSITE_PROPERTY', value: 'Composite' },
          { key: 'COMPLEX_PROPERTY', value: 'Complex' },
          { key: 'LIST_PROPERTY', value: 'List' },
          { key: 'SET_PROPERTY', value: 'Set' },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

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
    if (properties.length === 0) {
      setError('At least one property is required.');
      return;
    }
    setSaving(true);
    try {
      await metadataApi.createManagedType({
        name: name.trim(),
        description: description.trim(),
        type: type as Parameters<typeof metadataApi.createManagedType>[0]['type'],
        classifier: classifier as Parameters<typeof metadataApi.createManagedType>[0]['classifier'],
        properties,
        tags: tags.length ? tags : undefined,
      });
      router.push('/admin/metadata');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create managed type.');
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
        title="New type"
        description="Create a new managed type definition"
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
            <Label htmlFor="name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
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
            <Label htmlFor="desc" className={fieldErrors.description ? 'text-destructive' : ''}>
              Description
            </Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
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
                value={type}
                onChange={(e) => setType(e.target.value)}
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
                value={classifier}
                onChange={(e) => setClassifier(e.target.value)}
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
            <TagInput value={tags} onChange={setTags} max={5} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Properties</h3>
          <PropertyBuilder
            properties={properties}
            onChange={setProperties}
            propertyTypes={propertyTypeOptions}
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
              'Create type'
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
