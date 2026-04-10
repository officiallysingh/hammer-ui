'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsApi, ListingVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
    </div>
  );
}
