'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsApi, blobsApi, ListingVM, ListingBlobRef, ListingCategoryRef } from '@repo/api';
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
  X,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';

type MediaType = 'image' | 'video' | 'doc';

interface MediaModal {
  blobs: ListingBlobRef[];
  mediaType: MediaType;
}

function getCategoryName(listing: ListingVM): string {
  if (!listing.category) return '—';
  return `${listing.category.icon ? listing.category.icon + ' ' : ''}${listing.category.name}`;
}

function getSubCategoryName(listing: ListingVM): string {
  if (!listing.subCategory) return '—';
  if (typeof listing.subCategory === 'object') {
    const s = listing.subCategory as ListingCategoryRef;
    return `${s.icon ? s.icon + ' ' : ''}${s.name}`;
  }
  return listing.subCategory;
}

function classifyBlob(blob: ListingBlobRef): MediaType {
  const mt = blob.mediaType ?? '';
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  return 'doc';
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

function MediaModal({ modal, onClose }: { modal: MediaModal; onClose: () => void }) {
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

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  const formattedStatus = status.toUpperCase();

  let className = '';
  switch (formattedStatus) {
    case 'AVAILABLE':
      className =
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 font-semibold';
      break;
    case 'DRAFT':
      className =
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 font-semibold';
      break;
    default:
      className =
        'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10 font-semibold';
      break;
  }

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mediaModal, setMediaModal] = useState<MediaModal | null>(null);

  const fetchListings = async (phrase?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listingsApi.getListings({
        phrases: phrase ? [phrase] : undefined,
      });
      setListings(result.content ?? []);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchListings(value.trim() || undefined);
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
        <span className="font-medium text-foreground text-sm">{row.original.name}</span>
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{getCategoryName(row.original)}</span>
      ),
    },
    {
      id: 'subCategory',
      header: 'Sub-category',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{getSubCategoryName(row.original)}</span>
      ),
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
              onClick={() => fetchListings(search.trim() || undefined)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <DataTable
        data={listings}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No listings found."
        searchPlaceholder="Search listings..."
        onSearch={handleSearch}
        searchValue={search}
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
