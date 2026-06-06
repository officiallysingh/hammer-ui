'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';

const TYPE_COLORS: Record<string, string> = {
  ENTITY: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  LISTING_PROPERTIES: 'bg-primary/10 text-primary border-primary/20',
  AUCTION_PROPERTIES: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  WORKFLOW_STEP_FORM: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function MetadataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [types, setTypes] = useState<ManagedTypeVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Filter state — initialised from URL
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [selectedType, setSelectedType] = useState<string>(() => searchParams.get('type') ?? '');

  // Type options fetched from API
  const [typeOptions, setTypeOptions] = useState<{ key: string; label: string }[]>([]);
  // Map key → human-readable label for the table column
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    metadataApi
      .getManagedTypeTypes()
      .then((pairs) => {
        setTypeOptions(pairs.map((p) => ({ key: p.key, label: p.value })));
        setTypeLabels(Object.fromEntries(pairs.map((p) => [p.key, p.value])));
      })
      .catch(() => {});
  }, []);

  const fetchTypes = async (ph?: string[], type?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await metadataApi.getManagedTypes({
        phrases: ph?.length ? ph : undefined,
        type: (type || undefined) as ManagedTypeType | undefined,
        expand: true,
      });
      setTypes(result.content ?? []);
    } catch {
      setError('Failed to load managed types.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes(searchParams.getAll('phrases'), searchParams.get('type') ?? undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildUrl = (ph: string[], type: string) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    if (type) params.set('type', type);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(buildUrl(phrases, selectedType), { scroll: false });
    fetchTypes(phrases.length ? phrases : undefined, selectedType || undefined);
  };

  const handleReset = () => {
    setPhrases([]);
    setSelectedType('');
    router.replace('', { scroll: false });
    fetchTypes([], undefined);
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
      cell: ({ row }) => {
        const key = row.original.type as string;
        const label = typeLabels[key] ?? key;
        const colorClass = TYPE_COLORS[key] ?? 'bg-muted text-muted-foreground border-border';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      id: 'properties',
      header: 'Properties',
      cell: ({ row }) => (
        <TagList
          tags={(row.original.properties ?? []).map((p) => {
            const metaTypeLabel = Object.keys(p.metaType)[0] || '';

            const formattedLabel = metaTypeLabel
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase());

            return {
              id: p.name,
              label: `${p.label} (${formattedLabel})`,
            };
          })}
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
              onClick={() =>
                fetchTypes(phrases.length ? phrases : undefined, selectedType || undefined)
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

      <PhraseSearchBar
        phrases={phrases}
        onPhrasesChange={setPhrases}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="Search types..."
        extraFilters={
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
          >
            <option value="">All types</option>
            {typeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        }
      />

      <DataTable
        data={types}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No managed types found."
        hideSearch
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
