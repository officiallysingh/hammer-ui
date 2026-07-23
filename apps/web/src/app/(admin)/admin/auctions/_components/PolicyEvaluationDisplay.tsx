'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { PolicyEvaluation, PolicyEvaluationMap } from '@repo/api';
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

function formatResult(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'object') return resolveStr(result);
  return String(result);
}

/** Formats a `details` value for display — flattens nested objects (e.g. `{ amount, description }`). */
function formatDetailValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(formatDetailValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${fmtLabel(k)}: ${formatDetailValue(v)}`)
      .join(', ');
  }
  return String(value);
}

export function EvaluationCard({
  name,
  evaluation,
}: {
  name: string;
  evaluation: PolicyEvaluation;
}) {
  const statusType = resolveStr(evaluation.status?.type);
  const { className, Icon } = statusStyle(statusType);
  const resultStr = formatResult(evaluation.result);
  const details = Object.entries(evaluation.details ?? {})
    .map(([key, value]) => [key, formatDetailValue(value)] as const)
    .filter(([, value]) => value !== '');

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
      </div>
      {evaluation.description && <p className="text-muted-foreground">{evaluation.description}</p>}
      {resultStr && (
        <p className="text-muted-foreground">
          Result: <span className="text-foreground font-medium">{resultStr}</span>
        </p>
      )}
      {details.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {details.map(([key, value]) => (
            <span
              key={key}
              className="rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {fmtLabel(key)}: <span className="text-foreground">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvaluationList({
  evaluations,
  loading,
}: {
  evaluations?: PolicyEvaluationMap | null;
  loading?: boolean;
}) {
  const entries = Object.entries(evaluations ?? {});
  if (entries.length === 0) {
    if (!loading) return null;
    return <p className="text-[11px] text-muted-foreground italic">Evaluating…</p>;
  }
  return (
    <div className="space-y-1.5">
      {entries.map(([name, evaluation]) => (
        <EvaluationCard key={name} name={name} evaluation={evaluation} />
      ))}
    </div>
  );
}
