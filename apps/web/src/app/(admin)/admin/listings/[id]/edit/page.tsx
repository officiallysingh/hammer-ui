'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  listingsApi,
  masterApi,
  metadataApi,
  ListingVM,
  ListingUpdationRQ,
  CategoryVM,
  ManagedTypeVM,
  ManagedTypeListItem,
} from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import { TagInput } from '@/components/common/admin/TagInput';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const origRef = useRef<ListingVM | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [managedTypeId, setManagedTypeId] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [typeListItems, setTypeListItems] = useState<ManagedTypeListItem[]>([]);
  const [selectedManagedType, setSelectedManagedType] = useState<ManagedTypeVM | null>(null);
  const [loadingType, setLoadingType] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      listingsApi.getListingById(id),
      masterApi.getCategories(true),
      metadataApi.getManagedTypeListItems(),
    ])
      .then(([listing, cats, items]) => {
        origRef.current = listing;
        setName(listing.name);
        setDescription(listing.description ?? '');
        setTags(listing.tags ?? []);
        setSubCategory(listing.subCategory ?? '');
        setCategories(cats);
        setTypeListItems(items);

        const ownerCat = cats.find((c) =>
          c.subCategories?.some((s) => s.id === listing.subCategory),
        );
        if (ownerCat) setCategoryId(ownerCat.id);

        const embedded = listing.embedded as
          | { typeId?: string; pathWiseState?: Record<string, unknown> }
          | undefined;
        if (embedded?.typeId) {
          setManagedTypeId(embedded.typeId);
          const state: Record<string, string> = {};
          Object.entries(embedded.pathWiseState ?? {}).forEach(([k, v]) => {
            state[k] = String(v ?? '');
          });
          setFieldValues(state);
          // Fetch full type to render fields
          metadataApi
            .getManagedTypeById(embedded.typeId)
            .then(setSelectedManagedType)
            .catch(() => {});
        }
      })
      .catch(() => setError('Failed to load listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];

  const handleCategoryChange = (cid: string) => {
    setCategoryId(cid);
    setSubCategory('');
  };

  const handleManagedTypeChange = async (mid: string) => {
    setManagedTypeId(mid);
    setFieldValues({});
    if (!mid) {
      setSelectedManagedType(null);
      return;
    }
    setLoadingType(true);
    try {
      const mt = await metadataApi.getManagedTypeById(mid);
      setSelectedManagedType(mt);
    } catch {
      setSelectedManagedType(null);
    } finally {
      setLoadingType(false);
    }
  };

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

    const newEmbedded = managedTypeId
      ? { typeId: managedTypeId, pathWiseState: fieldValues }
      : undefined;

    const patch: ListingUpdationRQ = { subCategory };
    if (name.trim() !== orig.name) patch.name = name.trim();
    if ((description.trim() || '') !== (orig.description ?? ''))
      patch.description = description.trim() || undefined;

    const tagsChanged =
      tags.length !== (orig.tags?.length ?? 0) || tags.some((t, i) => t !== orig.tags?.[i]);
    if (tagsChanged) patch.tags = tags;

    const origEmbedded = orig.embedded as
      | { typeId?: string; pathWiseState?: Record<string, unknown> }
      | undefined;
    const embeddedChanged =
      newEmbedded?.typeId !== origEmbedded?.typeId ||
      JSON.stringify(newEmbedded?.pathWiseState) !== JSON.stringify(origEmbedded?.pathWiseState);
    if (embeddedChanged && newEmbedded) patch.embedded = newEmbedded;

    setSaving(true);
    try {
      await listingsApi.updateListing(id, patch);
      router.push('/admin/listings');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update listing.');
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
        title="Edit listing"
        description={name ? `Editing: ${name}` : 'Update listing details'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Listing details</h3>

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
              placeholder="iPhone X (Silver, 64 GB)"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the listing..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat">Category</Label>
              <select
                id="cat"
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subcat" className={fieldErrors.subCategory ? 'text-destructive' : ''}>
                Sub-category
              </Label>
              <select
                id="subcat"
                value={subCategory}
                onChange={(e) => {
                  setSubCategory(e.target.value);
                  clearErr('subCategory');
                }}
                disabled={!categoryId}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.subCategory ? 'border-destructive' : 'border-input'}`}
              >
                <option value="">
                  {categoryId ? 'Select sub-category...' : 'Select category first'}
                </option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon ? `${s.icon} ` : ''}
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.subCategory && (
                <p className="text-xs text-destructive">{fieldErrors.subCategory}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Tags <span className="text-muted-foreground font-normal">(optional, max 5)</span>
            </Label>
            <TagInput value={tags} onChange={setTags} max={5} />
          </div>
        </div>

        {/* Embedded struct */}
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
              onChange={(e) => handleManagedTypeChange(e.target.value)}
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
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              {selectedManagedType.description && (
                <p className="text-xs text-muted-foreground">{selectedManagedType.description}</p>
              )}
              {selectedManagedType.properties?.map((prop) => (
                <div key={prop.name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`prop-${prop.name}`}>{prop.label}</Label>
                    <span className="text-xs text-muted-foreground font-mono">{prop.metaType}</span>
                  </div>
                  <textarea
                    id={`prop-${prop.name}`}
                    value={fieldValues[prop.name] ?? ''}
                    onChange={(e) => setFieldValues((p) => ({ ...p, [prop.name]: e.target.value }))}
                    placeholder={`Enter ${prop.label.toLowerCase()}...`}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          )}

          {selectedManagedType && (selectedManagedType.properties ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">This type has no properties defined.</p>
          )}
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
            onClick={() => router.push('/admin/listings')}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
