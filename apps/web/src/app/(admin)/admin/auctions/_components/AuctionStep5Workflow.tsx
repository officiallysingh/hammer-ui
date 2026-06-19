'use client';

import { ArrowLeft, ArrowRight, Construction } from 'lucide-react';
import { Button } from '@repo/ui';

interface Props {
  onBack: () => void;
  onFinish: () => void;
}

export function AuctionStep5Workflow({ onBack, onFinish }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-16 flex flex-col items-center justify-center gap-3 text-center">
        <Construction className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">Workflow</p>
        <p className="text-xs text-muted-foreground/70">Yet to be implemented</p>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="button" onClick={onFinish} className="gap-2">
          Finish
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
