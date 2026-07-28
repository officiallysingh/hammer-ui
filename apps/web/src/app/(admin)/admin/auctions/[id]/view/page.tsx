'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  listingsApi,
  blobsApi,
  AuctionVM,
  AuctionUnitVM,
  PolicyItemRQ,
  AuctionPoliciesGroupRQ,
  PolicyEvaluationMap,
} from '@repo/api';
import { PolicyItemCard } from '../../_components/PolicyEvaluationDisplay';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Calendar,
  DollarSign,
  Settings2,
  Layers,
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

// ── Policy group ──────────────────────────────────────────────────────────────
// Evaluate-only, full-width — no raw policy-form fields, just each policy's name/
// type and its evaluation results (reuses the same card as the edit/workflow views).

function PolicyGroupSection({
  auctionId,
  groupKey,
  items,
  evaluationsByPolicyId,
}: {
  auctionId: string;
  groupKey: string;
  items: PolicyItemRQ[];
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {formatLabel(groupKey)}
      </span>
      <div className="space-y-2">
        {items.map((item, i) => {
          // Wrapper items (e.g. PRICE_PROGRESSION_POLICY) hold their own nested list —
          // show the wrapper plus each nested step as its own full-width card.
          if (item.priceChangePolicies?.length) {
            return (
              <div key={i} className="space-y-2">
                <PolicyItemCard
                  auctionId={auctionId}
                  policyId={item.id}
                  name={item.name}
                  type={item.type}
                  evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
                  showStatus={false}
                />
                {item.priceChangePolicies.map((nested, j) => (
                  <PolicyItemCard
                    key={j}
                    auctionId={auctionId}
                    policyId={nested.id}
                    name={nested.name}
                    type={nested.type}
                    evaluations={nested.id ? evaluationsByPolicyId?.[nested.id] : undefined}
                    showStatus={false}
                  />
                ))}
              </div>
            );
          }
          return (
            <PolicyItemCard
              key={i}
              auctionId={auctionId}
              policyId={item.id}
              name={item.name}
              type={item.type}
              evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
              showStatus={false}
            />
          );
        })}
      </div>
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
  const [policies, setPolicies] = useState<AuctionPoliciesGroupRQ | null>(null);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});

  useEffect(() => {
    Promise.all([
      auctionsApi.getAuctionById(id),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
    ])
      .then(([a, pol]) => {
        setAuction(a);
        setPolicies(pol);

        const policyIds = Array.from(
          new Set(
            Object.values(pol ?? {})
              .flat()
              .map((p) => p.id)
              .filter((policyId): policyId is string => Boolean(policyId)),
          ),
        );
        Promise.all(
          policyIds.map((policyId) =>
            auctionsApi
              .evaluateAuctionPolicy(id, policyId)
              .then((res) => [policyId, res] as const)
              .catch(() => [policyId, null] as const),
          ),
        ).then((results) => {
          const map: Record<string, PolicyEvaluationMap> = {};
          for (const [policyId, res] of results) {
            if (res) map[policyId] = res;
          }
          setEvaluationsByPolicyId(map);
        });
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

  // Split PAYMENT group into pre (START_TIME) and post (END_TIME) blocks
  // Pre-payment first, other policy groups in the middle, post-payment last
  const policyEntries = ((): [string, PolicyItemRQ[]][] => {
    if (!policies) return [];
    const rawEntries = Object.entries(policies).filter(([, items]) => items.length > 0);

    // Find the PAYMENT group (key may vary in casing)
    const paymentKey = Object.keys(policies).find((k) => k.toUpperCase() === 'PAYMENT');
    if (!paymentKey) return rawEntries;

    const paymentItems = policies[paymentKey] ?? [];
    const preItems = paymentItems.filter((item) => {
      const ref = item.schedule?.reference;
      const refStr = typeof ref === 'string' ? ref : ref ? Object.keys(ref as object)[0] : '';
      return refStr !== 'AUCTION_END_TIME';
    });
    const postItems = paymentItems.filter((item) => {
      const ref = item.schedule?.reference;
      const refStr = typeof ref === 'string' ? ref : ref ? Object.keys(ref as object)[0] : '';
      return refStr === 'AUCTION_END_TIME';
    });
    const others = rawEntries.filter(([key]) => key.toUpperCase() !== 'PAYMENT');

    const ordered: [string, PolicyItemRQ[]][] = [];
    if (preItems.length > 0) ordered.push(['Pre Payment', preItems]);
    ordered.push(...others);
    if (postItems.length > 0) ordered.push(['Post Payment', postItems]);
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

      {/* Schedule bar */}
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

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
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

          {(auction.schedule?.startTime || auction.schedule?.endTime) && (
            <SectionCard title="Schedule" icon={Calendar}>
              <DetailRow label="Start Time">
                {formatDateTime(auction.schedule?.startTime)}
              </DetailRow>
              <DetailRow label="End Time">{formatDateTime(auction.schedule?.endTime)}</DetailRow>
            </SectionCard>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">
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
          <div className="divide-y divide-border/50">
            {policyEntries.map(([key, items]) => (
              <PolicyGroupSection
                key={key}
                auctionId={id}
                groupKey={key}
                items={items}
                evaluationsByPolicyId={evaluationsByPolicyId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
