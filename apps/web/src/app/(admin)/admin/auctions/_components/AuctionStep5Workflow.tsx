'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button, Label, DateTimePicker, Badge } from '@repo/ui';
import { auctionsApi, AuctionWorkflowStep, AuctionParticipation, PolicyItemRQ } from '@repo/api';
import { DismissibleError, FieldError } from './AuctionShared';
import { SELECT_CLS } from './PolicyShared';
import { parseApiError } from '@/lib/api-errors';

interface Props {
  auctionId: string;
  onBack: () => void;
  onNext?: () => void;
  onFinish: () => void;
  showScheduleOnly?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalInputValue(dateValue?: string) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDuration(days: number, hours: number, minutes: number) {
  return `${days}d ${hours}h ${minutes}m`;
}

function resolveStr(value?: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

function fmtLabel(value?: unknown): string {
  const str = resolveStr(value);
  if (!str) return '';
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function NumberSelect({
  id,
  label,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLS}
      >
        {Array.from({ length: max + 1 }, (_, i) => (
          <option key={i} value={String(i)}>
            {i}
          </option>
        ))}
      </select>
    </div>
  );
}

function validateSchedule(finalStart: string, finalEnd: string): Record<string, string> {
  const errs: Record<string, string> = {};
  const now = new Date();
  const start = new Date(finalStart);
  const end = new Date(finalEnd);
  if (!finalStart || Number.isNaN(start.getTime()))
    errs.startTime = 'Start date & time is required.';
  else if (start <= now) errs.startTime = 'Start date & time must be in the future.';
  if (!finalEnd || Number.isNaN(end.getTime())) errs.endTime = 'End date & time is required.';
  else if (end <= now) errs.endTime = 'End date & time must be in the future.';
  else if (!Number.isNaN(start.getTime()) && end <= start)
    errs.endTime = 'End date & time must be after start time.';
  return errs;
}

// ── Workflow step accordion card ──────────────────────────────────────────────

function WorkflowStepCard({
  step,
  index,
  dragHandleProps,
  isDragTarget,
}: {
  step: AuctionWorkflowStep;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragTarget?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const statusType = resolveStr(step.status?.type);
  const isCompleted = statusType === 'COMPLETED';
  const isRunning = statusType === 'IN_PROGRESS' || statusType === 'RUNNING';

  const statusColor = isCompleted
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    : isRunning
      ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
      : 'bg-muted text-muted-foreground border-border';

  const bubbleClass = isCompleted
    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
    : isRunning
      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
      : 'border-border bg-muted text-muted-foreground';

  return (
    <div
      className={`rounded-xl border bg-card transition-all ${isDragTarget ? 'border-primary/60 shadow-md' : 'border-border'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Step bubble */}
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 shrink-0 ${bubbleClass}`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isRunning ? (
            <Clock className="h-3.5 w-3.5" />
          ) : (
            index + 1
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {step.name ?? fmtLabel(step.type) ?? `Step ${index + 1}`}
          </p>
          {step.type && fmtLabel(step.type) !== step.name && (
            <p className="text-[10px] text-muted-foreground truncate">{fmtLabel(step.type)}</p>
          )}
        </div>

        {/* Status */}
        {statusType && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}
          >
            {fmtLabel(statusType)}
          </span>
        )}

        {/* Expand */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/10 rounded-b-xl">
          {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {step.order != null && (
              <span className="text-muted-foreground">
                Order: <span className="text-foreground font-medium">{step.order}</span>
              </span>
            )}
            {step.implicit && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-[10px]">
                Implicit
              </span>
            )}
            {step.status?.updatedAt && (
              <span className="text-muted-foreground">
                Updated:{' '}
                <span className="text-foreground">{fmtDateTime(step.status.updatedAt)}</span>
              </span>
            )}
          </div>

          {/* Step-level policies */}
          {step.policies && step.policies.length > 0 && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Policies
              </p>
              {step.policies.map((p, pi) => (
                <div
                  key={pi}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{p.name || fmtLabel(p.type)}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {fmtLabel(p.type)}
                  </Badge>
                  {p.value != null && (
                    <span className="text-muted-foreground">
                      Value: <span className="text-foreground">{p.value}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Post-payment block ────────────────────────────────────────────────────────

function PostPaymentBlock({ policies }: { policies: PolicyItemRQ[] }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20">
        <CreditCard className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Post Payment
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          — collected after auction completes
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        {policies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No post-payment policies configured.</p>
        ) : (
          policies.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {item.name || fmtLabel(item.type)}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {fmtLabel(item.type)}
                </Badge>
              </div>
              {item.description && <p className="text-muted-foreground">{item.description}</p>}
              {item.heads && item.heads.length > 0 && (
                <div className="space-y-1 pt-1">
                  {item.heads.map((h, hi) => (
                    <div
                      key={hi}
                      className="flex flex-wrap items-center gap-2 rounded bg-muted/40 px-2 py-1 text-[11px]"
                    >
                      <span className="font-medium">{h.name || fmtLabel(h.type)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {fmtLabel(h.type)}
                      </Badge>
                      <span className="text-muted-foreground">
                        {fmtLabel(h.basis)}: <span className="text-foreground">{h.value}</span>
                      </span>
                      {h.refundable && <span className="text-emerald-600">Refundable</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuctionStep5Workflow({
  auctionId,
  onBack,
  onNext,
  onFinish,
  showScheduleOnly = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'schedule' | 'publish' | null>(null);
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [participation, setParticipation] = useState<AuctionParticipation | null>(null);
  const [postPaymentPolicies, setPostPaymentPolicies] = useState<PolicyItemRQ[]>([]);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // Schedule state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationDays, setDurationDays] = useState('0');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [scheduleMode, setScheduleMode] = useState<'duration' | 'end'>('duration');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  // Load workflow + participation + policies
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      auctionsApi.getAuctionWorkflow(auctionId).catch(() => [] as AuctionWorkflowStep[]),
      auctionsApi.getAuctionParticipation(auctionId).catch(() => null),
      auctionsApi.getAuctionPolicies(auctionId).catch(() => null),
    ])
      .then(([wf, part, pol]) => {
        if (!mounted) return;
        setWorkflow(wf);
        setParticipation(part);
        // Extract post-payment (AUCTION_END_TIME) policies — reference may be a string or { KEY: "Label" }
        const paymentItems = pol?.['PAYMENT'] ?? [];
        const postPolicies = paymentItems.filter((item) => {
          const ref = item.schedule?.reference;
          const refKey = typeof ref === 'string' ? ref : ref ? Object.keys(ref as object)[0] : '';
          return refKey === 'AUCTION_END_TIME';
        });
        setPostPaymentPolicies(postPolicies);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auctionId]);

  // Reorder handler
  const handleReorder = useCallback(
    async (newSteps: AuctionWorkflowStep[]) => {
      setWorkflow(newSteps);
      setReordering(true);
      setReorderError(null);
      try {
        await auctionsApi.reorderWorkflowSteps(
          auctionId,
          newSteps.filter((s) => s.id).map((s) => s.id),
        );
      } catch {
        setReorderError('Failed to save new order. Please try again.');
      } finally {
        setReordering(false);
      }
    },
    [auctionId],
  );

  const moveStep = (from: number, to: number) => {
    if (from === to) return;
    const next = [...workflow];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    handleReorder(next);
  };

  // Schedule compute
  const computedEndTime = useMemo(() => {
    if (scheduleMode !== 'duration' || !startTime) return '';
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return '';
    const totalMinutes =
      parseInt(durationDays || '0', 10) * 24 * 60 +
      parseInt(durationHours || '0', 10) * 60 +
      parseInt(durationMinutes || '0', 10);
    if (totalMinutes <= 0) return '';
    return toLocalInputValue(new Date(start.getTime() + totalMinutes * 60000).toISOString());
  }, [scheduleMode, startTime, durationDays, durationHours, durationMinutes]);

  useEffect(() => {
    if (scheduleMode === 'duration' && computedEndTime) setEndTime(computedEndTime);
  }, [scheduleMode, computedEndTime]);

  const handleScheduleSubmit = async (publish: boolean) => {
    const finalStart = startTime;
    const finalEnd = scheduleMode === 'duration' ? computedEndTime : endTime;
    setGeneralError(null);
    const errs = validateSchedule(finalStart, finalEnd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(publish ? 'publish' : 'schedule');
    try {
      await auctionsApi.scheduleAuction(auctionId, {
        startTime: new Date(finalStart).toISOString(),
        endTime: new Date(finalEnd).toISOString(),
        publish,
      });
      onFinish();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setGeneralError(parsed.general ?? 'Failed to schedule auction.');
    } finally {
      setSaving(null);
    }
  };

  const postPayment = participation?.postPayment ?? false;

  return (
    <div className="space-y-6">
      {/* ── Workflow section ────────────────────────────────────────────── */}
      {!showScheduleOnly && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Workflow</span>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {workflow.length} step{workflow.length !== 1 ? 's' : ''}
              </span>
            )}
            {reordering && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:inline select-none">
                Drag to reorder
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                disabled={loading}
                onClick={() => {
                  // TODO: open add-step dialog
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>
          </div>

          {/* Error */}
          {reorderError && (
            <div className="px-4 py-2 text-xs text-destructive bg-destructive/5 border-b border-destructive/20">
              {reorderError}
            </div>
          )}

          {/* Body */}
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading workflow…</span>
              </div>
            ) : workflow.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No workflow steps available.
              </div>
            ) : (
              workflow.map((step, i) => (
                <div
                  key={step.id ?? i}
                  draggable
                  onDragStart={(e) => {
                    if (!dragHandleActiveRef.current) {
                      e.preventDefault();
                      return;
                    }
                    dragIndexRef.current = i;
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(i);
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIndexRef.current;
                    if (from !== null && from !== i) moveStep(from, i);
                    dragIndexRef.current = null;
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    dragHandleActiveRef.current = false;
                    dragIndexRef.current = null;
                    setDragOverIdx(null);
                  }}
                  className={`transition-opacity ${dragOverIdx === i ? 'opacity-50' : ''}`}
                >
                  <WorkflowStepCard
                    step={step}
                    index={i}
                    isDragTarget={dragOverIdx === i}
                    dragHandleProps={{
                      onPointerDown: () => {
                        dragHandleActiveRef.current = true;
                      },
                    }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Post-payment block — shown when participation.postPayment === true */}
          {!loading && participation?.postPayment === true && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              <PostPaymentBlock policies={postPaymentPolicies} />
            </div>
          )}
        </div>
      )}

      {/* ── Schedule section ────────────────────────────────────────────── */}
      {showScheduleOnly && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Schedule</p>
          </div>

          <DismissibleError message={generalError} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start date & time</Label>
              <DateTimePicker
                id="startTime"
                value={startTime}
                onChange={(v) => {
                  setStartTime(v);
                  clearErr('startTime');
                }}
              />
              <FieldError message={fieldErrors.startTime} />
            </div>
            <div className="space-y-2">
              <Label>Schedule by</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scheduleMode === 'duration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleMode('duration')}
                >
                  Duration
                </Button>
                <Button
                  type="button"
                  variant={scheduleMode === 'end' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleMode('end')}
                >
                  End datetime
                </Button>
              </div>
            </div>
          </div>

          {scheduleMode === 'duration' ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <NumberSelect
                  id="durationDays"
                  label="Days"
                  max={30}
                  value={durationDays}
                  onChange={(v) => {
                    setDurationDays(v);
                    clearErr('endTime');
                  }}
                />
                <NumberSelect
                  id="durationHours"
                  label="Hours"
                  max={23}
                  value={durationHours}
                  onChange={(v) => {
                    setDurationHours(v);
                    clearErr('endTime');
                  }}
                />
                <NumberSelect
                  id="durationMinutes"
                  label="Minutes"
                  max={59}
                  value={durationMinutes}
                  onChange={(v) => {
                    setDurationMinutes(v);
                    clearErr('endTime');
                  }}
                />
              </div>
              <FieldError message={fieldErrors.endTime} />
              {computedEndTime && (
                <p className="text-xs text-muted-foreground">
                  End time will be{' '}
                  {formatDuration(
                    parseInt(durationDays || '0', 10),
                    parseInt(durationHours || '0', 10),
                    parseInt(durationMinutes || '0', 10),
                  )}{' '}
                  after start.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End date & time</Label>
              <DateTimePicker
                id="endTime"
                value={endTime}
                onChange={(v) => {
                  setEndTime(v);
                  clearErr('endTime');
                }}
              />
              <FieldError message={fieldErrors.endTime} />
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving !== null}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {showScheduleOnly ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onFinish} disabled={saving !== null}>
              Skip
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleScheduleSubmit(false)}
              disabled={saving !== null}
              className="gap-2"
            >
              {saving === 'schedule' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Schedule'
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleScheduleSubmit(true)}
              disabled={saving !== null}
              className="gap-2"
            >
              {saving === 'publish' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Schedule & Publish'
              )}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={onNext} disabled={saving !== null} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
