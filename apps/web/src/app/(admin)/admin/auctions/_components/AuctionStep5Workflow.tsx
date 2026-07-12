'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import { auctionsApi } from '@repo/api';

interface Props {
  auctionId: string;
  onBack: () => void;
  onNext?: () => void;
  onFinish: () => void;
  showScheduleOnly?: boolean;
}

export function AuctionStep5Workflow({
  auctionId,
  onBack,
  onNext,
  onFinish,
  showScheduleOnly = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<
    Array<{ id?: string; name?: string; order?: number; description?: string }>
  >([]);

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

  const handleScheduleSubmit = async () => {
    setSaving(true);
    try {
      onFinish();
    } finally {
      setSaving(false);
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

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {showScheduleOnly ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onFinish} disabled={saving}>
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleScheduleSubmit}
              disabled={saving}
              className="gap-2"
            >
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
        ) : (
          <Button type="button" onClick={onNext} disabled={saving} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
