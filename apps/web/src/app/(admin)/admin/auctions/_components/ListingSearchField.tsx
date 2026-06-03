'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  listingsApi,
  masterApi,
  blobsApi,
  ListingSummaryVM,
  CategoryVM,
  SubCategoryVM,
} from '@repo/api';
import { Search, X, ChevronDown, Loader2, Eye, Package } from 'lucide-react';
import { Input } from '@repo/ui';

interface Props {
  /** Currently selected listing ID (ignored in addMode) */
  value?: string;
  /** Display name for the selected listing (ignored in addMode) */
  displayName?: string;
  onSelect: (id: string, name: string, summary: ListingSummaryVM) => void;
  onClear?: () => void;
  /**
   * addMode=true: always shows the search UI (used for multi-select).
   * addMode=false (default): shows a chip when a value is selected.
   */
  addMode?: boolean;
}

export function ListingSearchField({
  value,
  displayName,
  onSelect,
  onClear,
  addMode = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingSummaryVM[]>([]);
  const [searching, setSearching] = useState(false);

  // Filters
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subCategories, setSubCategories] = useState<SubCategoryVM[]>([]);
  const [selectedSubCats, setSelectedSubCats] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories once
  useEffect(() => {
    masterApi
      .getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    setSelectedSubCats([]);
    setSubCategories([]);
    if (!selectedCategory) return;
    masterApi
      .getSubCategoriesByCategory(selectedCategory)
      .then(setSubCategories)
      .catch(() => {});
  }, [selectedCategory]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback((q: string, cats: string[], subCats: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await listingsApi.getListingsSummary({
          phrases: q.trim() ? [q.trim()] : [],
          categories: cats,
          subCategories: subCats,
        });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    runSearch(q, selectedCategory ? [selectedCategory] : [], selectedSubCats);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubCats([]);
    runSearch(query, catId ? [catId] : [], []);
  };

  const toggleSubCat = (id: string) => {
    const next = selectedSubCats.includes(id)
      ? selectedSubCats.filter((x) => x !== id)
      : [...selectedSubCats, id];
    setSelectedSubCats(next);
    runSearch(query, selectedCategory ? [selectedCategory] : [], next);
  };

  const handleFocus = () => {
    setOpen(true);
    if (!results.length) {
      runSearch(query, selectedCategory ? [selectedCategory] : [], selectedSubCats);
    }
  };

  const handleSelect = (item: ListingSummaryVM) => {
    onSelect(item.id, item.name, item);
    setQuery('');
    setResults([]);
    // In addMode keep open so user can add another; in single mode close
    if (!addMode) setOpen(false);
  };

  // ── Selected chip (single-select mode only) ───────────────────────────────────
  if (!addMode && value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5">
        <Package className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName || value}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{value}</p>
        </div>
        <a
          href={`/admin/listings/${value}/view`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="View listing"
        >
          <Eye className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ── Search UI ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="space-y-2">
      {/* Filters */}
      <div className="flex gap-2">
        {/* Category */}
        <div className="relative flex-1">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-[6px] text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Sub-categories (multi-pill) */}
      {subCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subCategories.map((sc) => {
            const sel = selectedSubCats.includes(sc.id);
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => toggleSubCat(sc.id)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  sel
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search listing by name..."
          className="pl-8 text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results table */}
      {open && (
        <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {searching && !results.length ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted-foreground">No listings found</p>
          ) : (
            <div className="overflow-x-auto">
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
                    <th className="px-3 py-2 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {results.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleSelect(item)}
                    >
                      {/* Thumbnail */}
                      <td className="px-3 py-2">
                        {item.thumbnailId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={blobsApi.getDownloadUrl(item.thumbnailId)}
                            alt=""
                            className="w-8 h-8 rounded object-cover border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground truncate max-w-[180px]">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.id.slice(-8)}
                        </p>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.description ?? '—'}
                        </p>
                      </td>

                      {/* Available qty */}
                      <td className="px-3 py-2 text-right">
                        <span className="text-xs font-medium text-foreground">
                          {item.availableQuantity ?? '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/admin/listings/${item.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="View listing"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="p-1 text-primary hover:opacity-80 transition-opacity font-bold text-base leading-none"
                            title="Select"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
