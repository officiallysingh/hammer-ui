'use client';

import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Eye, Loader2, Package, Trash2 } from 'lucide-react';
import { listingsApi, blobsApi, AuctionUnitType, ListingSummaryVM } from '@repo/api';
import { Button, Input, Label } from '@repo/ui';
import { FieldError, SectionHeading, SelectOption } from './AuctionShared';
import { ListingSearchField } from './ListingSearchField';
import { TagsCategorySection } from './TagsCategorySection';

export interface Step2State {
  unitType: AuctionUnitType | '';
  openingPrice: string;
  item: string;
  itemName: string;
  itemSummary: ListingSummaryVM | null;
  items: string[];
  itemNames: string[];
  itemSummaries: ListingSummaryVM[];
  categories: string[];
  subCategories: string[];
  tags: string[];
}

export const initialStep2: Step2State = {
  unitType: '',
  openingPrice: '',
  item: '',
  itemName: '',
  itemSummary: null,
  items: [],
  itemNames: [],
  itemSummaries: [],
  categories: [],
  subCategories: [],
  tags: [],
};

function ListingCard({
  summary,
  listingId,
  onClear,
}: {
  summary: ListingSummaryVM;
  listingId?: string;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
      {summary.thumbnailId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blobsApi.getDownloadUrl(summary.thumbnailId)}
          alt=""
          className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{summary.name}</p>
        {summary.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{summary.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Available:{' '}
          <span className="font-medium text-foreground">{summary.availableQuantity ?? '—'}</span>
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={`/admin/listings/${listingId ?? summary.id}/view`}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="View listing"
        >
          <Eye className="h-4 w-4" />
        </a>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

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
  loadingUnitTypes,
  precision,
  onSubmit,
  onBack,
  onSkip,
  submitLabel = 'Save & Continue',
  submitWithArrow = false,
}: AuctionStep2UnitsProps) {
  // Pre-populate categories/subcategories/tags when SINGLE_UNIT item is selected
  useEffect(() => {
    if (!form.item) return;
    listingsApi
      .getListingById(form.item)
      .then((listing) => {
        const subCat = listing.subCategory;
        const subCatId =
          typeof subCat === 'object' && subCat
            ? subCat.id
            : typeof subCat === 'string'
              ? subCat
              : '';
        onChange({
          categories: listing.category?.id ? [listing.category.id] : [],
          subCategories: subCatId ? [subCatId] : [],
          tags: listing.tags ?? [],
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item]);

  // Merge categories/subcategories/tags when a new multi-unit listing is added
  useEffect(() => {
    if (!form.items.length || form.unitType === 'SINGLE_UNIT') return;
    const last = form.items[form.items.length - 1];
    if (!last) return;
    listingsApi
      .getListingById(last)
      .then((listing) => {
        const subCat = listing.subCategory;
        const subCatId =
          typeof subCat === 'object' && subCat
            ? subCat.id
            : typeof subCat === 'string'
              ? subCat
              : '';
        onChange({
          categories: listing.category?.id
            ? [...new Set([...form.categories, listing.category.id])]
            : form.categories,
          subCategories: subCatId
            ? [...new Set([...form.subCategories, subCatId])]
            : form.subCategories,
          tags: [...new Set([...form.tags, ...(listing.tags ?? [])])],
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.items.length]);

  const removeItem = (idx: number) =>
    onChange({
      items: form.items.filter((_, i) => i !== idx),
      itemNames: form.itemNames.filter((_, i) => i !== idx),
      itemSummaries: form.itemSummaries.filter((_, i) => i !== idx),
    });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
        </div>
      )}

      {/* Unit Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionHeading>Auction Unit</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Unit Type <span className="text-destructive">*</span>
            </Label>
            <select
              value={form.unitType}
              onChange={(e) =>
                onChange({
                  unitType: e.target.value as AuctionUnitType,
                  item: '',
                  itemName: '',
                  items: [],
                  itemNames: [],
                })
              }
              disabled={loadingUnitTypes}
              className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">{loadingUnitTypes ? 'Loading...' : 'Select type...'}</option>
              {unitTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.unitType} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="openingPrice" className="text-sm font-medium">
              Opening Price <span className="text-destructive">*</span>
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

        {form.unitType && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {form.unitType === 'SINGLE_UNIT' ? 'Listing' : 'Listings'}{' '}
              <span className="text-destructive">*</span>
            </Label>

            {form.unitType === 'SINGLE_UNIT' ? (
              <>
                {form.itemSummary && (
                  <ListingCard
                    summary={form.itemSummary}
                    listingId={form.item}
                    onClear={() =>
                      onChange({
                        item: '',
                        itemName: '',
                        itemSummary: null,
                        categories: [],
                        subCategories: [],
                        tags: [],
                      })
                    }
                  />
                )}
                {!form.item && (
                  <ListingSearchField
                    value=""
                    displayName=""
                    onSelect={(id, name, summary) =>
                      onChange({ item: id, itemName: name, itemSummary: summary })
                    }
                  />
                )}
              </>
            ) : (
              <>
                {form.itemSummaries.length > 0 && (
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
                            Qty
                          </th>
                          <th className="px-2 py-2 w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {form.items.map((itemId, i) => {
                          const s = form.itemSummaries[i];
                          return (
                            <tr key={i} className="bg-card">
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
                                    onClick={() => removeItem(i)}
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
                <ListingSearchField
                  addMode
                  onSelect={(id, name, summary) => {
                    if (!form.items.includes(id)) {
                      onChange({
                        items: [...form.items, id],
                        itemNames: [...form.itemNames, name],
                        itemSummaries: [...form.itemSummaries, summary],
                      });
                    }
                  }}
                />
              </>
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
