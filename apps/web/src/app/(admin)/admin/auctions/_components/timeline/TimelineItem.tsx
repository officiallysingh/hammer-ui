'use client';

import { CheckCircle2 } from 'lucide-react';
import { NestedChild } from './types';

interface TimelineItemProps {
  time?: string;
  timeTo?: string;
  actionLabel?: string;
  icon: React.ReactNode;
  title?: string;
  description?: string;
  badge?: string;
  badgeClass?: string;
  subs?: string[];
  children?: NestedChild[];
  childrenTitle?: string;
  childrenBadge?: string;
  /** Rich, step-type-specific detail body rendered below the simple subs list. */
  details?: React.ReactNode;
  userTip?: string;
  isLast?: boolean;
  durationToNext?: string | null;
  /** When true, renders the content without the card box (for simple marker stages). */
  noCard?: boolean;
}

export function TimelineItem({
  time,
  timeTo,
  actionLabel,
  icon,
  title,
  description,
  badge,
  badgeClass = 'bg-muted text-muted-foreground',
  subs = [],
  children,
  childrenTitle,
  childrenBadge,
  details,
  userTip,
  isLast = false,
  durationToNext,
  noCard = false,
}: TimelineItemProps) {
  return (
    <div className="relative">
      {/* ===== NODE ===== */}
      <div className="flex items-start gap-6 relative z-10">
        {/* LEFT – Date / Time */}
        <div className="w-[150px] text-right pt-3 shrink-0">
          {time ? (
            <>
              <p className="text-sm font-bold text-foreground leading-tight">{time}</p>
              {timeTo && <p className="text-xs text-muted-foreground mt-0.5">→ {timeTo}</p>}
              {actionLabel && <p className="text-xs text-muted-foreground mt-1">{actionLabel}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic pt-1">{actionLabel || '—'}</p>
          )}
        </div>

        {/* CENTER – Icon */}
        <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-background shadow-sm shrink-0 bg-muted/50">
          {icon}
        </div>

        {/* RIGHT – Content */}
        <div className="flex-1 pt-3">
          {noCard ? (
            badge && (
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
              >
                {badge}
              </span>
            )
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              {badge && (
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
                  >
                    {badge}
                  </span>
                </div>
              )}

              {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
              )}

              {/* Nested children */}
              {children && children.length > 0 && (
                <div className="mt-5 rounded-lg border border-border/60 bg-card p-4 space-y-4">
                  {(childrenTitle || childrenBadge) && (
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      {childrenTitle && (
                        <span className="text-sm font-semibold text-foreground truncate">
                          {childrenTitle}
                        </span>
                      )}
                      {childrenBadge && (
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground bg-secondary/50">
                          {childrenBadge}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="relative space-y-4">
                    {/* Continuous line for the nested timeline */}
                    <div className="absolute left-[128px] top-2 bottom-4 w-0.5 bg-border" />

                    {children.map((child) => (
                      <div key={child.id} className="relative flex gap-4">
                        <div className="w-28 text-right shrink-0 pt-1 z-10">
                          {child.time ? (
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                              {child.time}
                              {child.timeTo && (
                                <>
                                  <br />
                                  <span className="text-[10px] text-muted-foreground">→</span>
                                  <br />
                                  {child.timeTo}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>

                        <div className="relative flex-1">
                          <div className="absolute -left-[5px] top-2 w-3 h-3 rounded-full bg-background border-2 border-blue-500 z-10" />

                          <div className="pl-5">
                            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                              <h4 className="text-sm font-semibold text-foreground">
                                {child.name}
                              </h4>
                              {child.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {child.description}
                                </p>
                              )}
                              {child.tags && child.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {child.tags.map((tag, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                                    >
                                      {tag.label}
                                      {tag.value && (
                                        <span className="ml-1 font-medium">{tag.value}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simple subs */}
              {subs.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {subs.map((sub, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              )}

              {details && <div className="mt-3">{details}</div>}

              {userTip && (
                <div className="mt-4 flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg px-3 py-2">
                  <span>{userTip}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== DURATION – vertically + horizontally centered on the line ===== */}
      {!isLast && (
        <div className="flex items-center gap-6 h-16">
          {/* LEFT column */}
          <div className="w-[150px] shrink-0" />

          {/* CENTER – same width as icon, so pill sits on the vertical line */}
          <div className="w-12 flex justify-center shrink-0 relative z-20">
            {durationToNext ? (
              <div className="bg-background border border-border text-muted-foreground text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                {durationToNext}
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
            )}
          </div>

          {/* RIGHT empty */}
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
