'use client';

import { CheckCircle2, GitFork } from 'lucide-react';
import { TimelineItem } from './TimelineItem';
import { TimelineNode } from './types';
import { humanizeIsoDuration } from '../../_components/PolicyShared';
import { formatDateTime } from '@/components/common/admin/format';
import { AuctionVM } from '@repo/api';

interface WorkflowStage {
  id: string;
  label: string;
  phase: string;
  dotClassName: string;
  textClassName: string;
  dateLine?: string;
  subLine?: string;
  nodes: TimelineNode[];
}

interface WorkflowStagesTimelineProps {
  preAuctionNodes: TimelineNode[];
  postAuctionNodes: TimelineNode[];
  auction: AuctionVM;
}

export function WorkflowStagesTimeline({
  preAuctionNodes,
  postAuctionNodes,
  auction,
}: WorkflowStagesTimelineProps) {
  const stages: WorkflowStage[] = [];

  // Pre-auction stage
  if (preAuctionNodes.length > 0) {
    const startIso = auction.schedule?.startTime ?? auction.startTime;
    stages.push({
      id: 'pre-auction',
      label: 'Pre Auction',
      phase: 'PRE_AUCTION',
      dotClassName: 'bg-rose-500',
      textClassName: 'text-rose-600 dark:text-rose-400',
      dateLine: startIso ? `Before — ${formatDateTime(startIso)}` : undefined,
      subLine:
        'Steps that must be completed before the auction starts (registration, payment, verification).',
      nodes: preAuctionNodes,
    });
  }

  // Auction marker stage
  if (auction.schedule?.startTime) {
    stages.push({
      id: 'auction-start-marker',
      label: 'Auction Start',
      phase: 'AUCTION',
      dotClassName: 'bg-emerald-500',
      textClassName: 'text-emerald-600 dark:text-emerald-400',
      dateLine: `Auction opens — ${formatDateTime(auction.schedule.startTime)}`,
      nodes: [],
    });
  }

  // Post-auction stage
  if (postAuctionNodes.length > 0) {
    const endIso = auction.schedule?.endTime ?? auction.endTime;
    stages.push({
      id: 'post-auction',
      label: 'Post Auction',
      phase: 'POST_AUCTION',
      dotClassName: 'bg-indigo-500',
      textClassName: 'text-indigo-600 dark:text-indigo-400',
      dateLine: endIso ? `After — ${formatDateTime(endIso)}` : undefined,
      subLine:
        'Steps that occur after the auction closes (winner determination, payment settlement).',
      nodes: postAuctionNodes,
    });
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
        <div className="p-3 rounded-full bg-muted text-muted-foreground">
          <GitFork className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">No workflow steps configured</p>
      </div>
    );
  }

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

          const currentDate = getCleanDate(stage.dateLine);
          const nextDate = nextStage ? getCleanDate(nextStage.dateLine) : null;

          if (currentDate && nextDate) {
            const diffMs = nextDate.getTime() - currentDate.getTime();
            if (diffMs > 0) {
              durationToNext = humanizeIsoDuration(diffMs);
            }
          }

          // For stages with nodes, render them in a nested structure
          const stageDetails =
            stage.nodes.length > 0 ? (
              <div className="relative space-y-2">
                <div className="absolute left-[197px] top-6 bottom-6 w-0.5 bg-border z-0" />
                {stage.nodes.map((node, i) => {
                  const nodeIsLast = i === stage.nodes.length - 1;
                  const nextNode = !nodeIsLast ? stage.nodes[i + 1] : null;

                  // Calculate duration between nodes
                  let nodeDurationToNext: string | null = null;
                  if (node.time && nextNode?.time) {
                    try {
                      const from = new Date(node.time);
                      const to = new Date(nextNode.time);
                      const diffMs = to.getTime() - from.getTime();
                      if (diffMs > 0) {
                        nodeDurationToNext = humanizeIsoDuration(diffMs);
                      }
                    } catch {
                      // ignore
                    }
                  }

                  return (
                    <TimelineItem
                      key={node.id}
                      time={node.time}
                      timeTo={node.timeTo}
                      actionLabel={node.label}
                      icon={<node.Icon className={`h-5 w-5 ${node.labelClass}`} />}
                      title={node.title}
                      description={node.subs?.[0]}
                      badge={node.label}
                      badgeClass={node.labelClass}
                      subs={node.subs?.slice(1) ?? []}
                      details={node.details}
                      isLast={nodeIsLast && isLast}
                      durationToNext={nodeDurationToNext}
                    />
                  );
                })}
              </div>
            ) : undefined;

          const iconMap: Record<string, React.ReactNode> = {
            'pre-auction': <GitFork className="h-5 w-5 text-rose-600" />,
            'auction-start-marker': <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
            'post-auction': <GitFork className="h-5 w-5 text-indigo-600" />,
          };

          const isMarkerStage = stage.id === 'auction-start-marker';

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
              icon={iconMap[stage.id] || <GitFork className="h-5 w-5" />}
              description={stage.subLine}
              badge={stage.label}
              badgeClass={stage.textClassName}
              details={stageDetails}
              isLast={isLast}
              durationToNext={durationToNext}
              noCard={isMarkerStage}
            />
          );
        })}
      </div>
    </div>
  );
}
