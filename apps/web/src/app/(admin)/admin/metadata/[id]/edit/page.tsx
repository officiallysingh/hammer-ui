'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  metadataApi,
  ManagedTypeVM,
  ManagedTypeType,
  ManagedTypeClassifier,
  PropertyDef,
} from '@repo/api';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { PropertyBuilder } from '../../_components/PropertyBuilder';

const TYPES: ManagedTypeType[] = ['EMBEDDABLE', 'ENTITY', 'FORM', 'WORKFLOW'];
const CLASSIFIERS: ManagedTypeClassifier[] = ['CATALOG', 'AUCTION_PROPERTIES'];

export default function EditMetadataPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const origRef = useRef<ManagedTypeVM | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ManagedTypeType>('EMBEDDABLE');
  const [classifier, setClassifier] = useState<ManagedTypeClassifier>('CATALOG');
  const [properties, setProperties] = useState<PropertyDef[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    metadataApi
      .getManagedTypeById(id)
      .then((mt) => {
        origRef.current = mt;
        setName(mt.name);
        setDescription(mt.description ?? '');
        setType(mt.type);
        setClassifier(mt.classifier);
        setProperties(mt.properties ?? []);
        setTags(mt.tags ?? []);
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

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((p) => [...p, t]);
      setTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const orig = origRef.current;
    if (!orig) return;

    // type is always required per spec; only send other changed fields
    const patch: Parameters<typeof metadataApi.updateManagedType>[1] = { type };
    if (name.trim() !== orig.name) patch.name = name.trim();
    if ((description.trim() || '') !== (orig.description ?? ''))
      patch.description = description.trim() || undefined;
    if (classifier !== orig.classifier) patch.classifier = classifier;

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
                onChange={(e) => setType(e.target.value as ManagedTypeType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Classifier</Label>
              <select
                value={classifier}
                onChange={(e) => setClassifier(e.target.value as ManagedTypeClassifier)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CLASSIFIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Tags <span className="text-muted-foreground font-normal">(optional, max 5)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={tags.length >= 5}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags((p) => p.filter((x) => x !== t))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Properties</h3>
          <PropertyBuilder properties={properties} onChange={setProperties} />
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
