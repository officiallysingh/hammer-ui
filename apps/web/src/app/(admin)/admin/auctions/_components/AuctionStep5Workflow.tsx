'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, Loader2 } from 'lucide-react';
import { Button, Input, Label, DateTimePicker } from '@repo/ui';
import { auctionsApi } from '@repo/api';

interface Props {
  auctionId: string;
  onBack: () => void;
  onFinish: () => void;
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

export function AuctionStep5Workflow({ auctionId, onBack, onFinish }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<
    Array<{ id?: string; name?: string; order?: number; description?: string }>
  >([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationDays, setDurationDays] = useState('0');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [scheduleMode, setScheduleMode] = useState<'duration' | 'end'>('duration');

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

  const handleScheduleSubmit = async () => {
    const finalStart = startTime;
    const finalEnd = scheduleMode === 'duration' ? computedEndTime : endTime;
    if (!finalStart || !finalEnd) return;
    setSaving(true);
    try {
      await auctionsApi.scheduleAuction(auctionId, {
        startTime: new Date(finalStart).toISOString(),
        endTime: new Date(finalEnd).toISOString(),
      });
      onFinish();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Workflow</p>
          <p className="text-xs text-muted-foreground">Review workflow items and set schedule.</p>
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

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Schedule</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Start date & time</Label>
            <DateTimePicker id="startTime" value={startTime} onChange={setStartTime} />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="durationDays">Days</Label>
              <Input
                id="durationDays"
                type="number"
                min={0}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationHours">Hours</Label>
              <Input
                id="durationHours"
                type="number"
                min={0}
                max={23}
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMinutes">Minutes</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={0}
                max={59}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="endTime">End date & time</Label>
            <DateTimePicker id="endTime" value={endTime} onChange={setEndTime} />
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

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onFinish} disabled={saving}>
            Skip
          </Button>
          <Button type="button" onClick={handleScheduleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Schedule
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
