'use client';

import type { PolicyEvaluationMap } from '@repo/api';
import { PolicyInfoButton } from './PolicyShared';
import { EvaluationList } from './PolicyEvaluationDisplay';

interface Props {
  enabled: boolean;
  name: string;
  description: string;
  onToggle: (enabled: boolean) => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  groupDescription?: string;
  evaluations?: PolicyEvaluationMap;
}

export function PolicyParticipationSection({
  enabled,
  name,
  description,
  onToggle,
  onNameChange,
  onDescriptionChange,
  groupDescription,
  evaluations,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Participation</h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Enable
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Auction Participation Policy"
                className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Brief description"
                rows={1}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {evaluations && <EvaluationList evaluations={evaluations} />}
    </div>
  );
}
