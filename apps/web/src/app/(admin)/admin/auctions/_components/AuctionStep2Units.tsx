'use client';

import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Eye, Loader2, Package, Trash2 } from 'lucide-react';
import { listingsApi, blobsApi, AuctionUnitType, ListingSummaryVM } from '@repo/api';
import { Button, Input, Label } from '@repo/ui';
import { DismissibleError, FieldError, SectionHeading, SelectOption } from './AuctionShared';
import { ListingSearchField } from './ListingSearchField';
import { TagsCategorySection } from './TagsCategorySection';

// ─── UI unit category ─────────────────────────────────────────────────────────
// "Atomic" covers both SINGLE_UNIT (1 item) and BUNDLE (2+ items).
// The actual AuctionUnitType is derived automatically from item count.

type UiUnitCategory = 'ATOMIC' | 'MULTI_UNIT' | 'LOT' | '';

export interface Step2State {
  /** The UI selection — ATOMIC collapses SINGLE_UNIT + BUNDLE */
  unitCategory: UiUnitCategory;
  /** Derived real type sent to API */
  unitType: AuctionUnitType | '';
  openingPrice: string;
  // Atomic — one or more listings
  item: string; // first (or only) listing id
  itemName: string;
  itemSummary: ListingSummaryVM | null;
  itemQuantity: string; // quantity for SINGLE_UNIT / first bundle item
  items: string[]; // bundle ids (index 0 = same as item)
  itemNames: string[];
  itemSummaries: ListingSummaryVM[];
  itemQuantities: string[]; // per-item quantity for bundle
  // Non-atomic (MULTI_UNIT / LOT)
  multiItems: string[];
  multiItemNames: string[];
  multiItemSummaries: ListingSummaryVM[];
  categories: string[];
  subCategories: string[];
  tags: string[];
}

export const initialStep2: Step2State = {
  unitCategory: 'ATOMIC',
  unitType: '',
  openingPrice: '',
  item: '',
  itemName: '',
  itemSummary: null,
  itemQuantity: '1',
  items: [],
  itemNames: [],
  itemSummaries: [],
  itemQuantities: [],
  multiItems: [],
  multiItemNames: [],
  multiItemSummaries: [],
  categories: [],
  subCategories: [],
  tags: [],
};

/** Derives the real AuctionUnitType from the atomic item list length */
function deriveAtomicType(itemCount: number): AuctionUnitType {
  return itemCount <= 1 ? 'SINGLE_UNIT' : 'BUNDLE';
}

function clampQuantity(value: string, min = 1, max?: number): string {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return String(min);
  if (max !== undefined) {
    return String(Math.min(Math.max(parsed, min), max));
  }
  return String(Math.max(parsed, min));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuctionStep2UnitsProps {
  form: Step2State;
  onChange: (updates: Partial<Step2State>) => void;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  unitTypes: SelectOption[];
  loadingUnitTypes: boolean;
  precision: number;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip?: () => void;
  submitLabel?: string;
  submitWithArrow?: boolean;
}

export function AuctionStep2Units({
  form,
  onChange,
  fieldErrors,
  generalError,
  saving,
  unitTypes,
  precision,
  onSubmit,
  onBack,
  onSkip,
  submitLabel = 'Save & Continue',
  submitWithArrow = false,
}: AuctionStep2UnitsProps) {
  // ── Hydrate summaries/names for all atomic items that are missing one ────────
  // Covers edit mode (items loaded from API with no summaries) and the normal
  // add flow (addAtomicItem already sets summaries, so nothing is fetched).
  useEffect(() => {
    if (!form.items.length) return;
    const missing = form.items
      .map((id, i) => ({ id, i }))
      .filter(({ i }) => !form.itemSummaries[i]);
    if (!missing.length) return;

    Promise.all(
      missing.map(({ id }) =>
        listingsApi.getListingById(id).then((listing) => {
          const thumbnailBlob = listing.blobs?.find((b) => b.metadata?.['thumbnail'] === 'true');
          return {
            summary: {
              id: listing.id,
              name: listing.name,
              description: listing.description,
              availableQuantity: listing.quantity?.available ?? undefined,
              thumbnailId: thumbnailBlob?.id ?? null,
            } as ListingSummaryVM,
            listing,
          };
        }),
      ),
    )
      .then((results) => {
        const newSummaries = [...form.itemSummaries];
        const newNames = [...form.itemNames];
        let cats = [...form.categories];
        let subCats = [...form.subCategories];
        let tags = [...form.tags];

        missing.forEach(({ i }, fi) => {
          const { summary, listing } = results[fi]!;
          newSummaries[i] = summary;
          newNames[i] = summary.name;
          if (listing.category?.id) cats = [...new Set([...cats, listing.category.id])];
          const subCat = listing.subCategory;
          const subCatId =
            typeof subCat === 'object' && subCat
              ? subCat.id
              : typeof subCat === 'string'
                ? subCat
                : '';
          if (subCatId) subCats = [...new Set([...subCats, subCatId])];
          tags = [...new Set([...tags, ...(listing.tags ?? [])])];
        });

        onChange({
          itemSummaries: newSummaries,
          itemNames: newNames,
          ...(newSummaries[0] ? { itemSummary: newSummaries[0], itemName: newNames[0] } : {}),
          categories: cats,
          subCategories: subCats,
          tags,
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.items.join(',')]);

  // ── Atomic helpers ─────────────────────────────────────────────────────────

  /** Add a listing to the atomic bundle list */
  const addAtomicItem = async (
    id: string,
    name: string,
    summary: ListingSummaryVM,
    quantity = '1',
  ) => {
    if (form.items.includes(id)) return;
    const newItems = [...form.items, id];
    const newNames = [...form.itemNames, name];
    const newSummaries = [...form.itemSummaries, summary];
    const newQtys = [...form.itemQuantities, quantity];

    let cats = [...form.categories];
    let subCats = [...form.subCategories];
    let tags = [...form.tags];
    try {
      const listing = await listingsApi.getListingById(id);
      if (listing.category?.id) cats = [...new Set([...cats, listing.category.id])];
      const subCat = listing.subCategory;
      const subCatId =
        typeof subCat === 'object' && subCat ? subCat.id : typeof subCat === 'string' ? subCat : '';
      if (subCatId) subCats = [...new Set([...subCats, subCatId])];
      tags = [...new Set([...tags, ...(listing.tags ?? [])])];
    } catch {}

    onChange({
      item: newItems[0] ?? '',
      itemName: newNames[0] ?? '',
      itemSummary: newSummaries[0] ?? null,
      itemQuantity: newQtys[0] ?? '1',
      items: newItems,
      itemNames: newNames,
      itemSummaries: newSummaries,
      itemQuantities: newQtys,
      unitType: deriveAtomicType(newItems.length),
      categories: cats,
      subCategories: subCats,
      tags,
    });
  };

  const removeAtomicItem = (idx: number) => {
    const newItems = form.items.filter((_, i) => i !== idx);
    const newNames = form.itemNames.filter((_, i) => i !== idx);
    const newSummaries = form.itemSummaries.filter((_, i) => i !== idx);
    const newQtys = form.itemQuantities.filter((_, i) => i !== idx);
    onChange({
      item: newItems[0] ?? '',
      itemName: newNames[0] ?? '',
      itemSummary: newSummaries[0] ?? null,
      itemQuantity: newQtys[0] ?? '1',
      items: newItems,
      itemNames: newNames,
      itemSummaries: newSummaries,
      itemQuantities: newQtys,
      unitType: deriveAtomicType(newItems.length),
    });
  };

  // ── Non-atomic helpers ─────────────────────────────────────────────────────

  const addMultiItem = async (id: string, name: string, summary: ListingSummaryVM) => {
    if (form.multiItems.includes(id)) return;

    let cats = [...form.categories];
    let subCats = [...form.subCategories];
    let tags = [...form.tags];
    try {
      const listing = await listingsApi.getListingById(id);
      if (listing.category?.id) cats = [...new Set([...cats, listing.category.id])];
      const subCat = listing.subCategory;
      const subCatId =
        typeof subCat === 'object' && subCat ? subCat.id : typeof subCat === 'string' ? subCat : '';
      if (subCatId) subCats = [...new Set([...subCats, subCatId])];
      tags = [...new Set([...tags, ...(listing.tags ?? [])])];
    } catch {}

    onChange({
      multiItems: [...form.multiItems, id],
      multiItemNames: [...form.multiItemNames, name],
      multiItemSummaries: [...form.multiItemSummaries, summary],
      categories: cats,
      subCategories: subCats,
      tags,
    });
  };

  const removeMultiItem = (idx: number) =>
    onChange({
      multiItems: form.multiItems.filter((_, i) => i !== idx),
      multiItemNames: form.multiItemNames.filter((_, i) => i !== idx),
      multiItemSummaries: form.multiItemSummaries.filter((_, i) => i !== idx),
    });

  const isAtomic = form.unitCategory === 'ATOMIC';
  const isNonAtomic = form.unitCategory === 'MULTI_UNIT' || form.unitCategory === 'LOT';
  const selectedUnitLabel =
    form.unitCategory === 'ATOMIC'
      ? 'Atomic (single item or bundle)'
      : (unitTypes.find((opt) => opt.value === form.unitCategory)?.label ?? form.unitCategory);

  const updateAtomicQuantity = (idx: number, delta: number) => {
    const current = parseInt(form.itemQuantities[idx] ?? '1', 10);
    const max = form.itemSummaries[idx]?.availableQuantity;
    const next = clampQuantity(String(current + delta), 1, max);
    const nextQuantities = [...form.itemQuantities];
    nextQuantities[idx] = next;
    onChange({ itemQuantities: nextQuantities });
    if (idx === 0) onChange({ itemQuantity: next });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <DismissibleError message={generalError} />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionHeading>Auction Unit</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unit Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Unit Type <span className="text-destructive">*</span>
            </Label>
            <input
              type="text"
              readOnly
              value={selectedUnitLabel}
              className="w-full rounded-md border border-input bg-muted px-3 py-[7px] text-sm text-muted-foreground cursor-default"
            />
            {/* Show derived type badge for Atomic */}
            {isAtomic && form.unitType && (
              <p className="text-[11px] text-muted-foreground">
                Derived:{' '}
                <span className="font-medium text-foreground">
                  {form.unitType === 'SINGLE_UNIT' ? 'Single Unit' : 'Bundle'}
                </span>
                {form.unitType === 'SINGLE_UNIT'
                  ? ' — one item selected'
                  : ` — ${form.items.length} items`}
              </p>
            )}
            <FieldError message={fieldErrors.unitType} />
          </div>

          {/* Opening Price */}
          <div className="space-y-1.5">
            <Label htmlFor="openingPrice" className="text-sm font-medium">
              {isAtomic && form.items.length > 1 ? 'Total Opening Price' : 'Opening Price'}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="openingPrice"
              type="number"
              min={0}
              step={precision > 0 ? (1 / Math.pow(10, precision)).toFixed(precision) : '1'}
              value={form.openingPrice}
              onChange={(e) => onChange({ openingPrice: e.target.value })}
              placeholder={precision > 0 ? `0.${'0'.repeat(precision)}` : '0'}
            />
            <FieldError message={fieldErrors.openingPrice} />
          </div>
        </div>

        {/* ── Atomic items ─────────────────────────────────────────────────── */}
        {isAtomic && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Listing <span className="text-destructive">*</span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (1 item = Single Unit · 2+ items = Bundle)
              </span>
            </Label>

            {/* Search to add more */}
            <ListingSearchField
              addMode
              onSelect={(id, name, summary, quantity) => addAtomicItem(id, name, summary, quantity)}
            />

            {/* Selected items table */}
            {form.items.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-10" />
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Description
                      </th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-16">
                        Qty
                      </th>
                      <th className="px-2 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {form.items.map((itemId, i) => {
                      const s = form.itemSummaries[i];
                      const qty = form.itemQuantities[i] ?? '1';
                      return (
                        <tr key={itemId} className="bg-card">
                          <td className="px-3 py-2">
                            {s?.thumbnailId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={blobsApi.getDownloadUrl(s.thumbnailId)}
                                alt=""
                                className="w-8 h-8 rounded object-cover border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground truncate max-w-[150px]">
                              {s?.name || form.itemNames[i] || itemId}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {itemId.slice(-8)}
                            </p>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {s?.description ?? '—'}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateAtomicQuantity(i, -1)}
                                disabled={parseInt(qty, 10) <= 1}
                                className="h-6 w-6 rounded border border-border text-sm disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="min-w-6 text-sm font-medium text-foreground">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateAtomicQuantity(i, 1)}
                                disabled={
                                  s?.availableQuantity !== undefined &&
                                  parseInt(qty, 10) >= s.availableQuantity
                                }
                                className="h-6 w-6 rounded border border-border text-sm disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`/admin/listings/${itemId}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeAtomicItem(i)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <FieldError message={fieldErrors.item} />
          </div>
        )}

        {/* ── Non-atomic (MULTI_UNIT / LOT) items ──────────────────────────── */}
        {isNonAtomic && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Listings <span className="text-destructive">*</span>
            </Label>

            <ListingSearchField
              addMode
              onSelect={(id, name, summary) => addMultiItem(id, name, summary)}
            />

            {form.multiItems.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-10" />
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Avail.
                      </th>
                      <th className="px-2 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {form.multiItems.map((itemId, i) => {
                      const s = form.multiItemSummaries[i];
                      return (
                        <tr key={itemId} className="bg-card">
                          <td className="px-3 py-2">
                            {s?.thumbnailId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={blobsApi.getDownloadUrl(s.thumbnailId)}
                                alt=""
                                className="w-8 h-8 rounded object-cover border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground truncate max-w-[150px]">
                              {s?.name || form.multiItemNames[i] || itemId}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {itemId.slice(-8)}
                            </p>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {s?.description ?? '—'}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs font-medium">
                              {s?.availableQuantity ?? '—'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`/admin/listings/${itemId}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeMultiItem(i)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <FieldError message={fieldErrors.item} />
          </div>
        )}
      </div>

      <TagsCategorySection
        value={{ categories: form.categories, subCategories: form.subCategories, tags: form.tags }}
        onChange={(patch) => onChange(patch)}
      />

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={saving}
            className="gap-2"
          >
            Skip <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {submitLabel}
                {submitWithArrow && <ArrowRight className="h-4 w-4" />}
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
