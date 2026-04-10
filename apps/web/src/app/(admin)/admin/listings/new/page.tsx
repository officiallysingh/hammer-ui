'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsApi, masterApi, metadataApi, CategoryVM, ManagedTypeVM } from '@repo/api';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';

export default function NewListingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [managedTypeId, setManagedTypeId] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [managedTypes, setManagedTypes] = useState<ManagedTypeVM[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      masterApi.getCategories(true),
      metadataApi.getManagedTypes({ type: 'EMBEDDABLE', size: 100 }),
    ])
      .then(([cats, mts]) => {
        setCategories(cats);
        setManagedTypes(mts.content ?? []);
      })
      .catch(() => {});
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];
  const selectedManagedType = managedTypes.find((m) => m.id === managedTypeId);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setSubCategory('');
  };

  const handleManagedTypeChange = (id: string) => {
    setManagedTypeId(id);
    setFieldValues({});
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((p) => [...p, t]);
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

    if (!managedTypeId) {
      setError('Please select a type for the embedded struct.');
      return;
    }

    setSaving(true);
    try {
      await listingsApi.createListing({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tags.length ? tags : undefined,
        subCategory,
        embedded: {
          typeId: managedTypeId,
          pathWiseState: fieldValues,
        },
      });
      router.push('/admin/listings');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create listing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New listing"
        description="Create a new auction listing"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
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

          {/* Category → Sub-category */}
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

          {/* Tags */}
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

        {/* Embedded struct — pick managed type then fill fields */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Embedded struct</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a type definition, then fill in its fields
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
              {managedTypes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {selectedManagedType && (selectedManagedType.properties ?? []).length > 0 && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground">
                {selectedManagedType.description && (
                  <span>{selectedManagedType.description} · </span>
                )}
                {selectedManagedType.properties?.length} fields
              </p>
              {selectedManagedType.properties?.map((prop) => (
                <div key={prop.name} className="space-y-1.5">
                  <Label htmlFor={`prop-${prop.name}`}>{prop.label}</Label>
                  <Input
                    id={`prop-${prop.name}`}
                    value={fieldValues[prop.name] ?? ''}
                    onChange={(e) => setFieldValues((p) => ({ ...p, [prop.name]: e.target.value }))}
                    placeholder={`Enter ${prop.label.toLowerCase()}...`}
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
              'Create listing'
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
