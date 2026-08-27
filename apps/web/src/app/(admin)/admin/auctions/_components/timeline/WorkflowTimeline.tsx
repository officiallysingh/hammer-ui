'use client';

import { TimelineItem } from './TimelineItem';
import { TimelineNode } from './types';
import { humanizeIsoDuration } from '../../_components/PolicyShared';

interface WorkflowTimelineProps {
  nodes: TimelineNode[];
}

export function WorkflowTimeline({ nodes }: WorkflowTimelineProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
        <p className="text-sm font-semibold">No workflow steps configured</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[198px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-0">
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;
          const nextNode = !isLast ? nodes[idx + 1] : null;

          // Calculate duration
          let durationToNext: string | null = null;
          if (node.time && nextNode?.time) {
            try {
              const from = new Date(node.time);
              const to = new Date(nextNode.time);
              const diffMs = to.getTime() - from.getTime();
              if (diffMs > 0) {
                durationToNext = humanizeIsoDuration(diffMs);
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
              badge={node.label}
              badgeClass={node.labelClass}
              subs={node.subs}
              isLast={isLast}
              durationToNext={durationToNext}
            />
          );
        })}
      </div>
    </div>
  );
}
