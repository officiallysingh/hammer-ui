'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Pencil, Trash2, XCircle } from 'lucide-react';
import { auctionsApi, type PolicyEvaluation, type PolicyEvaluationMap } from '@repo/api';
import { Badge, Button } from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { fmtLabel, resolveStr } from './PolicyShared';

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

/** True for backend enum values shaped like `{ CODE: "Label" }` — render as just the label. */
function isEnumObject(value: unknown): value is Record<string, string | null> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return false;
  const [key, val] = entries[0]!;
  return /^[A-Z][A-Z0-9_]*$/.test(key) && (typeof val === 'string' || val == null);
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

function formatScalarOrEnum(value: unknown): string {
  if (isEnumObject(value)) return fmtLabel(Object.keys(value)[0]);
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return resolveStr(value);
  return String(value);
}

function formatResult(result: unknown): string {
  return formatScalarOrEnum(result);
}

type DetailRender =
  | { kind: 'chip'; text: string }
  | { kind: 'checklist'; items: { label: string; ok: boolean }[] }
  | { kind: 'block'; rows: [string, string][] };

/** Classifies a `details` value into how it should be laid out — a short inline
 *  chip, a checklist of yes/no items, or a small key/value breakdown block. */
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
    const text = value.map(formatScalarOrEnum).filter(Boolean).join(', ');
    return text ? { kind: 'chip', text } : null;
  }

  if (typeof value === 'object') {
    const rows = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [fmtLabel(k), formatScalarOrEnum(v)] as [string, string])
      .filter(([, v]) => v !== '');
    return rows.length > 0 ? { kind: 'block', rows } : null;
  }

  const text = formatScalarOrEnum(value);
  return text ? { kind: 'chip', text } : null;
}

/** Builds the display list for `evaluation.details` — when a `<key>Description`
 *  sibling exists (e.g. `deadline` + `deadlineDescription`), the human-readable
 *  description is shown under the base field's label instead of both. */
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
      const effective = typeof descValue === 'string' && descValue.trim() ? descValue : value;
      const rendered = renderDetail(effective);
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

export function EvaluationCard({
  name,
  evaluation,
  showStatus = true,
}: {
  name: string;
  evaluation: PolicyEvaluation;
  /** Set to false to hide the status/condition badges (e.g. on the read-only auction view page). */
  showStatus?: boolean;
}) {
  const statusType = showStatus ? resolveStr(evaluation.status?.type) : '';
  const { className, Icon } = statusStyle(statusType);
  const resultStr = formatResult(evaluation.result);
  const isLongResult = resultStr.length > 50;

  const detailItems = buildDetailItems(evaluation.details);
  const chipItems = detailItems.filter(
    (d): d is { key: string; label: string; rendered: { kind: 'chip'; text: string } } =>
      d.rendered.kind === 'chip',
  );
  const blockItems = detailItems.filter((d) => d.rendered.kind !== 'chip');

  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 space-y-1 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{name}</span>
        {statusType && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${className}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {fmtLabel(statusType)}
          </span>
        )}
        {showStatus && evaluation.condition === false && (
          <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Not yet active
          </span>
        )}
      </div>
      {evaluation.description && <p className="text-muted-foreground">{evaluation.description}</p>}
      {resultStr &&
        (isLongResult ? (
          <p className="text-foreground">{resultStr}</p>
        ) : (
          <p className="text-muted-foreground">
            Result: <span className="text-foreground font-medium">{resultStr}</span>
          </p>
        ))}
      {chipItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {chipItems.map((d) => (
            <span
              key={d.key}
              className="rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {d.label}: <span className="text-foreground">{d.rendered.text}</span>
            </span>
          ))}
        </div>
      )}
      {blockItems.map((d) => (
        <div key={d.key} className="pt-0.5">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{d.label}</p>
          {d.rendered.kind === 'checklist' ? (
            <div className="flex flex-wrap gap-1">
              {d.rendered.items.map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${
                    item.ok
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : 'border-border/60 bg-background text-muted-foreground'
                  }`}
                >
                  {item.ok ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <Circle className="h-2.5 w-2.5" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          ) : d.rendered.kind === 'block' ? (
            <div className="rounded-md border border-border/50 bg-background/60 px-2 py-1.5 space-y-0.5">
              {d.rendered.rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-medium">{v}</span>
                </div>
              ))}
            </div>
          ) : null}
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
    return <p className="text-[11px] text-muted-foreground italic">Evaluating…</p>;
  }
  return (
    <div className="space-y-1.5">
      {entries.map(([name, evaluation]) => (
        <EvaluationCard key={name} name={name} evaluation={evaluation} showStatus={showStatus} />
      ))}
    </div>
  );
}

// ── Reusable "evaluate-only" policy card ────────────────────────────────────────
// Shows a saved policy's name/type plus its evaluation results (never raw form
// fields), with an optional edit pencil and delete button. Shared between the
// auction edit-policies page and the workflow step view so both read-only
// surfaces look and behave identically.

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
  /** The saved policy's id. Required for delete; edit is delegated to `onEdit`. */
  policyId?: string;
  name?: string;
  type?: unknown;
  evaluations?: PolicyEvaluationMap | null;
  loadingEvaluation?: boolean;
  /** Set to false to hide each evaluation's status/condition badges. */
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
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
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
