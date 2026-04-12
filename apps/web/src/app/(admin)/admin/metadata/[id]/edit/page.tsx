'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { metadataApi, ManagedTypeVM, PropertyDef } from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder, KV } from '../../_components/PropertyBuilder';
import { TagInput } from '@/components/common/admin/TagInput';

export default function EditMetadataPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const origRef = useRef<ManagedTypeVM | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [classifier, setClassifier] = useState('');
  const [properties, setProperties] = useState<PropertyDef[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<KV[]>([]);
  const [classifierOptions, setClassifierOptions] = useState<KV[]>([]);
  const [metaTypeOptions, setMetaTypeOptions] = useState<KV[]>([]);
  const [propertyTypeOptions] = useState<KV[]>([
    { key: 'SIMPLE_PROPERTY', value: 'Simple' },
    { key: 'COMPOSITE_PROPERTY', value: 'Composite' },
    { key: 'COMPLEX_PROPERTY', value: 'Complex' },
    { key: 'LIST_PROPERTY', value: 'List' },
    { key: 'SET_PROPERTY', value: 'Set' },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      metadataApi.getManagedTypeById(id),
      metadataApi.getManagedTypeTypes(),
      metadataApi.getClassifierTypes(),
      metadataApi.getMetaTypes(),
    ])
      .then(([mt, types, classifiers, metaTypes]) => {
        origRef.current = mt;
        setName(mt.name);
        setDescription(mt.description ?? '');
        setType(mt.type);
        setClassifier(mt.classifier);
        setProperties(mt.properties ?? []);
        setTags(mt.tags ?? []);
        setTypeOptions(types);
        setClassifierOptions(classifiers);
        setMetaTypeOptions(metaTypes);
      })
      .catch(() => setError('Failed to load managed type.'))
      .finally(() => setLoading(false));
  }, [id]);

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
    const orig = origRef.current;
    if (!orig) return;

    const patch: Parameters<typeof metadataApi.updateManagedType>[1] = {
      type: type as Parameters<typeof metadataApi.updateManagedType>[1]['type'],
    };
    if (name.trim() !== orig.name) patch.name = name.trim();
    if ((description.trim() || '') !== (orig.description ?? ''))
      patch.description = description.trim() || undefined;
    if (classifier !== orig.classifier) patch.classifier = classifier as typeof patch.classifier;

    const propsChanged = JSON.stringify(properties) !== JSON.stringify(orig.properties ?? []);
    if (propsChanged) patch.properties = properties;

    const tagsChanged =
      tags.length !== (orig.tags?.length ?? 0) || tags.some((t, i) => t !== orig.tags?.[i]);
    if (tagsChanged) patch.tags = tags;

    setSaving(true);
    try {
      await metadataApi.updateManagedType(id, patch);
      router.push('/admin/metadata');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update managed type.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        title="Edit type"
        description={name ? `Editing: ${name}` : 'Update type definition'}
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
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Managed type for mobile phone listings"
            />
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
              'Save changes'
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
