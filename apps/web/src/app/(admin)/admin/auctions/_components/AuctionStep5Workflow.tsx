'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, Loader2 } from 'lucide-react';
import { Button, Label, DateTimePicker } from '@repo/ui';
import { auctionsApi } from '@repo/api';
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

function toLocalInputValue(dateValue?: string) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDuration(days: number, hours: number, minutes: number) {
  return `${days}d ${hours}h ${minutes}m`;
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

  if (!finalStart || Number.isNaN(start.getTime())) {
    errs.startTime = 'Start date & time is required.';
  } else if (start <= now) {
    errs.startTime = 'Start date & time must be in the future.';
  }

  if (!finalEnd || Number.isNaN(end.getTime())) {
    errs.endTime = 'End date & time is required.';
  } else if (end <= now) {
    errs.endTime = 'End date & time must be in the future.';
  } else if (!Number.isNaN(start.getTime()) && end <= start) {
    errs.endTime = 'End date & time must be after start time.';
  }

  return errs;
}

export function AuctionStep5Workflow({
  auctionId,
  onBack,
  onNext,
  onFinish,
  showScheduleOnly = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'schedule' | 'publish' | null>(null);
  const [workflow, setWorkflow] = useState<
    Array<{ id?: string; name?: string; order?: number; description?: string }>
  >([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationDays, setDurationDays] = useState('0');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [scheduleMode, setScheduleMode] = useState<'duration' | 'end'>('duration');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  useEffect(() => {
    let mounted = true;
    auctionsApi
      .getAuctionWorkflow(auctionId)
      .then((data) => {
        if (!mounted) return;
        setWorkflow(data);
      })
      .catch(() => {
        if (!mounted) return;
        setWorkflow([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [auctionId]);

  const computedEndTime = useMemo(() => {
    if (scheduleMode !== 'duration' || !startTime) return '';

    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return '';

    const totalMinutes =
      parseInt(durationDays || '0', 10) * 24 * 60 +
      parseInt(durationHours || '0', 10) * 60 +
      parseInt(durationMinutes || '0', 10);

    if (totalMinutes <= 0) return '';

    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);
    return toLocalInputValue(end.toISOString());
  }, [scheduleMode, startTime, durationDays, durationHours, durationMinutes]);

  useEffect(() => {
    if (scheduleMode === 'duration' && computedEndTime) {
      setEndTime(computedEndTime);
    }
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
      {!showScheduleOnly && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Workflow</p>
            <p className="text-xs text-muted-foreground">
              Review workflow items before scheduling.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading workflow...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {workflow.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workflow steps available.</p>
              ) : (
                workflow.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {step.name || `Step ${idx + 1}`}
                      </p>
                      <span className="text-xs text-muted-foreground">{step.order ?? idx + 1}</span>
                    </div>
                    {step.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

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

          {scheduleMode === 'duration' && computedEndTime && (
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
      )}

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
                  Saving...
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
                  Saving...
                </>
              ) : (
                'Schedule & Publish'
              )}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={onNext} disabled={saving !== null} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
