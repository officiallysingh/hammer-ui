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
  Landmark,
  FileText,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Button, Label, DateTimePicker, Badge } from '@repo/ui';
import { auctionsApi, AuctionWorkflowStep, PolicyItemRQ, PolicyEvaluationMap } from '@repo/api';
import { DismissibleError, FieldError } from './AuctionShared';
import { SELECT_CLS, resolveStr, fmtLabel } from './PolicyShared';
import { EvaluationList } from './PolicyEvaluationDisplay';
import { AddStepDialog } from './AddStepDialog';
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

function StepTypeIcon({ type, className }: { type?: unknown; className?: string }) {
  switch (resolveStr(type)) {
    case 'PAYMENT_STEP':
      return <CreditCard className={className} />;
    case 'BANK_DETAIL_FORM_STEP':
      return <Landmark className={className} />;
    case 'TNC_FORM_STEP':
      return <ShieldCheck className={className} />;
    default:
      return <FileText className={className} />;
  }
}

// ── Policy detail card (shared by step cards + post-payment block) ─────────────

function PolicyDetailCard({
  item,
  openingPrice,
  precision,
  evaluations,
}: {
  item: PolicyItemRQ;
  openingPrice?: number;
  precision?: number;
  evaluations?: PolicyEvaluationMap;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{item.name || fmtLabel(item.type)}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {fmtLabel(item.type)}
        </Badge>
        {item.currency && <span className="text-muted-foreground">{item.currency}</span>}
      </div>
      {item.description && <p className="text-muted-foreground">{item.description}</p>}
      {item.schedule && (
        <p className="text-muted-foreground">
          Due: <span className="text-foreground">{fmtLabel(item.schedule.reference)}</span>
          {item.schedule.offset && <> · offset {item.schedule.offset}</>}
        </p>
      )}
      {item.heads && item.heads.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          {item.heads.map((h, hi) => {
            const isPercentage = resolveStr(h.basis).startsWith('PERCENTAGE');
            const calculated =
              isPercentage && h.value != null && openingPrice
                ? (openingPrice * h.value) / 100
                : null;
            return (
              <div key={hi} className="rounded bg-muted/40 px-2 py-1.5 text-[11px] space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{h.name || fmtLabel(h.type)}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {fmtLabel(h.type)}
                  </Badge>
                  {h.refundable && <span className="text-emerald-600">Refundable</span>}
                </div>
                {h.description && <p className="text-muted-foreground">{h.description}</p>}
                <p className="text-muted-foreground">
                  {fmtLabel(h.basis)}:{' '}
                  <span className="text-foreground">
                    {h.value}
                    {isPercentage ? '%' : ''}
                  </span>
                  {calculated !== null && (
                    <>
                      {' '}
                      · ≈{' '}
                      <span className="text-foreground">
                        {item.currency ? `${item.currency} ` : ''}
                        {calculated.toFixed(precision ?? 2)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        item.value != null && (
          <span className="text-muted-foreground">
            Value: <span className="text-foreground">{item.value}</span>
          </span>
        )
      )}
      {evaluations && (
        <div className="pt-1">
          <EvaluationList evaluations={evaluations} />
        </div>
      )}
    </div>
  );
}

// ── Bank details (view-only) — fixed schema collected by BANK_DETAIL_FORM_STEP ─

const BANK_DETAIL_FIELDS = [
  { label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
  { label: 'Bank IFSC Code', placeholder: 'ICIC0000733' },
  { label: 'Bank Account Number', placeholder: '003210513654' },
];

function BankDetailsPreview() {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3 text-xs">
      <p className="text-muted-foreground">
        Participant provides these bank details to receive winning-amount refunds/payouts.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BANK_DETAIL_FIELDS.map((f) => (
          <div key={f.label} className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-muted-foreground/70">
              {f.placeholder}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Cancel Check</span>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-2 text-muted-foreground/70">
          <Upload className="h-3.5 w-3.5" />
          Cancelled cheque image upload
        </div>
      </div>
    </div>
  );
}

// ── Workflow step accordion card ──────────────────────────────────────────────

function WorkflowStepCard({
  step,
  index,
  dragHandleProps,
  isDragTarget,
  openingPrice,
  precision,
  prePaymentPolicies,
  evaluationsByPolicyId,
}: {
  step: AuctionWorkflowStep;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragTarget?: boolean;
  openingPrice?: number;
  precision?: number;
  prePaymentPolicies?: PolicyItemRQ[];
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
  const [open, setOpen] = useState(true);
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

        {/* Type icon */}
        <StepTypeIcon type={step.type} className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />

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

          {/* Step status details — e.g. transaction ref, bank verification status */}
          {step.status?.details && Object.keys(step.status.details).length > 0 && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Object.entries(step.status.details).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{fmtLabel(key)}</span>
                    <span className="text-foreground font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank details — fixed schema, view-only */}
          {resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Bank Details
              </p>
              <BankDetailsPreview />
            </div>
          )}

          {/* Step-level policies — payment steps fall back to the auction's pre-payment
              policies when the step itself doesn't carry an embedded policies list. */}
          {(() => {
            const isPaymentStep = resolveStr(step.type) === 'PAYMENT_STEP';
            const policiesToShow =
              step.policies && step.policies.length > 0
                ? step.policies
                : isPaymentStep
                  ? (prePaymentPolicies ?? [])
                  : [];
            if (policiesToShow.length === 0) return null;
            return (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Policies
                </p>
                {policiesToShow.map((p, pi) => (
                  <PolicyDetailCard
                    key={pi}
                    item={p}
                    openingPrice={openingPrice}
                    precision={precision}
                    evaluations={p.id ? evaluationsByPolicyId?.[p.id] : undefined}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Post-payment block ────────────────────────────────────────────────────────

function PostPaymentBlock({
  policies,
  openingPrice,
  precision,
  evaluationsByPolicyId,
}: {
  policies: PolicyItemRQ[];
  openingPrice?: number;
  precision?: number;
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
}) {
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
            <PolicyDetailCard
              key={i}
              item={item}
              openingPrice={openingPrice}
              precision={precision}
              evaluations={item.id ? evaluationsByPolicyId?.[item.id] : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Reorder constraint ─────────────────────────────────────────────────────────
// The pre-payment step and the bank-details step must stay next to each other —
// bank details are collected for refunding that payment, so the two shouldn't drift
// apart in the list. Either can lead (bank-before-payment or bank-after-payment);
// only their adjacency is enforced.

function enforcePaymentBankAdjacency(list: AuctionWorkflowStep[]): AuctionWorkflowStep[] {
  const paymentIdx = list.findIndex((s) => resolveStr(s.type) === 'PAYMENT_STEP');
  const bankIdx = list.findIndex((s) => resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP');
  if (paymentIdx === -1 || bankIdx === -1 || Math.abs(paymentIdx - bankIdx) === 1) {
    return list;
  }
  const bankWasBefore = bankIdx < paymentIdx;
  const next = [...list];
  const [bankStep] = next.splice(bankIdx, 1);
  const newPaymentIdx = next.findIndex((s) => resolveStr(s.type) === 'PAYMENT_STEP');
  const insertAt = bankWasBefore ? newPaymentIdx : newPaymentIdx + 1;
  next.splice(insertAt, 0, bankStep!);
  return next;
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
  const [postPaymentPolicies, setPostPaymentPolicies] = useState<PolicyItemRQ[]>([]);
  const [prePaymentPolicies, setPrePaymentPolicies] = useState<PolicyItemRQ[]>([]);
  const [openingPrice, setOpeningPrice] = useState<number | undefined>(undefined);
  const [precision, setPrecision] = useState<number | undefined>(undefined);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [addStepOpen, setAddStepOpen] = useState(false);

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
      auctionsApi.getAuctionPolicies(auctionId).catch(() => null),
      auctionsApi.getAuctionById(auctionId).catch(() => null),
    ])
      .then(([wf, pol, auction]) => {
        if (!mounted) return;
        setWorkflow(wf);
        // Policies flagged postPayment: true are collected after the auction ends —
        // shown in a trailing block regardless of which group they belong to.
        const allItems = Object.values(pol ?? {}).flat();
        setPostPaymentPolicies(allItems.filter((item) => item.postPayment === true));
        setPrePaymentPolicies(allItems.filter((item) => item.prePayment === true));
        setOpeningPrice(auction?.unit?.openingPrice);
        setPrecision(auction?.monetaryOptions?.precision);

        // Evaluate every saved policy (workflow-embedded + pre/post payment) by id.
        const policyIds = Array.from(
          new Set(
            [...wf.flatMap((s) => s.policies ?? []), ...allItems]
              .map((p) => p.id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        Promise.all(
          policyIds.map((policyId) =>
            auctionsApi
              .evaluateAuctionPolicy(auctionId, policyId)
              .then((res) => [policyId, res] as const)
              .catch(() => [policyId, null] as const),
          ),
        ).then((results) => {
          if (!mounted) return;
          const map: Record<string, PolicyEvaluationMap> = {};
          for (const [policyId, res] of results) {
            if (res) map[policyId] = res;
          }
          setEvaluationsByPolicyId(map);
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auctionId]);

  const reloadWorkflow = useCallback(() => {
    auctionsApi
      .getAuctionWorkflow(auctionId)
      .then(setWorkflow)
      .catch(() => {});
  }, [auctionId]);

  const hasTnCStep = workflow.some((s) => resolveStr(s.type) === 'TNC_FORM_STEP');

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
    handleReorder(enforcePaymentBankAdjacency(next));
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
                onClick={() => setAddStepOpen(true)}
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
                    openingPrice={openingPrice}
                    precision={precision}
                    prePaymentPolicies={prePaymentPolicies}
                    evaluationsByPolicyId={evaluationsByPolicyId}
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

          {/* Post-payment block — shown whenever policies are flagged postPayment: true */}
          {!loading && postPaymentPolicies.length > 0 && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              <PostPaymentBlock
                policies={postPaymentPolicies}
                openingPrice={openingPrice}
                precision={precision}
                evaluationsByPolicyId={evaluationsByPolicyId}
              />
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

      <AddStepDialog
        auctionId={auctionId}
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        nextOrder={workflow.length}
        hasTnCStep={hasTnCStep}
        onAdded={reloadWorkflow}
      />
    </div>
  );
}
