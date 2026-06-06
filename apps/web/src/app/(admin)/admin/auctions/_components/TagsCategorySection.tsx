'use client';

import { useEffect, useState } from 'react';
import { masterApi, CategoryVM } from '@repo/api';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { GroupBase } from 'react-select';
import { Label } from '@repo/ui';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';

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

export function TagsCategorySection({ value, onChange }: Props) {
  const [allCategories, setAllCategories] = useState<CategoryVM[]>([]);

  // Load all categories with subcategories eagerly
  useEffect(() => {
    masterApi
      .getCategories(true)
      .then(setAllCategories)
      .catch(() => {});
  }, []);

  const categoryOptions: Option[] = allCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // When categories are selected, only show those groups in the subcategory select
  const filteredCategories =
    value.categories.length > 0
      ? allCategories.filter((c) => value.categories.includes(c.id))
      : allCategories;

  const selectedCategoryOpts = categoryOptions.filter((o) => value.categories.includes(o.value));
  const selectedTagOpts: Option[] = value.tags.map((t) => ({ value: t, label: t }));

  const catStyles = makeReactSelectStyles<true>();
  const tagStyles = makeReactSelectStyles<true>();

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        Tags &amp; Categories
      </h3>

      {/* Categories */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Categories</Label>
        <Select<Option, true, GroupBase<Option>>
          isMulti
          options={categoryOptions}
          value={selectedCategoryOpts}
          onChange={(selected) => {
            const newCatIds = (selected ?? []).map((o) => o.value);
            // Remove subcategories belonging to deselected categories
            const removedSubIds = allCategories
              .filter((c) => !newCatIds.includes(c.id) && value.categories.includes(c.id))
              .flatMap((c) => (c.subCategories ?? []).map((s) => s.id));
            onChange({
              categories: newCatIds,
              subCategories: value.subCategories.filter((id) => !removedSubIds.includes(id)),
            });
          }}
          placeholder="Select categories..."
          styles={catStyles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          noOptionsMessage={() => 'No categories found'}
        />
      </div>

      {/* Sub-categories — grouped by category */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Sub-categories</Label>
        <GroupedSubcategorySelect
          isMulti
          categories={filteredCategories}
          value={value.subCategories}
          onChange={(ids) => onChange({ subCategories: ids })}
          placeholder={
            value.categories.length === 0
              ? 'Select sub-categories (grouped by category)...'
              : 'Select sub-categories...'
          }
          noOptionsMessage={
            filteredCategories.every((c) => !c.subCategories?.length)
              ? 'No sub-categories found'
              : undefined
          }
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Tags</Label>
        <CreatableSelect<Option, true, GroupBase<Option>>
          isMulti
          value={selectedTagOpts}
          onChange={(selected) => onChange({ tags: (selected ?? []).map((o) => o.value) })}
          placeholder="Type and press Enter to add tags..."
          formatCreateLabel={(input) => `Add "${input}"`}
          styles={tagStyles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          noOptionsMessage={() => 'Type to create a tag'}
          components={{ DropdownIndicator: null }}
        />
      </div>
    </div>
  );
}
