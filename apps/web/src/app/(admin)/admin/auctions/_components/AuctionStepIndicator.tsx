'use client';

import { StepIndicator } from '@/components/common/admin/StepIndicator';

const AUCTION_STEPS = ['Details', 'Units', 'Policies', 'Workflow', 'Schedule'];

/** Auction-wizard step indicator. In create mode only past steps are clickable;
 *  in edit mode any non-active step is clickable. */
export function AuctionStepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: number;
  onStepClick?: (step: number) => void;
  editMode?: boolean;
}) {
  return (
    <StepIndicator
      steps={AUCTION_STEPS}
      current={current}
      onStepClick={onStepClick}
      editMode={editMode}
    />
  );
}
