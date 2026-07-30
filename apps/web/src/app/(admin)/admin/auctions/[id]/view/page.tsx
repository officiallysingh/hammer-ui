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
  Copy,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  Sparkles,
  Activity,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  toast,
} from '@repo/ui';
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

  const colorMap: Record<string, { bg: string; icon: React.ElementType; animate?: boolean }> = {
    CREATED: {
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: Info,
    },
    SCHEDULED: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: Clock,
    },
    RUNNING: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: Activity,
      animate: true,
    },
    COMPLETED: {
      bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      icon: ShieldCheck,
    },
    CANCELLED: {
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      icon: AlertCircle,
    },
  };

  const config: { bg: string; icon: React.ElementType; animate?: boolean } = colorMap[str] ?? {
    bg: 'bg-muted text-muted-foreground border-border',
    icon: Info,
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.animate ? 'animate-pulse' : ''}`} />
      {formatLabel(str)}
    </span>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 even:bg-muted/15 hover:bg-muted/30 transition-colors">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{children}</span>
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
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-2.5 px-4 py-3.5 bg-muted/30 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight">{title}</span>
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

// ── Policy group ──────────────────────────────────────────────────────────────

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
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {formatLabel(groupKey)}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {items.length} policy item{items.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => {
          if (item.priceChangePolicies?.length) {
            return (
              <div key={i} className="space-y-2">
                <PolicyItemCard
                  auctionId={auctionId}
                  policyId={item.id}
                  name={item.name}
                  type={item.type}
                  evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
                  showStatus={true}
                />
                {item.priceChangePolicies.map((nested, j) => (
                  <div key={j} className="pl-4 border-l-2 border-primary/20">
                    <PolicyItemCard
                      auctionId={auctionId}
                      policyId={nested.id}
                      name={nested.name}
                      type={nested.type}
                      evaluations={nested.id ? evaluationsByPolicyId?.[nested.id] : undefined}
                      showStatus={true}
                    />
                  </div>
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
              showStatus={true}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Unit item row ─────────────────────────────────────────────────────────────

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

// ── Auction Unit section ──────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Auction Unit Details</h3>
              <p className="text-xs text-muted-foreground">Pricing and associated items</p>
            </div>
          </div>
          {unitType && (
            <Badge variant="secondary" className="font-semibold text-xs">
              {formatLabel(unitType)}
            </Badge>
          )}
        </div>

        {!unit ? (
          <p className="text-sm text-muted-foreground px-5 py-6 text-center">
            No unit configured for this auction.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50 bg-card border-b border-border">
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Opening Price</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {unit.openingPrice != null ? (
                    <>
                      {auction.monetaryOptions?.currencyUnit
                        ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                        : ''}
                      {unit.openingPrice.toLocaleString()}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Standing Price</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {unit.standingPrice != null ? (
                    <>
                      {auction.monetaryOptions?.currencyUnit
                        ? `${resolveStr(auction.monetaryOptions.currencyUnit)} `
                        : ''}
                      {unit.standingPrice.toLocaleString()}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium">Total Quantity</span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {unit.quantity ?? rows.length ?? '—'}
                </span>
              </div>
            </div>

            {rows.length > 0 && (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included Listings ({rows.length})
                  </h4>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left">
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground w-12" />
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground hidden md:table-cell">
                          Description
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-center w-20">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-muted-foreground text-right w-24">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            {row.thumbnailId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={blobsApi.getDownloadUrl(row.thumbnailId)}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-border shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground truncate max-w-[220px]">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              ID: {row.id.slice(-8)}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[320px]">
                              {row.description ?? '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                              {row.quantity ?? 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewListingId(row.id)}
                              className="gap-1.5 text-xs h-8"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
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
      </div>

      <ListingViewDialog listingId={viewListingId} onClose={() => setViewListingId(null)} />
    </div>
  );
}

// ── Main Auction View Page ─────────────────────────────────────────────────────

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reloadingPolicies, setReloadingPolicies] = useState(false);
  const [copied, setCopied] = useState(false);
  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [policies, setPolicies] = useState<AuctionPoliciesGroupRQ | null>(null);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});

  const fetchEvaluations = async (polGroup: AuctionPoliciesGroupRQ | null) => {
    if (!polGroup) return;
    const policyIds = Array.from(
      new Set(
        Object.values(polGroup)
          .flat()
          .map((p) => p.id)
          .filter((policyId): policyId is string => Boolean(policyId)),
      ),
    );
    const results = await Promise.all(
      policyIds.map((policyId) =>
        auctionsApi
          .evaluateAuctionPolicy(id, policyId)
          .then((res) => [policyId, res] as const)
          .catch(() => [policyId, null] as const),
      ),
    );
    const map: Record<string, PolicyEvaluationMap> = {};
    for (const [policyId, res] of results) {
      if (res) map[policyId] = res;
    }
    setEvaluationsByPolicyId(map);
  };

  useEffect(() => {
    Promise.all([
      auctionsApi.getAuctionById(id),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
    ])
      .then(([a, pol]) => {
        setAuction(a);
        setPolicies(pol);
        return fetchEvaluations(pol);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleRefreshPolicies = async () => {
    setReloadingPolicies(true);
    try {
      const pol = await auctionsApi.getAuctionPolicies(id).catch(() => null);
      setPolicies(pol);
      await fetchEvaluations(pol);
      toast?.success?.('Policies re-evaluated successfully');
    } catch {
      toast?.error?.('Failed to re-evaluate policies');
    } finally {
      setReloadingPolicies(false);
    }
  };

  const handleCopyId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast?.success?.('Auction ID copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading auction details...</span>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-10 w-10" />
        </div>
        <p className="text-base font-semibold text-foreground">Auction not found</p>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          The requested auction ID could not be found or you may not have authorization to view it.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Auctions
        </Button>
      </div>
    );
  }

  const format = formatLabel(auction.format);
  const auctionType = formatLabel(auction.type);

  // Policy Group entries split pre / post payment
  const policyEntries = ((): [string, PolicyItemRQ[]][] => {
    if (!policies) return [];
    const rawEntries = Object.entries(policies).filter(([, items]) => items.length > 0);

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

  const totalPolicyCount = policyEntries.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusBadge value={auction.status} />
              {auction.referenceId && (
                <Badge variant="outline" className="font-mono text-xs">
                  Ref: {auction.referenceId}
                </Badge>
              )}
              {auctionType && (
                <Badge variant="secondary" className="text-xs">
                  {auctionType}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {auction.title}
            </h1>
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">
              {auction.description || 'No description provided for this auction.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="gap-1.5 text-xs rounded-xl"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/auctions')}
              className="gap-1.5 text-xs rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/admin/auctions/${id}/edit`)}
              className="gap-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Auction</span>
            </Button>
          </div>
        </div>

        {/* Schedule Bar */}
        {auction.schedule?.startTime && (
          <div className="flex items-center gap-2 pt-3 border-t border-border/40 text-xs font-medium text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>
              Start:{' '}
              <strong className="text-foreground">
                {formatDateTime(auction.schedule.startTime)}
              </strong>
            </span>
            {auction.schedule.endTime && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>
                  End:{' '}
                  <strong className="text-foreground">
                    {formatDateTime(auction.schedule.endTime)}
                  </strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Opening Price</p>
              <p className="text-lg font-bold text-foreground">
                {auction.unit?.openingPrice != null ? (
                  <>
                    {resolveStr(auction.monetaryOptions?.currencyUnit)}{' '}
                    {auction.unit.openingPrice.toLocaleString()}
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Direction</p>
              <p className="text-sm font-bold text-foreground">
                {formatLabel(auction.protocol?.direction) || '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Format</p>
              <p className="text-sm font-bold text-foreground truncate max-w-[110px]">
                {format || '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Configured Policies</p>
              <p className="text-lg font-bold text-foreground">{totalPolicyCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 rounded-xl p-1 bg-muted/60">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Info className="h-3.5 w-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="unit" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Layers className="h-3.5 w-3.5" />
            <span>Unit & Items</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Settings2 className="h-3.5 w-3.5" />
            <span>Policies ({totalPolicyCount})</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg text-xs font-semibold gap-2 py-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Schedule & Timeline</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <SectionCard title="Basic Information" icon={Info}>
                <DetailRow label="Auction Title">{auction.title || '—'}</DetailRow>
                <DetailRow label="Description">{auction.description || '—'}</DetailRow>
                <DetailRow label="Reference ID">
                  {auction.referenceId ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {auction.referenceId}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Auction Type">
                  {auctionType ? (
                    <Badge variant="secondary" className="text-xs font-semibold">
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

              <SectionCard title="Monetary Options" icon={DollarSign}>
                <DetailRow label="Currency Unit">
                  <span className="font-mono font-bold text-foreground">
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

            <div className="space-y-6">
              <SectionCard title="Protocol Settings" icon={Settings2}>
                <DetailRow label="Accessibility">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${resolveStr(auction.protocol?.accessibility) === 'PUBLIC' ? 'border-blue-500 text-blue-600' : 'border-violet-500 text-violet-600'}`}
                  >
                    {formatLabel(auction.protocol?.accessibility) || '—'}
                  </Badge>
                </DetailRow>
                <DetailRow label="Direction">
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${resolveStr(auction.protocol?.direction) === 'FORWARD' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}
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

              <SectionCard title="Schedule Overview" icon={Calendar}>
                <DetailRow label="Start Time">
                  {formatDateTime(auction.schedule?.startTime)}
                </DetailRow>
                <DetailRow label="End Time">{formatDateTime(auction.schedule?.endTime)}</DetailRow>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: UNIT & ITEMS */}
        <TabsContent value="unit" className="outline-none">
          <AuctionUnitSection auction={auction} />
        </TabsContent>

        {/* TAB 3: POLICIES */}
        <TabsContent value="policies" className="space-y-4 outline-none">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Auction Policies & Evaluation Rules
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Rule conditions, parameters, and live status evaluation results
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPolicies}
                disabled={reloadingPolicies}
                className="gap-2 text-xs rounded-xl"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reloadingPolicies ? 'animate-spin' : ''}`} />
                <span>Re-evaluate All</span>
              </Button>
            </div>

            {policyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-8 text-center">
                No policy groups configured for this auction.
              </p>
            ) : (
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
            )}
          </div>
        </TabsContent>

        {/* TAB 4: SCHEDULE & TIMELINE */}
        <TabsContent value="timeline" className="outline-none">
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border bg-muted/30 p-5">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-primary" />
                <span>Auction Event Lifecycle</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative pl-6 border-l-2 border-primary/20 space-y-8">
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      Step 1
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Auction Created & Configured
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Basic information, unit selection, and policy mappings assigned.
                    </p>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 ring-4 ring-background" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Step 2
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Pre-payment & Participation Verification
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Evaluation of pre-payment deposits, registration checklist, and participant
                      eligibility.
                    </p>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-background" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Step 3
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Auction Start ({formatDateTime(auction.schedule?.startTime)})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bidding opens according to format progression settings.
                    </p>
                  </div>
                </div>

                {/* Event 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-background" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Step 4
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Auction Closing & Post-Payment ({formatDateTime(auction.schedule?.endTime)})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Winner evaluation, standing price finalization, and post-payment settlement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
