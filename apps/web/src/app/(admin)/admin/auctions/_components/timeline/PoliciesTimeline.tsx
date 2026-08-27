'use client';

import { Users, TrendingUp, Trophy, Clock, ShieldCheck } from 'lucide-react';
import { NestedChild } from './types';
import { TimelineItem } from './TimelineItem';
import { humanizeIsoDuration, parseIsoDurationMs, fmtLabel } from '../../_components/PolicyShared';
import { formatDateTime } from '@/components/common/admin/format';
import { AuctionVM, PolicyItemRQ } from '@repo/api';

interface PolicyStage {
  id: string;
  label: string;
  dotClassName: string;
  textClassName: string;
  dateLine?: string;
  subLine?: string;
  groups: [string, PolicyItemRQ[]][];
}

interface PoliciesTimelineProps {
  stages: PolicyStage[];
  auction: AuctionVM;
}

export function PoliciesTimeline({ stages, auction }: PoliciesTimelineProps) {
  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
        <div className="p-3 rounded-full bg-muted text-muted-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">No policies configured</p>
      </div>
    );
  }

  // Helper to extract a clean date string from dateLine
  const getCleanDate = (dateLine?: string): Date | null => {
    if (!dateLine) return null;
    try {
      const clean = dateLine.includes('—') ? dateLine.split('—')[1]?.trim() : dateLine;
      const d = new Date(clean || '');
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  return (
    <div className="relative">
      {/* Main vertical line – centered on icons */}
      <div className="absolute left-[198px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-0">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const nextStage = !isLast ? stages[idx + 1] : null;

          // Calculate duration between current and next stage
          let durationToNext: string | null = null;
          const currentDate = getCleanDate(stage.dateLine);
          const nextDate = getCleanDate(nextStage?.dateLine);

          if (currentDate && nextDate) {
            const diffMs = nextDate.getTime() - currentDate.getTime();
            if (diffMs > 0) {
              durationToNext = humanizeIsoDuration(diffMs);
            }
          }

          // Build nested children for price progression
          const nestedChildren: NestedChild[] = [];
          if (stage.id === 'auction-running') {
            const auctionStartMs = auction.schedule?.startTime
              ? new Date(auction.schedule.startTime).getTime()
              : null;
            const auctionEndMs = auction.schedule?.endTime
              ? new Date(auction.schedule.endTime).getTime()
              : null;

            let cum = 0;
            stage.groups
              .filter(([key]) => key.toUpperCase() === 'PRICE_PROGRESSION')
              .forEach(([, items]) => {
                items.forEach((wrapper) => {
                  (wrapper.policies ?? []).forEach((child, ci) => {
                    const isLastChild = ci === (wrapper.policies?.length ?? 0) - 1;
                    const dur = parseIsoDurationMs(child.windowDuration);
                    const fromMs = auctionStartMs != null ? auctionStartMs + cum : null;
                    const toMs =
                      fromMs != null && auctionEndMs != null
                        ? isLastChild || dur === 0
                          ? auctionEndMs
                          : fromMs + dur
                        : null;
                    cum += dur;

                    nestedChildren.push({
                      id: child.id ?? `child-${ci}`,
                      time: fromMs ? formatDateTime(new Date(fromMs).toISOString()) : undefined,
                      timeTo: toMs ? formatDateTime(new Date(toMs).toISOString()) : undefined,
                      name: child.name || fmtLabel(child.type) || 'Price change',
                      description: child.description,
                      tags: (
                        [
                          child.value != null ? { label: 'Step', value: `₹${child.value}` } : null,
                          (child.steps?.length ?? 0) > 0
                            ? { label: 'Multipliers', value: (child.steps ?? []).join(', ') }
                            : null,
                          {
                            label:
                              isLastChild || dur === 0 ? 'Until close' : humanizeIsoDuration(dur),
                          },
                        ] as ({ label: string; value?: string } | null)[]
                      ).filter((t): t is { label: string; value?: string } => t !== null),
                    });
                  });
                });
              });
          }

          // Chips for other policies
          const chips: string[] = [];
          if (stage.id !== 'auction-running') {
            stage.groups.forEach(([, items]) => {
              items.forEach((item) => {
                let text = item.name || fmtLabel(item.type);
                if (item.count != null) text += ` (≥ ${item.count})`;
                if (item.kth != null)
                  text += ` (${item.kth === 1 ? '1st' : item.kth + 'th'} price)`;
                chips.push(text);
              });
            });
          } else {
            stage.groups
              .filter(([key]) => key.toUpperCase() !== 'PRICE_PROGRESSION')
              .forEach(([, items]) => {
                items.forEach((item) => {
                  let text = item.name || fmtLabel(item.type);
                  if (item.duration) {
                    text += ` (${humanizeIsoDuration(parseIsoDurationMs(item.duration))})`;
                  }
                  if (item.limit === 0) text += ' • unlimited';
                  chips.push(text);
                });
              });
          }

          const iconMap: Record<string, React.ReactNode> = {
            'before-start': <Users className="h-5 w-5 text-amber-600" />,
            'auction-start': <Clock className="h-5 w-5 text-emerald-600" />,
            'auction-running': <TrendingUp className="h-5 w-5 text-blue-600" />,
            'auction-complete': <Clock className="h-5 w-5 text-indigo-600" />,
            winner: <Trophy className="h-5 w-5 text-violet-600" />,
          };

          return (
            <TimelineItem
              key={stage.id}
              time={
                stage.dateLine
                  ? stage.dateLine.includes('—')
                    ? stage.dateLine.split('—')[1]?.trim()
                    : stage.dateLine
                  : undefined
              }
              actionLabel={stage.label}
              icon={iconMap[stage.id] || <ShieldCheck className="h-5 w-5" />}
              title={stage.label}
              description={stage.subLine}
              badge={stage.label}
              badgeClass={stage.textClassName}
              subs={chips}
              isLast={isLast}
              durationToNext={durationToNext}
            >
              {nestedChildren.length > 0 ? nestedChildren : undefined}
            </TimelineItem>
          );
        })}
      </div>
    </div>
  );
}
