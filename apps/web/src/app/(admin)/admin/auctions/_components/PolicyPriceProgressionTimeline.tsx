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

const STEP_COLORS = [
  { bar: 'bg-amber-500', border: 'border-amber-500/40' },
  { bar: 'bg-emerald-500', border: 'border-emerald-500/40' },
  { bar: 'bg-blue-500', border: 'border-blue-500/40' },
  { bar: 'bg-indigo-500', border: 'border-indigo-500/40' },
  { bar: 'bg-violet-500', border: 'border-violet-500/40' },
  { bar: 'bg-rose-500', border: 'border-rose-500/40' },
];

/** Renders a single PRICE_PROGRESSION wrapper's nested windows as a horizontal
 *  timeline — a shared spine with steps alternating above/below it — since each
 *  window is defined by a `windowDuration` time offset, not an unordered list. */
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
    <div className="overflow-x-auto pb-2 pt-1 -mx-1 px-1">
      <div
        className="grid gap-x-6"
        style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(15rem, 1fr))` }}
      >
        {/* Spine — one continuous bar, colored per-step to match each node below it */}
        <div className="flex" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
          {nodes.map((_, idx) => (
            <div
              key={`spine-${idx}`}
              className={`h-2 flex-1 ${STEP_COLORS[idx % STEP_COLORS.length]!.bar} ${
                idx === 0 ? 'rounded-l-full' : ''
              } ${idx === nodes.length - 1 ? 'rounded-r-full' : ''}`}
            />
          ))}
        </div>

        {nodes.map(({ w, i, rangeLabel }, idx) => {
          const above = idx % 2 === 0;
          const color = STEP_COLORS[idx % STEP_COLORS.length]!;
          const rangeBar = (
            <div
              className={`px-3 py-1.5 ${color.bar} text-white text-[11px] font-bold flex items-center gap-1.5`}
            >
              <Clock className="h-3 w-3" />
              {rangeLabel}
            </div>
          );
          const card = (
            <div className={`w-full rounded-lg border ${color.border} bg-card overflow-hidden`}>
              {!above && rangeBar}
              <div className="p-3 space-y-2">
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
              {above && rangeBar}
            </div>
          );

          return (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{
                gridColumn: idx + 1,
                gridRow: above ? 1 : 3,
                alignSelf: above ? 'end' : 'start',
              }}
            >
              {above && card}
              <div className={`w-1 h-5 shrink-0 ${color.bar}`} />
              {!above && card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
