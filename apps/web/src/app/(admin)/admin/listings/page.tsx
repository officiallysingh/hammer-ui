'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listingsApi,
  masterApi,
  blobsApi,
  ListingVM,
  ListingBlobRef,
  ListingCategoryRef,
  CategoryVM,
} from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Pencil,
  ImageIcon,
  Film,
  FileText,
  Download,
  Search,
  X,
  Eye,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';

type MediaType = 'image' | 'video' | 'doc';

interface MediaModalState {
  blobs: ListingBlobRef[];
  mediaType: MediaType;
}

interface SelectOption {
  label: string;
  value: string;
}

function classifyBlob(blob: ListingBlobRef): MediaType {
  const mt = blob.mediaType ?? '';
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  return 'doc';
}

function CategoryCell({ icon, name }: { icon?: string; name: string }) {
  const IconComp = icon ? ICON_REGISTRY[icon] : null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-foreground">
      {IconComp && <IconComp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      {name}
    </div>
  );
}

function MediaCountBadge({
  blobs,
  type,
  onClick,
}: {
  blobs: ListingBlobRef[];
  type: MediaType;
  onClick: () => void;
}) {
  const filtered = blobs.filter((b) => classifyBlob(b) === type);
  if (!filtered.length) return null;

  const Icon = type === 'image' ? ImageIcon : type === 'video' ? Film : FileText;
  const label = type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Docs';
  const colorClass =
    type === 'image'
      ? 'text-blue-600 hover:text-blue-700'
      : type === 'video'
        ? 'text-purple-600 hover:text-purple-700'
        : 'text-amber-600 hover:text-amber-700';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-medium ${colorClass} hover:underline`}
    >
      <Icon className="h-3 w-3" />
      {label}: {filtered.length}
    </button>
  );
}

function MediaModal({ modal, onClose }: { modal: MediaModalState; onClose: () => void }) {
  const { blobs, mediaType } = modal;
  const filtered = blobs.filter((b) => classifyBlob(b) === mediaType);
  const title = mediaType === 'image' ? 'Images' : mediaType === 'video' ? 'Videos' : 'Documents';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {mediaType === 'image' && (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((blob) => (
              <div
                key={blob.id}
                className="rounded-lg overflow-hidden border border-border group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blobsApi.getDownloadUrl(blob.id)}
                  alt={blob.fileName ?? blob.id}
                  className="w-full h-48 object-cover"
                />
                <div className="p-2 flex items-center justify-between bg-muted/50">
                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                    {blob.fileName ?? blob.id}
                  </span>
                  <a
                    href={blobsApi.getDownloadUrl(blob.id)}
                    download={blob.fileName ?? true}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {mediaType === 'video' && (
          <div className="space-y-3">
            {filtered.map((blob) => (
              <div key={blob.id} className="rounded-lg overflow-hidden border border-border">
                <video
                  controls
                  className="w-full max-h-64 bg-black"
                  src={blobsApi.getDownloadUrl(blob.id)}
                />
                <div className="p-2 flex items-center justify-between bg-muted/50">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {blob.fileName ?? blob.id}
                  </span>
                  <a
                    href={blobsApi.getDownloadUrl(blob.id)}
                    download={blob.fileName ?? true}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {mediaType === 'doc' && (
          <div className="space-y-2">
            {filtered.map((blob) => (
              <div
                key={blob.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-foreground truncate">
                    {blob.fileName ?? blob.id}
                  </span>
                  {blob.size && (
                    <span className="text-xs text-muted-foreground shrink-0">({blob.size})</span>
                  )}
                </div>
                <a
                  href={blobsApi.getDownloadUrl(blob.id)}
                  download={blob.fileName ?? true}
                  className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const reactSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '2.25rem',
    fontSize: '0.875rem',
    '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
  }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'hsl(var(--background))',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
    zIndex: 50,
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
};

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ListingVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);

  // Filter state — initialised from URL params
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [availableFilter, setAvailableFilter] = useState<'all' | 'true' | 'false'>(
    () => (searchParams.get('available') as 'all' | 'true' | 'false') ?? 'all',
  );
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<CategoryVM[]>([]);

  useEffect(() => {
    const catIds = searchParams.getAll('categories');
    const subCatIds = searchParams.getAll('subCategories');
    masterApi
      .getCategories(true)
      .then((cats) => {
        setCategories(cats);
        if (catIds.length) {
          setSelectedCategories(
            cats.filter((c) => catIds.includes(c.id)).map((c) => ({ label: c.name, value: c.id })),
          );
        }
        if (subCatIds.length) {
          const allSubs = cats.flatMap((c) => c.subCategories ?? []);
          setSelectedSubCategories(
            allSubs
              .filter((s) => subCatIds.includes(s.id))
              .map((s) => ({ label: s.name, value: s.id })),
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions: SelectOption[] = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const subCategoryOptions: SelectOption[] = selectedCategories.length
    ? selectedCategories.flatMap((opt) => {
        const cat = categories.find((c) => c.id === opt.value);
        return (cat?.subCategories ?? []).map((s) => ({ label: s.name, value: s.id }));
      })
    : categories.flatMap((c) =>
        (c.subCategories ?? []).map((s) => ({ label: s.name, value: s.id })),
      );

  const fetchListings = async (opts?: {
    phrases?: string[];
    available?: boolean;
    categories?: string[];
    subCategories?: string[];
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listingsApi.getListings({
        phrases: opts?.phrases?.length ? opts.phrases : undefined,
        available: opts?.available,
        categories: opts?.categories?.length ? opts.categories : undefined,
        subCategories: opts?.subCategories?.length ? opts.subCategories : undefined,
      });
      setListings(result.content ?? []);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on mount using any pre-existing URL params
    fetchListings({
      phrases: searchParams.getAll('phrases'),
      available: (() => {
        const av = searchParams.get('available');
        return av === 'true' ? true : av === 'false' ? false : undefined;
      })(),
      categories: searchParams.getAll('categories'),
      subCategories: searchParams.getAll('subCategories'),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (
    ph: string[],
    avail: 'all' | 'true' | 'false',
    cats: SelectOption[],
    subs: SelectOption[],
  ) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    if (avail !== 'all') params.set('available', avail);
    cats.forEach((c) => params.append('categories', c.value));
    subs.forEach((s) => params.append('subCategories', s.value));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(
      buildFilterUrl(phrases, availableFilter, selectedCategories, selectedSubCategories),
      { scroll: false },
    );
    fetchListings({
      phrases,
      available: availableFilter === 'all' ? undefined : availableFilter === 'true',
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
    });
  };

  const handleReset = () => {
    setPhrases([]);
    setAvailableFilter('all');
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    router.replace('', { scroll: false });
    fetchListings();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await listingsApi.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError('Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<ListingVM>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/admin/listings/${row.original.id}/view`)}
          className="font-medium text-primary hover:underline text-sm text-left"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => {
        const { available, quantity } = row.original;
        if (available === undefined || available === null)
          return <span className="text-xs text-muted-foreground">—</span>;
        if (!available) return <span className="text-sm font-medium text-red-500">No</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-500">Yes</span>
            {quantity?.available != null && (
              <span className="text-xs text-muted-foreground">({quantity.available})</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const cat = row.original.category;
        if (!cat) return <span className="text-xs text-muted-foreground">—</span>;
        return <CategoryCell icon={cat.icon} name={cat.name} />;
      },
    },
    {
      id: 'subCategory',
      header: 'Sub-category',
      cell: ({ row }) => {
        const sub = row.original.subCategory;
        if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
        if (typeof sub === 'object') {
          const s = sub as ListingCategoryRef;
          return <CategoryCell icon={s.icon} name={s.name} />;
        }
        return <span className="text-sm text-foreground">{sub}</span>;
      },
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'media',
      header: 'Media',
      cell: ({ row }) => {
        const blobs = row.original.blobs ?? [];
        if (!blobs.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col gap-1">
            <MediaCountBadge
              blobs={blobs}
              type="image"
              onClick={() => setMediaModal({ blobs, mediaType: 'image' })}
            />
            <MediaCountBadge
              blobs={blobs}
              type="video"
              onClick={() => setMediaModal({ blobs, mediaType: 'video' })}
            />
            <MediaCountBadge
              blobs={blobs}
              type="doc"
              onClick={() => setMediaModal({ blobs, mediaType: 'doc' })}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="View listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/listings/${row.original.id}/view`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/listings/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(row.original.id)}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Manage auction listings"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/listings/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New listing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchListings({
                  phrases,
                  available: availableFilter === 'all' ? undefined : availableFilter === 'true',
                  categories: selectedCategories.map((o) => o.value),
                  subCategories: selectedSubCategories.map((o) => o.value),
                })
              }
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Phrases search */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search phrases</Label>
            <PhrasesInput
              value={phrases}
              onChange={setPhrases}
              placeholder="Type phrase and press Enter..."
            />
          </div>

          {/* Available */}
          <div className="min-w-[130px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Available</Label>
            <select
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value as 'all' | 'true' | 'false')}
              className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Categories */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Categories</Label>
            <Select<SelectOption, true>
              isMulti
              options={categoryOptions}
              value={selectedCategories}
              onChange={(vals: MultiValue<SelectOption>) => {
                setSelectedCategories([...vals]);
                // Clear subcategories that no longer belong to selected cats
                const catIds = new Set(vals.map((v) => v.value));
                setSelectedSubCategories((prev) =>
                  prev.filter((s) => {
                    const ownerCat = categories.find((c) =>
                      c.subCategories?.some((sc) => sc.id === s.value),
                    );
                    return ownerCat && catIds.has(ownerCat.id);
                  }),
                );
              }}
              placeholder="All categories"
              styles={reactSelectStyles as never}
            />
          </div>

          {/* Subcategories */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Sub-categories</Label>
            <Select<SelectOption, true>
              isMulti
              options={subCategoryOptions}
              value={selectedSubCategories}
              onChange={(vals: MultiValue<SelectOption>) => setSelectedSubCategories([...vals])}
              placeholder="All sub-categories"
              styles={reactSelectStyles as never}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        data={listings}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No listings found."
        hideSearch
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete listing?"
        description="This will permanently remove the listing."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      {mediaModal && <MediaModal modal={mediaModal} onClose={() => setMediaModal(null)} />}
    </div>
  );
}
