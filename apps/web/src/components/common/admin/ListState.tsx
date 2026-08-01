'use client';

import { Loader2, type LucideIcon } from 'lucide-react';

/** Inline loading state used below search bars / above list rows. */
export function LoadingBlock({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/** Centered empty state shown when a list has no rows. */
export function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon: LucideIcon;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Icon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
