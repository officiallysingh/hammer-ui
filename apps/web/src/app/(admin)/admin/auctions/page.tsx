'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Eye, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Badge } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';

/** Normalises API fields that arrive as either a plain string or a { KEY: "Label" } object. */
function resolveStr(value?: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

function formatLabel(value?: unknown) {
  const str = resolveStr(value);
  if (!str) return '—';
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function DirectionBadge({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isForward = str === 'FORWARD';
  return (
    <Badge
      variant="outline"
      className={`text-xs ${isForward ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}
    >
      {formatLabel(str)}
    </Badge>
  );
}

function AccessibilityBadge({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isPublic = str === 'PUBLIC';
  return (
    <Badge
      variant="outline"
      className={`text-xs ${isPublic ? 'border-blue-500 text-blue-600' : 'border-violet-500 text-violet-600'}`}
    >
      {formatLabel(str)}
    </Badge>
  );
}

export default function AuctionsPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchAuctions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auctionsApi.getAuctions();
      setAuctions(result.content ?? []);
    } catch {
      setError('Failed to load auctions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await auctionsApi.deleteAuction(id);
      setAuctions((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete auction.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<AuctionVM>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium text-sm text-foreground">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'referenceId',
      header: 'Reference ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.referenceId ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{formatLabel(row.original.format)}</span>
      ),
    },
    {
      id: 'accessibility',
      header: 'Accessibility',
      cell: ({ row }) => <AccessibilityBadge value={row.original.protocol?.accessibility} />,
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: ({ row }) => <DirectionBadge value={row.original.protocol?.direction} />,
    },
    {
      id: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {resolveStr(row.original.monetaryOptions?.currencyUnit) || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatLabel(row.original.status)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="View auction">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit auction">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/auctions/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete auction">
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
        title="Auctions"
        description="Manage auctions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/auctions/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New auction
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAuctions} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <DataTable
        data={auctions}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No auctions found."
        hideSearch
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete auction?"
        description="This will permanently remove the auction."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
