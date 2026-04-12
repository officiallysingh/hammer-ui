'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metadataApi, ManagedTypeVM, ManagedTypeType } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';

const TYPE_COLORS: Record<ManagedTypeType, string> = {
  EMBEDDABLE: 'bg-primary/10 text-primary border-primary/20',
  ENTITY: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  FORM: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  WORKFLOW: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function MetadataPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ManagedTypeVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchTypes = async (phrase?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await metadataApi.getManagedTypes({
        phrases: phrase ? [phrase] : undefined,
      });
      setTypes(result.content ?? []);
    } catch {
      setError('Failed to load managed types.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchTypes(value.trim() || undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await metadataApi.deleteManagedType(id);
      setTypes((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to delete managed type.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<ManagedTypeVM>[] = [
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
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[row.original.type]}`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'classifier',
      header: 'Classifier',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">{row.original.classifier}</span>
      ),
    },
    {
      id: 'properties',
      header: 'Properties',
      cell: ({ row }) => (
        <TagList
          tags={(row.original.properties ?? []).map((p) => ({
            id: p.name,
            label: `${p.label} (${p.metaType})`,
          }))}
          variant="muted"
          max={2}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="Edit type">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/metadata/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete type">
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
        title="Metadata"
        description="Manage dynamic type definitions for listings"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/metadata/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New type
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTypes(search.trim() || undefined)}
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
        data={types}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No managed types found."
        searchPlaceholder="Search types..."
        onSearch={handleSearch}
        searchValue={search}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete managed type?"
        description="This will permanently remove the type definition."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
