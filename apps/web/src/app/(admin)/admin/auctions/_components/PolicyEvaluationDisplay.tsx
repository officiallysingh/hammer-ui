'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Pencil, Trash2, XCircle, IndianRupee } from 'lucide-react';
import { auctionsApi, type PolicyEvaluation, type PolicyEvaluationMap } from '@repo/api';
import { Badge, Button } from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { fmtLabel, resolveStr } from './PolicyShared';
import { formatDateTime } from '@/components/common/admin/format';

function statusStyle(statusType: string): { className: string; Icon: typeof Clock } {
  switch (statusType) {
    case 'COMPLETED':
      return {
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        Icon: CheckCircle2,
      };
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'RUNNING':
      return { className: 'bg-blue-500/10 text-blue-600 border-blue-500/30', Icon: Clock };
    case 'FAILED':
    case 'CANCELLED':
      return { className: 'bg-red-500/10 text-red-600 border-red-500/30', Icon: XCircle };
    default:
      return { className: 'bg-muted text-muted-foreground border-border', Icon: Clock };
  }
}

/** True for backend enum values shaped like `{ CODE: "Label" }` */
function isEnumObject(value: unknown): value is Record<string, string | null> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return false;
  const [key] = entries[0]!;
  return /^[A-Z][A-Z0-9_]*$/.test(key);
}

/** True for arrays shaped like `[{ "Aadhar Card": false }, { "Pan Card": true }, ...]`. */
function isChecklistArray(value: unknown): value is Record<string, boolean>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => {
      if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
      const entries = Object.entries(v as Record<string, unknown>);
      return entries.length === 1 && typeof entries[0]![1] === 'boolean';
    })
  );
}

function isISODateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(key);
}

function isNestedPaymentBlock(value: unknown): value is Record<string, string> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length <= 4 && keys.some((k) => k === 'amount' || k === 'refundable');
}

function formatValue(value: unknown): string {
  if (isEnumObject(value)) return fmtLabel(Object.keys(value)[0]) || '';
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const str = resolveStr(value);
    return str || '';
  }
  return String(value);
}

type DetailRender =
  | { kind: 'chip'; text: string; label?: string }
  | { kind: 'checklist'; items: { label: string; ok: boolean }[]; label?: string }
  | { kind: 'block'; rows: [string, string, string?][]; label?: string }
  | { kind: 'payment-block'; amount: string; description: string; refundable?: string }
  | { kind: 'date-chip'; date: string; text: string }
  | { kind: 'pending-message'; text: string };

function formatAmount(value: unknown): string {
  if (value == null || value === '') return '';
  const str = String(value);
  const num = parseFloat(str);
  if (!Number.isNaN(num)) {
    return num % 1 === 0
      ? num.toLocaleString('en-IN')
      : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return str;
}

function renderDetail(value: unknown): DetailRender | null {
  if (value == null || value === '') return null;
  if (isEnumObject(value)) {
    const text = fmtLabel(Object.keys(value)[0]);
    return text ? { kind: 'chip', text } : null;
  }
  if (isChecklistArray(value)) {
    return {
      kind: 'checklist',
      items: value.map((item) => {
        const [label, ok] = Object.entries(item)[0]!;
        return { label: fmtLabel(label), ok };
      }),
    };
  }
  if (Array.isArray(value)) {
    const text = value.map(formatValue).filter(Boolean).join(', ');
    return text ? { kind: 'chip', text } : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (isNestedPaymentBlock(obj)) {
      return {
        kind: 'payment-block',
        amount: formatAmount(obj.amount ?? ''),
        description: formatValue(obj.description) || '',
        refundable: formatValue(obj.refundable),
      };
    }
    const rows: [string, string, string?][] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'description') continue;
      if (v == null) {
        if (isISODateKey(k)) {
          rows.push([k, formatDateTime(k), '']);
        }
        continue;
      }
      const formatted = formatValue(v);
      if (!formatted) {
        if (isISODateKey(k)) {
          rows.push([k, formatDateTime(k), '']);
        }
        continue;
      }
      if (isEnumObject(v)) {
        rows.push([k, fmtLabel(Object.keys(v)[0]!), '']);
      } else if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
        const nested = v as Record<string, unknown>;
        if (isNestedPaymentBlock(nested)) {
          rows.push([k, formatAmount(nested.amount ?? ''), formatValue(nested.description) || '']);
        } else {
          rows.push([k, resolveStr(v), '']);
        }
      } else {
        rows.push([k, formatted, '']);
      }
    }
    if (rows.length === 0) return null;
    return { kind: 'block', rows };
  }
  const text = formatValue(value);
  return text ? { kind: 'chip', text } : null;
}

function buildDetailItems(
  details: Record<string, unknown> | undefined,
): { key: string; label: string; rendered: DetailRender }[] {
  if (!details) return [];
  const entries = Object.entries(details);
  const descriptionKeys = new Set(
    entries
      .map(([key]) => key)
      .filter((key) => Object.prototype.hasOwnProperty.call(details, `${key}Description`)),
  );

  return entries
    .filter(([key]) => !isDescriptionOf(key, descriptionKeys))
    .map(([key, value]) => {
      const descValue = details[`${key}Description`];
      if (typeof descValue === 'string' && descValue.trim()) {
        const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
        if (obj && isNestedPaymentBlock(obj)) {
          return {
            key,
            label: fmtLabel(key),
            rendered: {
              kind: 'payment-block',
              amount: formatAmount(obj.amount ?? ''),
              description: formatValue(obj.description) || '',
              refundable: formatValue(obj.refundable),
            } as DetailRender,
          };
        }
        return {
          key,
          label: fmtLabel(key),
          rendered: { kind: 'chip', text: descValue.trim() },
        };
      }
      const rendered = renderDetail(value);
      return rendered ? { key, label: fmtLabel(key), rendered } : null;
    })
    .filter(
      (item): item is { key: string; label: string; rendered: DetailRender } => item !== null,
    );
}

function isDescriptionOf(key: string, baseKeysWithDescription: Set<string>): boolean {
  return (
    key.endsWith('Description') && baseKeysWithDescription.has(key.slice(0, -'Description'.length))
  );
}

function isNumeric(value: string): boolean {
  const num = parseFloat(value);
  return !Number.isNaN(num) && String(num) === value;
}

export function EvaluationCard({
  name,
  evaluation,
  showStatus = true,
}: {
  name: string;
  evaluation: PolicyEvaluation;
  showStatus?: boolean;
}) {
  const statusType = showStatus ? resolveStr(evaluation.status?.type) : '';
  const { className, Icon } = statusStyle(statusType);
  const resultStr = formatValue(evaluation.result);
  const isLongResult = resultStr.length > 50;

  const detailItems = buildDetailItems(evaluation.details);
  const isShortChip = (d: (typeof detailItems)[number]) =>
    d.rendered.kind === 'chip' && d.rendered.text.length <= 50;
  const chipItems = detailItems.filter(
    (d): d is { key: string; label: string; rendered: { kind: 'chip'; text: string } } =>
      isShortChip(d),
  );
  const blockItems = detailItems.filter((d) => !isShortChip(d));

  const isPendingMessage =
    resultStr &&
    !isNumeric(resultStr) &&
    (resultStr.toLowerCase().includes("couldn't determine") ||
      resultStr.toLowerCase().includes('could not determine') ||
      resultStr.toLowerCase().includes('not available') ||
      resultStr.toLowerCase().includes('pending'));

  const showResult = resultStr && !isPendingMessage;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2 text-xs">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-foreground text-sm">{name}</span>
        {statusType && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
          >
            <Icon className="h-3 w-3" />
            {fmtLabel(statusType)}
          </span>
        )}
        {showStatus && evaluation.condition === false && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
            Not yet active
          </span>
        )}
      </div>

      {/* Description */}
      {evaluation.description && (
        <p className="text-muted-foreground/80 leading-relaxed">{evaluation.description}</p>
      )}

      {/* Result - pending message style */}
      {isPendingMessage && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/5 border border-amber-200/50 px-2.5 py-1.5 text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px]">{resultStr}</span>
        </div>
      )}

      {/* Result - numeric/short result */}
      {showResult && !isLongResult && (
        <div className="flex items-center gap-1.5">
          {isNumeric(resultStr) && (
            <span className="p-1 rounded-md bg-primary/5 text-primary">
              <IndianRupee className="h-3 w-3" />
            </span>
          )}
          <span className="text-muted-foreground/70">
            Result:{' '}
            <span
              className={`font-semibold text-foreground ${isNumeric(resultStr) ? 'text-base' : ''}`}
            >
              {isNumeric(resultStr) ? (
                <>
                  <span className="text-xs text-muted-foreground mr-0.5">₹</span>
                  {formatAmount(resultStr)}
                </>
              ) : (
                resultStr
              )}
            </span>
          </span>
        </div>
      )}

      {/* Result - long result */}
      {showResult && isLongResult && <p className="text-foreground leading-relaxed">{resultStr}</p>}

      {/* Chip items */}
      {chipItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {chipItems.map((d) => (
            <span
              key={d.key}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground"
            >
              <span className="font-medium">{d.label}:</span>
              <span className="text-foreground">{d.rendered.text}</span>
            </span>
          ))}
        </div>
      )}

      {/* Block items */}
      {blockItems.map((d) => (
        <div key={d.key} className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
            {d.label}
          </p>
          {d.rendered.kind === 'checklist' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 divide-y divide-border/30 overflow-hidden">
              {d.rendered.items.map((item) => (
                <label
                  key={item.label}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 cursor-not-allowed hover:bg-muted/20"
                >
                  <span className="text-xs text-foreground">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.ok}
                    disabled
                    className="h-3.5 w-3.5 accent-primary disabled:opacity-100"
                  />
                </label>
              ))}
            </div>
          ) : d.rendered.kind === 'payment-block' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 space-y-1">
              {d.rendered.refundable && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-foreground">
                    <span className="text-xs text-muted-foreground mr-0.5">₹</span>
                    {d.rendered.amount}
                  </span>
                </div>
              )}
              {d.rendered.description && (
                <p className="text-[11px] text-muted-foreground/70">{d.rendered.description}</p>
              )}
              {d.rendered.refundable && (
                <div className="flex justify-between items-center pt-0.5 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">Refundable</span>
                  <span
                    className={`text-[10px] font-medium ${d.rendered.refundable === 'Yes' || d.rendered.refundable === 'true' ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {d.rendered.refundable}
                  </span>
                </div>
              )}
            </div>
          ) : d.rendered.kind === 'block' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 divide-y divide-border/30 overflow-hidden">
              {d.rendered.rows.map(([k, v, desc]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {fmtLabel(k)}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-foreground">{v}</span>
                    {desc && <p className="text-[10px] text-muted-foreground/60">{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : d.rendered.kind === 'date-chip' ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
              {d.rendered.text}
            </span>
          ) : (
            <p className="text-xs text-foreground leading-relaxed">{d.rendered.text}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function EvaluationList({
  evaluations,
  loading,
  showStatus = true,
}: {
  evaluations?: PolicyEvaluationMap | null;
  loading?: boolean;
  showStatus?: boolean;
}) {
  const entries = Object.entries(evaluations ?? {});
  if (entries.length === 0) {
    if (!loading) return null;
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 animate-pulse" />
        <span className="italic">Evaluating policies...</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map(([name, evaluation]) => (
        <EvaluationCard key={name} name={name} evaluation={evaluation} showStatus={showStatus} />
      ))}
    </div>
  );
}

export function PolicyItemCard({
  auctionId,
  policyId,
  name,
  type,
  evaluations,
  loadingEvaluation,
  showStatus = true,
  editable,
  onEdit,
  deletable,
  onDeleted,
  deleteConfirmDescription,
}: {
  auctionId: string;
  policyId?: string;
  name?: string;
  type?: unknown;
  evaluations?: PolicyEvaluationMap | null;
  loadingEvaluation?: boolean;
  showStatus?: boolean;
  editable?: boolean;
  onEdit?: () => void;
  deletable?: boolean;
  onDeleted?: () => void;
  deleteConfirmDescription?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!policyId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await auctionsApi.deleteAuctionPolicy(auctionId, policyId);
      setConfirmOpen(false);
      onDeleted?.();
    } catch {
      setDeleteError('Failed to delete policy. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {name || fmtLabel(type) || 'Policy'}
          </span>
          {type != null && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {fmtLabel(type)}
            </Badge>
          )}
        </div>
        {(editable || deletable) && (
          <div className="flex items-center gap-1 shrink-0">
            {editable && onEdit && (
              <Tip label="Edit">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
            {deletable && policyId && (
              <Tip label="Delete">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
          </div>
        )}
      </div>

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      <EvaluationList
        evaluations={evaluations}
        loading={loadingEvaluation}
        showStatus={showStatus}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete policy?"
        description={
          deleteConfirmDescription ??
          'This removes the policy and its related workflow steps. This action cannot be undone.'
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmOpen(false)}
      />
    </div>
  );
}
