'use client';

import { Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@repo/ui';
import type { PolicyItemRQ, PolicyEvaluationMap } from '@repo/api';
import { fmtLabel } from './PolicyShared';
import { EvaluationList } from './PolicyEvaluationDisplay';

function parseWindowMinutes(duration?: string): number {
  if (!duration) return 0;
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  return (h ? parseInt(h[1]!, 10) : 0) * 60 + (m ? parseInt(m[1]!, 10) : 0);
}

function formatOffset(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Pulls the evaluated absolute window ("28 Aug, 2026 5:00AM IST" → "…6:00AM IST")
 *  or the "Applicable till the end of Auction" alt text out of a child policy's
 *  bulk-evaluation details, so headers can show real datetimes when available. */
function evaluatedWindow(
  evaluations?: PolicyEvaluationMap,
): { from: string; to: string } | { alt: string } | null {
  const evaluation = Object.values(evaluations ?? {}).find(Boolean);
  const details = evaluation?.details;
  if (!details) return null;
  const rawWindow = details.timeWindow;
  if (rawWindow && typeof rawWindow === 'object' && !Array.isArray(rawWindow)) {
    const first = Object.entries(rawWindow)[0];
    if (first?.[0] && first[1]) return { from: String(first[0]), to: String(first[1]) };
  }
  if (typeof details.timeWindowAlt === 'string' && details.timeWindowAlt.trim()) {
    return { alt: details.timeWindowAlt.trim() };
  }
  return null;
}

const STEP_COLORS = [
  { bar: 'bg-amber-500', border: 'border-amber-500/40' },
  { bar: 'bg-emerald-500', border: 'border-emerald-500/40' },
  { bar: 'bg-blue-500', border: 'border-blue-500/40' },
  { bar: 'bg-indigo-500', border: 'border-indigo-500/40' },
  { bar: 'bg-violet-500', border: 'border-violet-500/40' },
  { bar: 'bg-rose-500', border: 'border-rose-500/40' },
];

/** Renders a single PRICE_PROGRESSION wrapper's nested windows as a vertical
 *  timeline (left rail + colored dots), matching the auction view's outer
 *  lifecycle timeline — each window is defined by a `windowDuration` time
 *  offset, so the stages read top-to-bottom in the order they apply. */
export function PriceProgressionTimeline({
  wrapper,
  evaluationsByPolicyId,
}: {
  wrapper: PolicyItemRQ;
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
  const windows = wrapper.policies ?? [];
  if (windows.length === 0) return null;

  const nodes = windows.reduce<{ w: PolicyItemRQ; i: number; rangeLabel: string; end: number }[]>(
    (acc, w, i) => {
      const isLast = i === windows.length - 1;
      const duration = parseWindowMinutes(w.windowDuration);
      const start = acc.length > 0 ? acc[acc.length - 1]!.end : 0;
      const rangeLabel = isLast
        ? `${formatOffset(start)} → End`
        : `${formatOffset(start)} – ${formatOffset(start + duration)}`;
      return [...acc, { w, i, rangeLabel, end: start + duration }];
    },
    [],
  );

  return (
    <div className="relative pl-6 border-l-2 border-primary/20 space-y-4">
      {nodes.map(({ w, i, rangeLabel }, idx) => {
        const color = STEP_COLORS[idx % STEP_COLORS.length]!;
        // Prefer the evaluated absolute window when the bulk evaluation has
        // resolved one; fall back to the relative offset label otherwise.
        const abs = (() => {
          const ev = w.id ? evaluatedWindow(evaluationsByPolicyId?.[w.id]) : null;
          return ev && 'from' in ev ? ev : null;
        })();
        const headerLabel = abs ? `${abs.from} → ${abs.to}` : rangeLabel;
        return (
          <div key={i} className="relative">
            <div
              className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full ${color.bar} ring-4 ring-background`}
            />
            <div className={`rounded-lg border ${color.border} bg-card overflow-hidden`}>
              <div
                className={`px-3 py-1.5 ${color.bar} text-white text-[11px] font-bold flex items-center gap-1.5`}
              >
                <Clock className="h-3 w-3" />
                {headerLabel}
              </div>
              <div className="p-3 space-y-2">
                {abs && (
                  <p className="text-[10px] text-muted-foreground/60">
                    Relative position: {rangeLabel}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">
                    {w.name || fmtLabel(w.type) || 'Price change'}
                  </span>
                </div>
                {w.type && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {fmtLabel(w.type)}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {w.value != null && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
                      <span className="font-medium">Value:</span>
                      <span className="text-foreground">{w.value}</span>
                    </span>
                  )}
                  {w.steps && w.steps.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
                      <span className="font-medium">Steps:</span>
                      <span className="text-foreground">{w.steps.join(', ')}</span>
                    </span>
                  )}
                </div>
                {w.id && evaluationsByPolicyId?.[w.id] && (
                  <EvaluationList evaluations={evaluationsByPolicyId[w.id]} showStatus={false} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
