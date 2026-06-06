import { Check } from 'lucide-react';

const STEPS = ['Details', 'Media', 'Custom Properties'];

interface StepIndicatorProps {
  current: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
  /** In edit mode all steps are navigable, not just completed ones */
  editMode?: boolean;
}

export function StepIndicator({ current, onStepClick, editMode }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-8 px-8 max-w-lg">
      {STEPS.map((label, i) => {
        const s = (i + 1) as 1 | 2 | 3;
        const done = s < current;
        const active = s === current;
        const clickable = !!onStepClick && (editMode ? !active : done);

        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
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
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                } ${clickable ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-400/40' : ''}`}
              >
                {done ? <Check className="h-4 w-4" /> : s}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {/* Connector line — not after last */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 mb-5 transition-colors ${done ? 'bg-emerald-500' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
