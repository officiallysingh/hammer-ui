'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listingsApi, masterApi, ListingVM, ListingUpdationRQ, CategoryVM } from '@repo/api';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const origRef = useRef<ListingVM | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [embeddedJson, setEmbeddedJson] = useState('');
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listingsApi.getListingById(id), masterApi.getCategories(true)])
      .then(([listing, cats]) => {
        origRef.current = listing;
        setName(listing.name);
        setDescription(listing.description ?? '');
        setTags(listing.tags ?? []);
        setSubCategory(listing.subCategory ?? '');
        setEmbeddedJson(
          listing.embedded
            ? JSON.stringify(listing.embedded, null, 2)
            : '{\n  "typeId": "",\n  "pathWiseState": {}\n}',
        );
        setCategories(cats);
        // Resolve which category owns the current subCategory
        const ownerCat = cats.find((c) =>
          c.subCategories?.some((s) => s.id === listing.subCategory),
        );
        if (ownerCat) setCategoryId(ownerCat.id);
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

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
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

    let parsedEmbedded: { typeId: string; pathWiseState: Record<string, unknown> } | undefined;
    try {
      parsedEmbedded = JSON.parse(embeddedJson);
    } catch {
      setError('Embedded JSON is invalid. Please check the format.');
      return;
    }

    // subCategory always required per spec; only send other fields if changed
    const patch: ListingUpdationRQ = { subCategory };
    if (name.trim() !== orig.name) patch.name = name.trim();
    if ((description.trim() || '') !== (orig.description ?? ''))
      patch.description = description.trim() || undefined;

    const tagsChanged =
      tags.length !== (orig.tags?.length ?? 0) || tags.some((t, i) => t !== orig.tags?.[i]);
    if (tagsChanged) patch.tags = tags;

    const embeddedChanged = JSON.stringify(parsedEmbedded) !== JSON.stringify(orig.embedded);
    if (embeddedChanged) patch.embedded = parsedEmbedded;

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
              placeholder="iPhone 14 Pro"
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

          {/* Category → Sub-category cascade */}
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
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.subCategory ? 'border-destructive' : 'border-input'
                }`}
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
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
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

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Embedded struct</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              JSON with <code className="font-mono">typeId</code> and{' '}
              <code className="font-mono">pathWiseState</code>
            </p>
          </div>
          <textarea
            value={embeddedJson}
            onChange={(e) => setEmbeddedJson(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
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
