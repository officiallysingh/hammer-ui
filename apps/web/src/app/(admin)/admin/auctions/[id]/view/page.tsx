'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  blobsApi,
  BlobVM,
  AuctionVM,
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
  ChevronRight,
  Play,
  FileText,
  Download,
  ImageIcon,
  Info,
} from 'lucide-react';
import { Button, Badge } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';

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

// ── Blob media-type helpers ────────────────────────────────────────────────────

function blobMimeType(blob: BlobVM): string {
  if (!blob.mediaType) return '';
  if (typeof blob.mediaType === 'string') return blob.mediaType;
  const { type, subtype } = blob.mediaType as { type?: string; subtype?: string };
  return type && subtype ? `${type}/${subtype}` : (type ?? '');
}

function isImage(blob: BlobVM) {
  return blobMimeType(blob).startsWith('image/');
}

function isVideo(blob: BlobVM) {
  return blobMimeType(blob).startsWith('video/');
}

function isDoc(blob: BlobVM) {
  return !isImage(blob) && !isVideo(blob);
}

// ── Media gallery ─────────────────────────────────────────────────────────────

function AuctionMediaGallery({ blobs }: { blobs: BlobVM[] }) {
  const images = blobs.filter(isImage);
  const videos = blobs.filter(isVideo);
  const docs = blobs.filter(isDoc);
  const mediaItems = [...images, ...videos];

  const thumbnail = images.find((b) => b.metadata?.['thumbnail'] === 'true') ?? images[0];

  const [activeId, setActiveId] = useState<string>(() => thumbnail?.id ?? mediaItems[0]?.id ?? '');
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const docIds = docs.map((blob) => blob.id).join('|');

  useEffect(() => {
    let active = true;

    const loadMissingNames = async () => {
      const missing = docs.filter((blob) => !blob.fileName && !docNames[blob.id]);
      if (!missing.length) return;

      const resolved = await Promise.all(
        missing.map(async (blob) => {
          try {
            const detail = await blobsApi.getBlobById(blob.id);
            return [blob.id, detail.fileName ?? blob.id] as const;
          } catch {
            return [blob.id, blob.id] as const;
          }
        }),
      );

      if (!active) return;
      setDocNames((prev) => {
        const next = { ...prev };
        resolved.forEach(([id, name]) => {
          next[id] = name;
        });
        return next;
      });
    };

    void loadMissingNames();
    return () => {
      active = false;
    };
  }, [docIds, docs, docNames]);

  if (!blobs.length) return null;

  const activeBlob = mediaItems.find((b) => b.id === activeId) ?? mediaItems[0];
  const activeIsVideo = activeBlob ? isVideo(activeBlob) : false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Media</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {images.length > 0 && `${images.length} image${images.length !== 1 ? 's' : ''}`}
          {images.length > 0 && videos.length > 0 && ' · '}
          {videos.length > 0 && `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
          {(images.length > 0 || videos.length > 0) && docs.length > 0 && ' · '}
          {docs.length > 0 && `${docs.length} doc${docs.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Main viewer */}
        {mediaItems.length > 0 && activeBlob && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-video">
            {activeIsVideo ? (
              <video
                key={activeBlob.id}
                src={blobsApi.getDownloadUrl(activeBlob.id)}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobsApi.getDownloadUrl(activeBlob.id)}
                alt={activeBlob.fileName ?? 'image'}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {/* Thumbnail strip */}
        {mediaItems.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mediaItems.map((blob) => (
              <button
                key={blob.id}
                type="button"
                onClick={() => setActiveId(blob.id)}
                className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all relative ${
                  blob.id === activeId
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {isVideo(blob) ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-5 w-5 text-muted-foreground fill-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blobsApi.getDownloadUrl(blob.id)}
                    alt={blob.fileName ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Documents */}
        {docs.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Documents</p>
            {docs.map((blob) => {
              const displayName = blob.fileName ?? docNames[blob.id] ?? blob.id;
              return (
                <div
                  key={blob.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-foreground text-xs" title={displayName}>
                      {displayName}
                    </span>
                  </div>
                  <a
                    href={blobsApi.getDownloadUrl(blob.id)}
                    download={blob.fileName ?? displayName}
                    className="shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
            const durationLabel = formatDuration(item.windowDuration ?? item.duration);
            const stepLabel = item.steps?.length ? item.steps.join(', ') : null;
            const isLast = i === items.length - 1;
            return (
              <div key={i} className="relative pl-8 pb-4 last:pb-0">
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
                      {isLast ? 'Rest of auction' : `Window ${i + 1}`}
                    </span>
                  </div>
                  {durationLabel && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      {durationLabel}
                    </div>
                  )}
                  {item.description && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Unit display ──────────────────────────────────────────────────────────────

function UnitDisplay({ auction }: { auction: AuctionVM }) {
  const unit = auction.unit;
  if (!unit) return <p className="text-sm text-muted-foreground px-4 py-3">No unit configured.</p>;

  const unitType = resolveStr(unit.type);
  const items = unit.items ?? (unit.item ? [unit.item] : []);

  return (
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
      {items.length > 0 && (
        <DetailRow label={items.length === 1 ? 'Item' : 'Items'}>
          <div className="flex flex-col gap-1">
            {items.map((it, i) => {
              const name = typeof it === 'object' && it !== null ? (it.name ?? it.id) : it;
              const qty = typeof it === 'object' && it !== null ? it.quantity : undefined;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground w-fit"
                >
                  {name}
                  {qty != null && <span className="text-muted-foreground">&times; {qty}</span>}
                </span>
              );
            })}
          </div>
        </DetailRow>
      )}
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
  const [blobs, setBlobs] = useState<BlobVM[]>([]);

  useEffect(() => {
    Promise.all([
      auctionsApi.getAuctionById(id),
      auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
      auctionsApi.getAuctionPolicies(id).catch(() => null),
      blobsApi.getBlobsByEntityId(id).catch(() => [] as BlobVM[]),
    ])
      .then(([a, wf, pol, blobList]) => {
        setAuction(a);
        setWorkflow(wf);
        setPolicies(pol);
        setBlobs(blobList);
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

  const status = resolveStr(auction.status);
  const format = formatLabel(auction.format);
  const auctionType = formatLabel(auction.type);
  const policyEntries = policies
    ? Object.entries(policies).filter(([, items]) => items.length > 0)
    : [];

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

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Status: {status ? formatLabel(status) : '—'}
          </Badge>
          {auctionType && (
            <Badge variant="outline" className="text-xs">
              Type: {auctionType}
            </Badge>
          )}
          {format && (
            <Badge variant="outline" className="text-xs">
              Format: {format}
            </Badge>
          )}
          {auction.referenceId && (
            <Badge variant="outline" className="text-xs">
              Ref: {auction.referenceId}
            </Badge>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Basic Information */}
          <SectionCard title="Basic Information" icon={Info}>
            <DetailRow label="Title">{auction.title || '—'}</DetailRow>
            <DetailRow label="Description">{auction.description || '—'}</DetailRow>
            <DetailRow label="Reference ID">{auction.referenceId || '—'}</DetailRow>
            <DetailRow label="Type">{auctionType || '—'}</DetailRow>
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

          {/* Media gallery */}
          <AuctionMediaGallery blobs={blobs} />
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

          {/* Unit */}
          <SectionCard title="Auction Unit" icon={Layers}>
            <UnitDisplay auction={auction} />
          </SectionCard>

          {/* Workflow */}
          {workflow.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Workflow</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {workflow.length} steps
                </span>
              </div>
              <div>
                {workflow.map((step, i) => (
                  <WorkflowStepRow key={step.id ?? i} step={step} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}
