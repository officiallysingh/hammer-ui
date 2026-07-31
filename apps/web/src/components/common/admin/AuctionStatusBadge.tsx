'use client';

import { Activity, AlertCircle, Clock, Info, ShieldCheck, type LucideIcon } from 'lucide-react';

/** Unified auction-status visual mapping shared by the list, view, and step
 *  pages. The colors here are the single source of truth — keep them in sync
 *  with any backend enums you add. */
const STATUS_CONFIG: Record<
  string,
  { bg: string; icon: LucideIcon; animate?: boolean; label?: string }
> = {
  CREATED: { bg: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Info },
  SCHEDULED: { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  RUNNING: {
    bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: Activity,
    animate: true,
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    icon: ShieldCheck,
  },
  CANCELLED: { bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30', icon: AlertCircle },
};

function resolveStr(value?: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

function formatLabel(value?: unknown): string {
  const str = resolveStr(value);
  if (!str) return '—';
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Shared auction-status badge. Use `size="sm"` for table cells, `"md"` for
 *  headers (default), and pass `showIcon={false}` to render text-only. */
export function StatusBadge({
  value,
  size = 'md',
  showIcon = true,
}: {
  value?: unknown;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}) {
  const str = resolveStr(value);
  if (!str) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const cfg = STATUS_CONFIG[str] ?? {
    bg: 'bg-muted text-muted-foreground border-border',
    icon: Info,
  };
  const Icon = cfg.icon;
  const sizeCls =
    size === 'sm'
      ? 'gap-1 px-2 py-0.5 text-xs font-medium'
      : 'gap-1.5 px-3 py-1 text-xs font-semibold';
  const iconCls = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span className={`inline-flex items-center rounded-full border ${sizeCls} ${cfg.bg}`}>
      {showIcon && <Icon className={`${iconCls} ${cfg.animate ? 'animate-pulse' : ''}`} />}
      {formatLabel(str)}
    </span>
  );
}
