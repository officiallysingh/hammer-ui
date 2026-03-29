import { Check } from 'lucide-react';

type Step = 'details' | 'mobile' | 'mobile_otp' | 'password';

const VISUAL_STEPS = ['details', 'mobile', 'password'];

interface StepIndicatorProps {
  current: Step;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const visualIdx = current === 'mobile_otp' ? 1 : VISUAL_STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center mb-6">
      {VISUAL_STEPS.map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
              i < visualIdx
                ? 'bg-primary text-primary-foreground'
                : i === visualIdx
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < visualIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < VISUAL_STEPS.length - 1 && (
            <div
              className={`h-0.5 w-8 mx-1 transition-colors ${i < visualIdx ? 'bg-primary' : 'bg-muted'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
