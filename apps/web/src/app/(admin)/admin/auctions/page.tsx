'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionVM } from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  ArrowUp,
  ArrowDown,
  Lock,
  Globe,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Badge, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatDate, formatLabel, resolveStr } from '@/components/common/admin/format';

// ── Direction icon with tooltip ───────────────────────────────────────────────

function DirectionCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isForward = str === 'FORWARD';
  const Icon = isForward ? ArrowUp : ArrowDown;
  const label = formatLabel(str);
  const detail = isForward
    ? 'Buyers bid upward — highest price wins'
    : 'Sellers bid downward — lowest price wins';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isForward
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Accessibility icon with tooltip ──────────────────────────────────────────

function AccessibilityCell({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;
  const isPublic = str === 'PUBLIC';
  const Icon = isPublic ? Globe : Lock;
  const label = formatLabel(str);
  const detail = isPublic
    ? 'Open to all participants — no invite required'
    : 'Restricted access — participants must be invited';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 cursor-default rounded-full px-2 py-0.5 text-xs font-medium border ${
            isPublic
              ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
              : 'bg-violet-500/10 text-violet-700 border-violet-500/30'
          }`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs text-center">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Protocol details cell (participant + offer visibility) ────────────────────

function ProtocolDetailsCell({ auction }: { auction: AuctionVM }) {
  const participantVis = resolveStr(auction.protocol?.participantVisibility);
  const offerVis = resolveStr(auction.protocol?.offerVisibility);
  if (!participantVis && !offerVis) return <span className="text-xs text-muted-foreground">—</span>;

  const participantLabel = participantVis ? formatLabel(participantVis) : null;
  const offerLabel = offerVis ? formatLabel(offerVis) : null;

  const tooltipContent = (
    <div className="space-y-2 text-xs min-w-[180px]">
      {participantLabel && (
        <div>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <Users className="h-3 w-3" /> Participant Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Identity visible to everyone</p>
          <p className="font-medium">{participantLabel}</p>
        </div>
      )}
      {offerLabel && (
        <div className={participantLabel ? 'pt-1.5 border-t border-border/40' : ''}>
          <p className="font-semibold text-foreground/80 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Offer Visibility
          </p>
          <p className="text-muted-foreground mt-0.5">Both price and rank visible to everyone</p>
          <p className="font-medium">{offerLabel}</p>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-3">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuctionsPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchAuctions = async (page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auctionsApi.getAuctions({ page, size: PAGE_SIZE });
      setAuctions(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
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
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
            className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left truncate max-w-[200px] block"
          >
            {row.original.title}
          </button>
          {row.original.referenceId && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {row.original.referenceId}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'format',
      header: 'Format / Type',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="text-sm text-foreground">{formatLabel(row.original.format)}</div>
          {row.original.type && (
            <div className="text-[11px] text-muted-foreground">
              {formatLabel(row.original.type)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'accessibility',
      header: 'Access',
      cell: ({ row }) => <AccessibilityCell value={row.original.protocol?.accessibility} />,
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: ({ row }) => <DirectionCell value={row.original.protocol?.direction} />,
    },
    {
      id: 'protocol',
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 cursor-default">
              Protocol <Info className="h-3 w-3 text-muted-foreground/60" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Participant &amp; offer visibility details
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => <ProtocolDetailsCell auction={row.original} />,
    },
    // {
    //   id: 'schedule',
    //   header: 'Schedule',
    //   cell: ({ row }) => {
    //     const start = row.original.schedule?.startTime;
    //     const end = row.original.schedule?.endTime;
    //     if (!start && !end) return <span className="text-xs text-muted-foreground">—</span>;
    //     return (
    //       <div className="space-y-0.5 text-xs">
    //         {start && (
    //           <div className="flex items-center gap-1 text-foreground">
    //             <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
    //             {formatDate(start)}
    //           </div>
    //         )}
    //         {end && <div className="text-muted-foreground pl-4">{formatDate(end)}</div>}
    //       </div>
    //     );
    //   },
    // },
    {
      id: 'currency',
      header: 'Currency',
      cell: ({ row }) => {
        const curr = resolveStr(row.original.monetaryOptions?.currencyUnit);
        if (!curr) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-foreground">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            {curr}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge value={row.original.status} size="sm" showIcon={false} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5 justify-end">
          <Tip label="View">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/auctions/${row.original.id}/view`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/auctions/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuctions(pageIndex)}
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
        data={auctions}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No auctions found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={fetchAuctions}
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
