'use client';

import { ArrowRight } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import { TagInput } from '@/components/common/admin/TagInput';
import type { CategoryVM } from '@repo/api';

export interface ListingDetails {
  name: string;
  description: string;
  categoryId: string;
  subCategory: string;
  tags: string[];
}

interface Step1Props {
  values: ListingDetails;
  onChange: (patch: Partial<ListingDetails>) => void;
  categories: CategoryVM[];
  fieldErrors: Record<string, string>;
  onNext: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function Step1Details({
  values,
  onChange,
  categories,
  fieldErrors,
  onNext,
  onCancel,
}: Step1Props) {
  const selectedCategory = categories.find((c) => c.id === values.categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];

  return (
    <form onSubmit={onNext} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Listing details</h3>

        <div className="space-y-1.5">
          <Label htmlFor="ls-name" className={fieldErrors.name ? 'text-destructive' : ''}>
            Name
          </Label>
          <Input
            id="ls-name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="iPhone 14 Pro"
            autoComplete="off"
            className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ls-desc">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <textarea
            id="ls-desc"
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Describe the listing..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ls-cat">Category</Label>
            <select
              id="ls-cat"
              value={values.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value, subCategory: '' })}
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
            <Label
              htmlFor="ls-subcat"
              className={fieldErrors.subCategory ? 'text-destructive' : ''}
            >
              Sub-category
            </Label>
            <select
              id="ls-subcat"
              value={values.subCategory}
              onChange={(e) => onChange({ subCategory: e.target.value })}
              disabled={!values.categoryId}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.subCategory ? 'border-destructive' : 'border-input'}`}
            >
              <option value="">
                {values.categoryId ? 'Select sub-category...' : 'Select category first'}
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
          <TagInput value={values.tags} onChange={(tags) => onChange({ tags })} max={5} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="gap-2">
          Save &amp; Continue <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
