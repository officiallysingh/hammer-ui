import { Check } from 'lucide-react';

const STEPS = ['Details', 'Media', 'Catalog'];

interface StepIndicatorProps {
  current: 1 | 2 | 3;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-8 px-8 max-w-lg">
      {STEPS.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
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
                className={`flex-1 h-0.5 mx-4 mb-5 transition-colors ${done ? 'bg-primary' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
