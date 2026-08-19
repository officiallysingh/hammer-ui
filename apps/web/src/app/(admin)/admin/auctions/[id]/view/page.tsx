'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  AuctionVM,
  PolicyItemRQ,
  AuctionPoliciesRQ,
  PolicyEvaluationMap,
} from '@repo/api';
import { PolicyGroupSection } from '../../_components/AuctionPolicyGroupSection';
import { AuctionUnitSection } from '../../_components/AuctionUnitSection';
import { groupPoliciesByCategory, buildEvaluationsByPolicy } from '../../_components/PolicyShared';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  DollarSign,
  IndianRupee,
  Settings2,
  Layers,
  AlertCircle,
  Info,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  Sparkles,
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
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatDateTime, formatLabel, resolveStr } from '@/components/common/admin/format';
import { DetailRow, PageLoading, SectionCard } from '@/components/common/admin/SectionCard';

// ── Main Auction View Page ─────────────────────────────────────────────────────

export default function AuctionViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reloadingPolicies, setReloadingPolicies] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [policies, setPolicies] = useState<AuctionPoliciesRQ | null>(null);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  // When we last fetched evaluations — shown to admins so they know whether the
  // "Re-evaluate All" badge result is fresh or stale.
  const [evaluationsEvaluatedAt, setEvaluationsEvaluatedAt] = useState<Date | null>(null);

  const fetchEvaluations = async (items: AuctionPoliciesRQ | null) => {
    if (!items) return;
    const policyIds = Array.from(
      new Set(items.map((p) => p.id).filter((policyId): policyId is string => Boolean(policyId))),
    );
    if (policyIds.length === 0) {
      setEvaluationsByPolicyId({});
      setEvaluationsEvaluatedAt(new Date());
      return;
    }
    // Evaluate every policy in a single bulk request (POST /policies/evaluate),
    // matching the auction policy step, instead of N+1 per-policy calls.
    const evaluations = await auctionsApi.evaluateAuctionPolicies(id, policyIds).catch(() => null);
    setEvaluationsByPolicyId(buildEvaluationsByPolicy(evaluations, items));
    setEvaluationsEvaluatedAt(new Date());
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      auctionsApi.getAuctionById(id, ['*']),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
    ])
      .then(([a, pol]) => {
        if (cancelled) return;
        setAuction(a);
        setPolicies(pol);
        // Only auto-evaluate on first load when the auction is in a state where
        // evaluation results could have moved (SCHEDULED / RUNNING). For CREATED
        // / COMPLETED / CANCELLED, evaluations are stable — skip the N+1 to
        // save server round-trips and let the admin click Re-evaluate when needed.
        const status = resolveStr(a.status);
        const live = status === 'SCHEDULED' || status === 'RUNNING';
        if (live) {
          return fetchEvaluations(pol);
        }
        return null;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Evaluations only auto-fetch on mount for SCHEDULED/RUNNING auctions (see
    // above). For every other status, the first visit to the Policies tab is
    // what should trigger the fetch, instead of leaving it blank until the
    // admin clicks "Re-evaluate All".
    if (value === 'policies' && !evaluationsEvaluatedAt && !reloadingPolicies) {
      setReloadingPolicies(true);
      fetchEvaluations(policies).finally(() => setReloadingPolicies(false));
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
    return <PageLoading message="Loading auction details..." />;
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

  // Policy entries grouped back into named categories client-side — the backend
  // now returns a flat policies array (see PolicyShared.groupPoliciesByCategory).
  const policyEntries: [string, PolicyItemRQ[]][] = groupPoliciesByCategory(policies ?? []);

  const totalPolicyCount = policyEntries.reduce((sum, [, items]) => sum + items.length, 0);

  // Policies timeline: fold the flat group list into ordered auction-lifecycle
  // stages (start → running → complete → winner) so the tab reads like the
  // auction's actual sequence of events.
  const byUpperKey =
    (keys: string[]) =>
    ([key]: [string, PolicyItemRQ[]]) =>
      keys.includes(key.toUpperCase());

  const auctionStartGroups = policyEntries.filter(byUpperKey(['PARTICIPATION', 'PRECONDITION']));
  const auctionRunningGroups = policyEntries.filter(byUpperKey(['EXTENSION', 'PRICE_PROGRESSION']));
  const winnerGroups = policyEntries.filter(
    byUpperKey(['WINNER_DETERMINATION', 'WINNER_PRICE_DETERMINATION']),
  );

  const placedKeys = new Set(
    [...auctionStartGroups, ...auctionRunningGroups, ...winnerGroups].map(([key]) => key),
  );
  const otherGroups = policyEntries.filter(([key]) => !placedKeys.has(key));

  interface PolicyStage {
    id: string;
    label: string;
    dotClassName: string;
    textClassName: string;
    dateLine?: string;
    subLine?: string;
    groups: [string, PolicyItemRQ[]][];
  }

  const policyStages: PolicyStage[] = [];

  if (auction.schedule?.startTime || auctionStartGroups.length > 0) {
    policyStages.push({
      id: 'auction-start',
      label: 'Auction Start',
      dotClassName: 'bg-emerald-500',
      textClassName: 'text-emerald-600 dark:text-emerald-400',
      dateLine: auction.schedule?.startTime
        ? `Auction opens — ${formatDateTime(auction.schedule.startTime)}`
        : undefined,
      groups: auctionStartGroups,
    });
  }

  if (auctionRunningGroups.length > 0) {
    policyStages.push({
      id: 'auction-running',
      label: 'Auction Running',
      dotClassName: 'bg-blue-500',
      textClassName: 'text-blue-600 dark:text-blue-400',
      subLine: 'Extension and price-progression rules apply while bidding is open.',
      groups: auctionRunningGroups,
    });
  }

  // Auction Complete only appears once the auction actually has an end time scheduled.
  if (auction.schedule?.endTime) {
    policyStages.push({
      id: 'auction-complete',
      label: 'Auction Complete',
      dotClassName: 'bg-indigo-500',
      textClassName: 'text-indigo-600 dark:text-indigo-400',
      dateLine: `Auction closes — ${formatDateTime(auction.schedule.endTime)}`,
      groups: [],
    });
  }

  if (winnerGroups.length > 0) {
    policyStages.push({
      id: 'winner',
      label: 'Winner',
      dotClassName: 'bg-violet-500',
      textClassName: 'text-violet-600 dark:text-violet-400',
      groups: winnerGroups,
    });
  }

  if (otherGroups.length > 0) {
    policyStages.push({
      id: 'other',
      label: 'Other Policies',
      dotClassName: 'bg-muted-foreground',
      textClassName: 'text-muted-foreground',
      groups: otherGroups,
    });
  }

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
              <IndianRupee className="h-5 w-5" />
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
            <div className="flex items-start justify-between px-5 py-4 bg-muted/30 border-b border-border gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground truncate">Policies</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {evaluationsEvaluatedAt
                      ? `Last evaluated ${evaluationsEvaluatedAt.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })} — click Re-evaluate to refresh.`
                      : 'Click Re-evaluate to fetch live evaluation results from the rule engine.'}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPolicies}
                disabled={reloadingPolicies || policyEntries.length === 0}
                className="gap-2 text-xs rounded-xl shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reloadingPolicies ? 'animate-spin' : ''}`} />
                <span>Re-evaluate All</span>
              </Button>
            </div>

            {policyEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-5 py-10 gap-3">
                <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No policies configured</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    This auction doesn&apos;t have any policies configured yet. Add precondition,
                    extension, and winner-determination rules so the auction knows how to run.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/auctions/${id}/edit`)}
                  className="gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Configure policies
                </Button>
              </div>
            ) : (
              <div className="p-5">
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-8">
                  {policyStages.map((stage) => (
                    <div key={stage.id} className="relative">
                      <div
                        className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full ${stage.dotClassName} ring-4 ring-background`}
                      />
                      <div className="space-y-2">
                        <p
                          className={`text-xs font-bold uppercase tracking-wider ${stage.textClassName}`}
                        >
                          {stage.label}
                        </p>
                        {stage.dateLine && (
                          <p className="text-sm font-semibold text-foreground">{stage.dateLine}</p>
                        )}
                        {stage.subLine && (
                          <p className="text-xs text-muted-foreground">{stage.subLine}</p>
                        )}
                        {stage.groups.length > 0 && (
                          <div className="rounded-xl border border-border divide-y divide-border/50 overflow-hidden">
                            {stage.groups.map(([key, items]) => (
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
                    </div>
                  ))}
                </div>
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
                <span>Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!auction.schedule?.startTime && !auction.schedule?.endTime ? (
                <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
                  <div className="p-3 rounded-full bg-muted text-muted-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Not scheduled yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      This auction doesn&apos;t have a start or end time. Schedule it from the edit
                      page to make it visible to participants.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/auctions/${id}/edit`)}
                    className="gap-1.5 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Schedule auction
                  </Button>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-background" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Created
                      </p>
                      <p className="text-sm font-semibold text-foreground">Auction created</p>
                      <p className="text-xs text-muted-foreground">
                        Configuration, units, and policies assigned.
                      </p>
                    </div>
                  </div>

                  {auction.schedule?.startTime && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-background" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Start
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          Auction opens — {formatDateTime(auction.schedule.startTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bidding becomes available to participants.
                        </p>
                      </div>
                    </div>
                  )}

                  {auction.schedule?.endTime && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-background" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          End
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          Auction closes — {formatDateTime(auction.schedule.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Winner is determined and post-payment is triggered.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
