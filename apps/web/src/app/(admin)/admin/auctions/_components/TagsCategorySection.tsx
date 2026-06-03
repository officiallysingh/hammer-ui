'use client';

import { useEffect, useRef, useState } from 'react';
import { masterApi, CategoryVM, SubCategoryVM } from '@repo/api';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { StylesConfig, GroupBase } from 'react-select';
import { Label } from '@repo/ui';

export interface TagsCategoryValue {
  categories: string[]; // category IDs (UI helper, not in payload)
  subCategories: string[]; // subcategory IDs → payload
  tags: string[]; // tag strings → payload
}

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: TagsCategoryValue;
  onChange: (patch: Partial<TagsCategoryValue>) => void;
}

// ── Shared React Select styles using CSS variables ────────────────────────────

function makeStyles<IsMulti extends boolean = false>(): StylesConfig<
  Option,
  IsMulti,
  GroupBase<Option>
> {
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.3)' : 'none',
      borderRadius: '6px',
      minHeight: '36px',
      fontSize: '14px',
      '&:hover': { borderColor: 'hsl(var(--ring))' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'hsl(var(--primary))'
        : state.isFocused
          ? 'hsl(var(--muted))'
          : 'transparent',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
      fontSize: '13px',
      padding: '6px 12px',
      cursor: 'pointer',
      '&:active': { backgroundColor: 'hsl(var(--primary) / 0.85)' },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--muted))',
      borderRadius: '9999px',
      padding: '0 2px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '12px',
      padding: '1px 6px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      borderRadius: '0 9999px 9999px 0',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'hsl(var(--destructive) / 0.15)',
        color: 'hsl(var(--destructive))',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '13px',
    }),
    input: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '13px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 6px',
      '&:hover': { color: 'hsl(var(--foreground))' },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 4px',
      cursor: 'pointer',
      '&:hover': { color: 'hsl(var(--foreground))' },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '13px',
    }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TagsCategorySection({ value, onChange }: Props) {
  const [allCategories, setAllCategories] = useState<CategoryVM[]>([]);
  const [subCatMap, setSubCatMap] = useState<Record<string, SubCategoryVM[]>>({});
  const loadingRef = useRef<Set<string>>(new Set());

  // Load all categories once
  useEffect(() => {
    masterApi
      .getCategories()
      .then(setAllCategories)
      .catch(() => {});
  }, []);

  // Load subcategories for each selected category
  useEffect(() => {
    value.categories.forEach((catId) => {
      if (subCatMap[catId] || loadingRef.current.has(catId)) return;
      loadingRef.current.add(catId);
      masterApi
        .getSubCategoriesByCategory(catId)
        .then((subs) => setSubCatMap((prev) => ({ ...prev, [catId]: subs })))
        .catch(() => {})
        .finally(() => loadingRef.current.delete(catId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.categories]);

  // Options
  const categoryOptions: Option[] = allCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const subCategoryOptions: Option[] = value.categories.flatMap((catId) =>
    (subCatMap[catId] ?? []).map((s) => ({ value: s.id, label: s.name })),
  );

  const selectedCategoryOpts = categoryOptions.filter((o) => value.categories.includes(o.value));
  const selectedSubCatOpts = subCategoryOptions.filter((o) =>
    value.subCategories.includes(o.value),
  );
  const selectedTagOpts: Option[] = value.tags.map((t) => ({ value: t, label: t }));

  const styles = makeStyles<true>();

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        Tags &amp; Categories
      </h3>

      {/* Categories */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Categories</Label>
        <Select<Option, true>
          isMulti
          options={categoryOptions}
          value={selectedCategoryOpts}
          onChange={(selected) => {
            const newCatIds = (selected ?? []).map((o) => o.value);
            // Remove subcategories that belong to removed categories
            const removedCatIds = value.categories.filter((id) => !newCatIds.includes(id));
            const removedSubIds = removedCatIds.flatMap((id) =>
              (subCatMap[id] ?? []).map((s) => s.id),
            );
            onChange({
              categories: newCatIds,
              subCategories: value.subCategories.filter((id) => !removedSubIds.includes(id)),
            });
          }}
          placeholder="Select categories..."
          styles={styles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          noOptionsMessage={() => 'No categories found'}
        />
      </div>

      {/* Sub-categories */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Sub-categories</Label>
        <Select<Option, true>
          isMulti
          options={subCategoryOptions}
          value={selectedSubCatOpts}
          onChange={(selected) => onChange({ subCategories: (selected ?? []).map((o) => o.value) })}
          placeholder={
            value.categories.length === 0
              ? 'Select a category first...'
              : 'Select sub-categories...'
          }
          isDisabled={value.categories.length === 0}
          styles={styles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          noOptionsMessage={() =>
            value.categories.length === 0 ? 'Select a category first' : 'No sub-categories found'
          }
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Tags</Label>
        <CreatableSelect<Option, true>
          isMulti
          value={selectedTagOpts}
          onChange={(selected) => onChange({ tags: (selected ?? []).map((o) => o.value) })}
          placeholder="Type and press Enter to add tags..."
          formatCreateLabel={(input) => `Add "${input}"`}
          styles={styles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          noOptionsMessage={() => 'Type to create a tag'}
          components={{ DropdownIndicator: null }}
        />
      </div>
    </div>
  );
}
