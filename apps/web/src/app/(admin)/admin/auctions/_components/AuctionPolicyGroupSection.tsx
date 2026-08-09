'use client';

import { Badge } from '@repo/ui';
import { PolicyItemRQ, PolicyEvaluationMap } from '@repo/api';
import { PolicyItemCard } from './PolicyEvaluationDisplay';
import { PriceProgressionTimeline } from './PolicyPriceProgressionTimeline';
import { POLICY_CATEGORY_DESCRIPTIONS } from './PolicyShared';

export function descriptionForGroup(key: string): string | undefined {
  return POLICY_CATEGORY_DESCRIPTIONS[key] ?? POLICY_CATEGORY_DESCRIPTIONS[key.toUpperCase()];
}

export function PolicyGroupSection({
  auctionId,
  groupKey,
  items,
  evaluationsByPolicyId,
}: {
  auctionId: string;
  groupKey: string;
  items: PolicyItemRQ[];
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
  const description = descriptionForGroup(groupKey);
  const isPriceProgression = groupKey.toUpperCase() === 'PRICE_PROGRESSION';
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {groupKey}
          </span>
          {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {items.length} policy item{items.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      {isPriceProgression ? (
        <div className="space-y-4">
          {items.map((wrapper, i) => (
            <PriceProgressionTimeline
              key={i}
              wrapper={wrapper}
              evaluationsByPolicyId={evaluationsByPolicyId}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
          {items.map((item, i) => {
            const isLastOfOdd = i === items.length - 1 && items.length % 2 === 1;
            if (item.policies?.length) {
              return (
                <div key={i} className={`space-y-2 ${isLastOfOdd ? 'sm:col-span-2' : ''}`}>
                  <PolicyItemCard
                    auctionId={auctionId}
                    policyId={item.id}
                    name={item.name}
                    type={item.type}
                    evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
                    showStatus={true}
                  />
                  {item.policies.map((nested, j) => (
                    <div key={j} className="pl-4 border-l-2 border-primary/20">
                      <PolicyItemCard
                        auctionId={auctionId}
                        policyId={nested.id}
                        name={nested.name}
                        type={nested.type}
                        evaluations={nested.id ? evaluationsByPolicyId?.[nested.id] : undefined}
                        showStatus={true}
                      />
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} className={isLastOfOdd ? 'sm:col-span-2' : ''}>
                <PolicyItemCard
                  auctionId={auctionId}
                  policyId={item.id}
                  name={item.name}
                  type={item.type}
                  evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
                  showStatus={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
