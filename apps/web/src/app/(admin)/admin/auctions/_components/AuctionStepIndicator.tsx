'use client';

export function AuctionStepIndicator({
  current,
  onStepClick,
  editMode,
}: {
  current: number;
  onStepClick?: (step: number) => void;
  editMode?: boolean;
}) {
  const steps = ['Details', 'Units', 'Media', 'Policies', 'Workflow'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        const clickable = !!onStepClick && (editMode ? !active : done);
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onStepClick(s) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onStepClick(s);
                      }
                    : undefined
                }
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                } ${clickable ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-400/40' : ''}`}
              >
                {done ? '✓' : s}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 mb-4 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
