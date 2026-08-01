'use client';

import { StepIndicator as BaseStepIndicator } from '@/components/common/admin/StepIndicator';

const LISTING_STEPS = ['Details', 'Media', 'Custom Properties'];

/** Listing-wizard step indicator — uses flex connectors because labels can be
 *  longer and the page is wider than the auction wizard.
 *
 *  Exports both `StepIndicator` (legacy name kept for existing imports) and
 *  `StepIndicatorListing` for new code. */
export function StepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
  editMode?: boolean;
}) {
  return (
    <BaseStepIndicator
      steps={LISTING_STEPS}
      current={current}
      onStepClick={(s) => onStepClick?.(s as 1 | 2 | 3)}
      editMode={editMode}
      connector="flex"
    />
  );
}

export function StepIndicatorListing(props: React.ComponentProps<typeof StepIndicator>) {
  return <StepIndicator {...props} />;
}
