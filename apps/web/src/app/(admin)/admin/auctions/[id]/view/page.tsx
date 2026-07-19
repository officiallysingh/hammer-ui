'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  listingsApi,
  blobsApi,
  AuctionVM,
  AuctionUnitVM,
  AuctionWorkflowStep,
  PolicyItemRQ,
  AuctionPoliciesGroupRQ,
} from '@repo/api';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Calendar,
  DollarSign,
  Settings2,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Package,
  Info,
} from 'lucide-react';
import { Button, Badge } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { ListingViewDialog } from '../../../listings/_components/ListingViewDialog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveStr(value?: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![1] ?? entries[0]![0]);
  }
  return String(value);
}

function formatLabel(value?: unknown): string {
  const str = resolveStr(value);
  if (!str) return '—';
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value?: unknown }) {
  const str = resolveStr(value);
  if (!str) return <span className="text-xs text-muted-foreground">—</span>;

  const colorMap: Record<string, string> = {
    CREATED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    SCHEDULED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    RUNNING: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    COMPLETED: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    CANCELLED: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[str] ?? 'bg-muted text-muted-foreground border-border'}`}
    >
      {formatLabel(str)}
    </span>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5 even:bg-muted/20">
      <span className="text-xs font-medium text-muted-foreground w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground flex-1">{children}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

// ── Workflow step ─────────────────────────────────────────────────────────────

function WorkflowStepRow({ step, index }: { step: AuctionWorkflowStep; index: number }) {
  const statusType = resolveStr(step.status?.type);
  const isCompleted = statusType === 'COMPLETED';
  const isRunning = statusType === 'IN_PROGRESS' || statusType === 'RUNNING';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 ${
            isCompleted
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
              : isRunning
                ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                : 'border-border bg-muted text-muted-foreground'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isRunning ? (
            <Clock className="h-3.5 w-3.5" />
          ) : (
            index + 1
          )}
        </div>
        {index < 9 && <div className="w-px h-3 bg-border/50" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {step.name ?? formatLabel(step.type)}
          </span>
          {statusType && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : isRunning
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {formatLabel(statusType)}
            </span>
          )}
        </div>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
        {step.status?.updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {formatDateTime(step.status.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Policy group ──────────────────────────────────────────────────────────────

function formatDuration(value?: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (isoMatch) {
    const [, years, months, days, hours, minutes, seconds] = isoMatch;
    const parts: string[] = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}mo`);
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds) parts.push(`${Number(seconds).toLocaleString()}s`);
    return parts.join(' ');
  }

  return raw;
}

/** Renders a "Schedule" badge (reference + offset) shared by the timeline and list layouts */
function ScheduleBadge({ schedule }: { schedule: PolicyItemRQ['schedule'] }) {
  if (!schedule) return null;
  const offsetLabel = formatDuration(schedule.offset);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
      <Clock className="h-3 w-3" />
      {formatLabel(schedule.reference)}
      {offsetLabel ? ` + ${offsetLabel}` : ''}
    </span>
  );
}

/** Renders the "Fee Heads" breakdown for a PAYMENT_POLICY item */
function HeadsList({ heads }: { heads: PolicyItemRQ['heads'] }) {
  if (!heads?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {heads.map((h, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-[11px]"
        >
          <span className="font-medium text-foreground">{h.name || formatLabel(h.type)}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {formatLabel(h.type)}
          </Badge>
          <span className="text-muted-foreground">
            {formatLabel(h.basis)}: <span className="text-foreground">{h.value}</span>
          </span>
          {h.refundable && (
            <span className="text-emerald-600 dark:text-emerald-400">Refundable</span>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineEntryCard({
  item,
  index,
  isLast,
}: {
  item: PolicyItemRQ;
  index: number;
  isLast: boolean;
}) {
  const durationLabel = formatDuration(item.windowDuration ?? item.duration);
  const stepLabel = item.steps?.length ? item.steps.join(', ') : null;
  return (
    <div className="relative pl-8 pb-4 last:pb-0">
      <div className="absolute left-[19px] top-2.5 h-3 w-3 rounded-full border-2 border-primary/50 bg-background" />
      <div className="rounded-lg border border-border/60 bg-background/70 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {item.name || formatLabel(item.type)}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {formatLabel(item.type)}
            </Badge>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {isLast ? 'Rest of auction' : `Window ${index + 1}`}
          </span>
        </div>
        {durationLabel && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {durationLabel}
          </div>
        )}
        {item.description && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {item.value != null && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              Value: <span className="text-foreground">{item.value}</span>
            </span>
          )}
          {stepLabel && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              Steps: <span className="text-foreground">{stepLabel}</span>
            </span>
          )}
          {item.basis && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              Basis: <span className="text-foreground">{formatLabel(item.basis)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyGroupSection({ groupKey, items }: { groupKey: string; items: PolicyItemRQ[] }) {
  const isTimelineGroup =
    (groupKey.toLowerCase().includes('price') && groupKey.toLowerCase().includes('progress')) ||
    items.some((item) => Boolean(item.windowDuration) || (item.steps?.length ?? 0) > 0);

  if (isTimelineGroup) {
    return (
      <div>
        <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {formatLabel(groupKey)}
          </span>
        </div>
        <div className="relative px-4 py-3">
          <div className="absolute left-7 top-0 bottom-0 w-px bg-border/50" />
          {items.map((item, i) => {
            // Wrapper items (e.g. PRICE_PROGRESSION_POLICY) hold their own nested list —
            // render the nested windows instead of treating the wrapper as a single entry.
            if (item.priceChangePolicies?.length) {
              return (
                <div key={i} className="relative pb-4 last:pb-0">
                  {(item.name || item.description) && (
                    <div className="pl-8 mb-2">
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  )}
                  {item.priceChangePolicies.map((nested, j) => (
                    <TimelineEntryCard
                      key={j}
                      item={nested}
                      index={j}
                      isLast={j === item.priceChangePolicies!.length - 1}
                    />
                  ))}
                </div>
              );
            }
            return (
              <TimelineEntryCard key={i} item={item} index={i} isLast={i === items.length - 1} />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {formatLabel(groupKey)}
        </span>
      </div>
      {items.map((item, i) => {
        const durationLabel = formatDuration(item.duration);
        return (
          <div key={i} className="relative px-4 py-3 border-b border-border/30 last:border-0">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />
            <div className="relative pl-6">
              <div className="absolute left-[-2px] top-3.5 h-3 w-3 rounded-full border-2 border-primary/50 bg-background" />
              <div className="rounded-lg border border-border/60 bg-background/70 p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {item.name || formatLabel(item.type)}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {formatLabel(item.type)}
                  </Badge>
                  {durationLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      {durationLabel}
                    </span>
                  )}
                  <ScheduleBadge schedule={item.schedule} />
                </div>
                {item.description && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.basis && (
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Basis: <span className="text-foreground">{formatLabel(item.basis)}</span>
                    </span>
                  )}
                  {item.value != null && (
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Value: <span className="text-foreground">{item.value}</span>
                    </span>
                  )}
                  {item.count != null && (
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Count: <span className="text-foreground">{item.count}</span>
                    </span>
                  )}
                  {item.kth != null && (
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Kth: <span className="text-foreground">{item.kth}</span>
                    </span>
                  )}
                </div>
                <HeadsList heads={item.heads} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Unit item row (hydrated with listing thumbnail) ───────────────────────────

interface UnitItemRow {
  id: string;
  name: string;
  description?: string;
  quantity?: number;
  thumbnailId?: string | null;
}

function extractUnitItems(
  unit: AuctionUnitVM | undefined,
): { id: string; name?: string; description?: string; quantity?: number }[] {
  if (!unit) return [];
  const raw = unit.items ?? (unit.item ? [unit.item] : []);
  return raw.map((it) =>
    typeof it === 'object' && it !== null
      ? { id: it.id, name: it.name, description: it.description, quantity: it.quantity }
      : { id: it },
  );
}

// ── Auction Unit section (full width, listing-style table) ────────────────────

function AuctionUnitSection({ auction }: { auction: AuctionVM }) {
  const unit = auction.unit;
  const baseItems = extractUnitItems(unit);
  const baseItemsKey = baseItems.map((it) => it.id).join(',');

  const [rows, setRows] = useState<UnitItemRow[]>(
    baseItems.map((it) => ({
      id: it.id,
      name: it.name ?? it.id,
      description: it.description,
      quantity: it.quantity,
    })),
  );
  const [viewListingId, setViewListingId] = useState<string | null>(null);

  useEffect(() => {
    if (!baseItemsKey) return;
    let cancelled = false;
    Promise.all(
      baseItems.map((it) =>
        listingsApi
          .getListingById(it.id)
          .then((listing) => {
            const thumb =
              listing.blobs?.find((b) => b.metadata?.['thumbnail'] === 'true') ??
              listing.blobs?.[0];
            const row: UnitItemRow = {
              id: it.id,
              name: it.name ?? listing.name,
              description: it.description ?? listing.description,
              quantity: it.quantity,
              thumbnailId: thumb?.id ?? null,
            };
            return row;
          })
          .catch(
            (): UnitItemRow => ({
              id: it.id,
              name: it.name ?? it.id,
              description: it.description,
              quantity: it.quantity,
            }),
          ),
      ),
    ).then((results) => {
      if (!cancelled) setRows(results);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItemsKey]);

  const unitType = resolveStr(unit?.type);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Auction Unit</span>
      </div>

      {!unit ? (
        <p className="text-sm text-muted-foreground px-4 py-3">No unit configured.</p>
      ) : (
        <>
          <div className="divide-y divide-border/50">
            <DetailRow label="Unit Type">{formatLabel(unitType) || '—'}</DetailRow>
            <DetailRow label="Opening Price">
              {unit.openingPrice != null ? (
                <span className="font-medium">
                  {auction.monetaryOptions?.currencyUnit
                    ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                    : ''}
                  {unit.openingPrice.toLocaleString()}
                </span>
              ) : (
                '—'
              )}
            </DetailRow>
            {unit.standingPrice != null && (
              <DetailRow label="Standing Price">
                {auction.monetaryOptions?.currencyUnit
                  ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                  : ''}
                {unit.standingPrice.toLocaleString()}
              </DetailRow>
            )}
            {unit.quantity != null && <DetailRow label="Quantity">{unit.quantity}</DetailRow>}
          </div>

          {rows.length > 0 && (
            <div className="p-4">
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
                    {rows.map((row) => (
                      <tr key={row.id} className="bg-card">
                        <td className="px-3 py-2">
                          {row.thumbnailId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={blobsApi.getDownloadUrl(row.thumbnailId)}
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
                          <p className="font-medium text-foreground truncate max-w-[220px]">
                            {row.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {row.id.slice(-8)}
                          </p>
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {row.description ?? '—'}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-sm font-medium text-foreground">
                            {row.quantity ?? '—'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setViewListingId(row.id)}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ListingViewDialog listingId={viewListingId} onClose={() => setViewListingId(null)} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [policies, setPolicies] = useState<AuctionPoliciesGroupRQ | null>(null);

  useEffect(() => {
    Promise.all([
      auctionsApi.getAuctionById(id),
      auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
    ])
      .then(([a, wf, pol]) => {
        setAuction(a);
        setWorkflow(wf);
        setPolicies(pol);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">Auction not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
          Back to auctions
        </Button>
      </div>
    );
  }

  const format = formatLabel(auction.format);
  const auctionType = formatLabel(auction.type);
  const policyEntries = ((): [string, PolicyItemRQ[]][] => {
    if (!policies) return [];
    const rawEntries = Object.entries(policies).filter(([, items]) => items.length > 0);
    const paymentEntry = rawEntries.find(([key]) => key === 'PAYMENT');
    if (!paymentEntry) return rawEntries;

    const [, paymentItems] = paymentEntry;
    const preItems = paymentItems.filter((item) => item.schedule?.reference !== 'AUCTION_END_TIME');
    const postItems = paymentItems.filter(
      (item) => item.schedule?.reference === 'AUCTION_END_TIME',
    );
    const others = rawEntries.filter(([key]) => key !== 'PAYMENT');

    // Pre payment first, other policy groups next, post payment last
    const ordered: [string, PolicyItemRQ[]][] = [];
    if (preItems.length > 0) ordered.push(['PRE_PAYMENT', preItems]);
    ordered.push(...others);
    if (postItems.length > 0) ordered.push(['POST_PAYMENT', postItems]);
    return ordered;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={auction.title}
        description={auction.description ?? 'Auction details'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={() => router.push(`/admin/auctions/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      {/* Title block */}
      {auction.schedule?.startTime && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDateTime(auction.schedule.startTime)}</span>
          {auction.schedule.endTime && (
            <>
              <span>→</span>
              <span>{formatDateTime(auction.schedule.endTime)}</span>
            </>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Basic Information */}
          <SectionCard title="Basic Information" icon={Info}>
            <DetailRow label="Title">{auction.title || '—'}</DetailRow>
            <DetailRow label="Description">{auction.description || '—'}</DetailRow>
            <DetailRow label="Reference ID">
              {auction.referenceId ? (
                <Badge
                  variant="outline"
                  className={`text-xs ${resolveStr(auction.protocol?.direction) === 'FORWARD' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}
                >
                  {auction.referenceId}
                </Badge>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Type">
              {auctionType ? (
                <Badge
                  variant="outline"
                  className="text-xs border-violet-500 text-violet-600 dark:text-violet-300"
                >
                  {auctionType}
                </Badge>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Format">{format || '—'}</DetailRow>
            <DetailRow label="Status">
              <StatusBadge value={auction.status} />
            </DetailRow>
          </SectionCard>

          {/* Schedule */}
          {(auction.schedule?.startTime || auction.schedule?.endTime) && (
            <SectionCard title="Schedule" icon={Calendar}>
              <DetailRow label="Start Time">
                {formatDateTime(auction.schedule?.startTime)}
              </DetailRow>
              <DetailRow label="End Time">{formatDateTime(auction.schedule?.endTime)}</DetailRow>
            </SectionCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Protocol */}
          <SectionCard title="Protocol" icon={Settings2}>
            <DetailRow label="Accessibility">
              <Badge
                variant="outline"
                className={`text-xs ${resolveStr(auction.protocol?.accessibility) === 'PUBLIC' ? 'border-blue-500 text-blue-600' : 'border-violet-500 text-violet-600'}`}
              >
                {formatLabel(auction.protocol?.accessibility) || '—'}
              </Badge>
            </DetailRow>
            <DetailRow label="Direction">
              <Badge
                variant="outline"
                className={`text-xs ${resolveStr(auction.protocol?.direction) === 'FORWARD' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}
              >
                {formatLabel(auction.protocol?.direction) || '—'}
              </Badge>
            </DetailRow>
            <DetailRow label="Dimension">
              {formatLabel(auction.protocol?.dimension) || '—'}
            </DetailRow>
            <DetailRow label="Participant Visibility">
              {formatLabel(auction.protocol?.participantVisibility) || '—'}
            </DetailRow>
            <DetailRow label="Offer Visibility">
              {formatLabel(auction.protocol?.offerVisibility) || '—'}
            </DetailRow>
          </SectionCard>

          {/* Monetary */}
          <SectionCard title="Monetary Options" icon={DollarSign}>
            <DetailRow label="Currency">
              <span className="font-mono font-medium">
                {resolveStr(auction.monetaryOptions?.currencyUnit) || '—'}
              </span>
            </DetailRow>
            <DetailRow label="Precision">
              {auction.monetaryOptions?.precision != null
                ? `${auction.monetaryOptions.precision} decimal places`
                : '—'}
            </DetailRow>
            <DetailRow label="Rounding Mode">
              {formatLabel(auction.monetaryOptions?.roundingMode) || '—'}
            </DetailRow>
          </SectionCard>
        </div>
      </div>

      {/* Auction Unit — full width */}
      <AuctionUnitSection auction={auction} />

      {/* Policies — full width */}
      {policyEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Policies</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {policyEntries.length} group{policyEntries.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-y divide-border/50">
            {policyEntries.map(([key, items]) => (
              <PolicyGroupSection key={key} groupKey={key} items={items} />
            ))}
          </div>
        </div>
      )}

      {/* Workflow — full width, after policies */}
      {workflow.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Workflow</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {workflow.length} step{workflow.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            {workflow.map((step, i) => (
              <WorkflowStepRow key={step.id ?? i} step={step} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
