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

/** Renders a single PRICE_PROGRESSION wrapper's nested windows as a left-to-right
 *  timeline, since each window is defined by a `windowDuration` time offset rather
 *  than being just an unordered list of cards. */
export function PriceProgressionTimeline({
  wrapper,
  evaluationsByPolicyId,
}: {
  wrapper: PolicyItemRQ;
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
  const windows = wrapper.priceChangePolicies ?? [];
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
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 -mx-1 px-1">
        {nodes.map(({ w, i, rangeLabel }, idx) => (
          <div key={i} className="flex items-start flex-1 min-w-[16rem]">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {rangeLabel}
                </span>
              </div>

              <div className="w-full rounded-xl border border-border bg-card p-3 space-y-2">
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
                  <EvaluationList evaluations={evaluationsByPolicyId[w.id]} />
                )}
              </div>
            </div>

            {idx < nodes.length - 1 && (
              <div className="w-6 h-5 mt-2 shrink-0 flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-primary/50 to-primary/10 rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
