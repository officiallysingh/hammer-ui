'use client';

import { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  Button,
  Label,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  RichTextEditor,
} from '@repo/ui';
import { auctionsApi, blobsApi, AuctionWorkflowStep, PolicyHeadRQ } from '@repo/api';
import { DismissibleError } from './AuctionShared';
import {
  resolveStr,
  SELECT_CLS,
  DayHourMinuteFields,
  formatOffsetDuration,
  parseOffsetDuration,
} from './PolicyShared';
import { parseApiError } from '@/lib/api-errors';

/** Tiptap emits "<p></p>" for an empty doc — strip tags to check for real content. */
function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Edits a workflow step's own fields. Implicit steps (auto-created by the backend)
 * only allow name/description to change — order changes only via drag-reorder, and
 * everything else about the step is derived. Explicit steps additionally allow
 * editing their type-specific content (e.g. T&C text/document).
 */
export function EditStepDialog({
  auctionId,
  step,
  onOpenChange,
  onSaved,
}: {
  auctionId: string;
  step: AuctionWorkflowStep | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tncText, setTncText] = useState('');
  const [tncFile, setTncFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PAYMENT_STEP fields
  const [paymentModeValue, setPaymentModeValue] = useState('');
  const [paymentModes, setPaymentModes] = useState<{ value: string; label: string }[]>([]);
  const [offsetDays, setOffsetDays] = useState('0');
  const [offsetHours, setOffsetHours] = useState('0');
  const [offsetMinutes, setOffsetMinutes] = useState('0');
  const [heads, setHeads] = useState<PolicyHeadRQ[]>([]);

  const stepType = resolveStr(step?.type);
  const isExplicit = step ? !step.implicit : false;
  const isTnCStep = stepType === 'TNC_FORM_STEP';
  const isPaymentStep = stepType === 'PAYMENT_STEP';
  const paymentPhase = resolveStr((step as AuctionWorkflowStep | null)?.phase);

  useEffect(() => {
    if (!step) return;
    setName(step.name ?? '');
    setDescription(step.description ?? '');
    setTncText((step as AuctionWorkflowStep & { tncText?: string }).tncText ?? '');
    setTncFile(null);
    setError(null);

    setPaymentModeValue(resolveStr(step.mode));
    const { days, hours, minutes } = parseOffsetDuration(step.offset);
    setOffsetDays(days);
    setOffsetHours(hours);
    setOffsetMinutes(minutes);
    setHeads(step.heads ?? []);
  }, [step]);

  useEffect(() => {
    if (isPaymentStep && paymentModes.length === 0) {
      auctionsApi
        .getPaymentModes()
        .then(setPaymentModes)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentStep]);

  const close = () => onOpenChange(false);

  const addHead = () =>
    setHeads((prev) => [
      ...prev,
      { name: '', description: '', basis: 'AMOUNT_BASED', value: 0, refundable: false },
    ]);
  const removeHead = (i: number) => setHeads((prev) => prev.filter((_, idx) => idx !== i));
  const updateHead = (i: number, patch: Partial<PolicyHeadRQ>) =>
    setHeads((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const submit = async () => {
    if (!step) return;
    if (isExplicit && isPaymentStep) {
      if (!paymentModeValue) {
        setError('Please select a payment mode.');
        return;
      }
      if (heads.length === 0 || heads.some((h) => !h.name?.trim() || !h.description?.trim())) {
        setError('Every payment head needs a name, description and value.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      let tncBlobId: string | undefined;
      if (isExplicit && isTnCStep && tncFile) {
        setUploading(true);
        const blob = await blobsApi.upload(tncFile, {
          bucket: 'auction-workflow',
          classifier: 'DOCUMENT',
        });
        setUploading(false);
        tncBlobId = blob.id || undefined;
      }

      await auctionsApi.updateWorkflowStep(auctionId, step.id, {
        type: stepType as Parameters<typeof auctionsApi.updateWorkflowStep>[2]['type'],
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        order: step.order,
        ...(isExplicit && isTnCStep
          ? { tncText: isRichTextEmpty(tncText) ? undefined : tncText, tncBlobId }
          : {}),
        ...(isExplicit && isPaymentStep
          ? {
              mode: paymentModeValue,
              phase: paymentPhase as 'PRE_PAYMENT' | 'POST_PAYMENT',
              offset: formatOffsetDuration(offsetDays, offsetHours, offsetMinutes),
              heads,
            }
          : {}),
      });
      onSaved();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.general ?? 'Failed to update step.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={step !== null} onOpenChange={(o) => (o ? undefined : close())}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
        </DialogHeader>

        <DismissibleError message={error} />

        {step && (
          <div className="space-y-3 py-1">
            {step.implicit && (
              <p className="text-xs text-muted-foreground">
                This step is generated automatically — only its name and description can be changed.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="editStepName">Name</Label>
              <Input id="editStepName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editStepDescription">Description</Label>
              <Input
                id="editStepDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {isExplicit && isTnCStep && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="editTncText">Terms and Conditions text</Label>
                  <RichTextEditor
                    value={tncText}
                    onChange={setTncText}
                    placeholder="Enter terms and conditions text, or upload a document below..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Or upload a document (.doc, .docx)</Label>
                  <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-xs cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {tncFile ? tncFile.name : 'Choose a .doc or .docx file...'}
                    </span>
                    <input
                      type="file"
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={(e) => setTncFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </>
            )}

            {isExplicit && isPaymentStep && (
              <>
                <p className="text-xs text-muted-foreground">
                  Phase:{' '}
                  <span className="text-foreground font-medium">
                    {paymentPhase === 'PRE_PAYMENT' ? 'Pre Payment' : 'Post Payment'}
                  </span>
                </p>

                <div className="space-y-1.5">
                  <Label>Payment mode</Label>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {paymentModes.map((m) => (
                      <label
                        key={m.value}
                        className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="editPaymentMode"
                          value={m.value}
                          checked={paymentModeValue === m.value}
                          onChange={() => setPaymentModeValue(m.value)}
                          className="h-4 w-4 border-input text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>

                <DayHourMinuteFields
                  label="Offset from auction end time"
                  daysValue={offsetDays}
                  hoursValue={offsetHours}
                  minutesValue={offsetMinutes}
                  onDaysChange={setOffsetDays}
                  onHoursChange={setOffsetHours}
                  onMinutesChange={setOffsetMinutes}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Payment Heads</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={addHead}
                    >
                      + Add Head
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {heads.map((h, i) => (
                      <div key={i} className="rounded-md border border-border/60 p-2.5 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Name"
                            value={h.name ?? ''}
                            onChange={(e) => updateHead(i, { name: e.target.value })}
                            className="text-sm"
                          />
                          <Input
                            placeholder="Description"
                            value={h.description ?? ''}
                            onChange={(e) => updateHead(i, { description: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                          <select
                            value={h.basis}
                            onChange={(e) => updateHead(i, { basis: e.target.value })}
                            className={SELECT_CLS}
                          >
                            <option value="PERCENTAGE_BASED">Percentage</option>
                            <option value="AMOUNT_BASED">Amount</option>
                          </select>
                          <Input
                            type="number"
                            placeholder="Value"
                            value={h.value ?? ''}
                            onChange={(e) => updateHead(i, { value: Number(e.target.value) })}
                            className="text-sm"
                          />
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={!!h.refundable}
                              onChange={(e) => updateHead(i, { refundable: e.target.checked })}
                            />
                            Refundable
                          </label>
                          <button
                            type="button"
                            onClick={() => removeHead(i)}
                            disabled={heads.length === 1}
                            className="text-[11px] text-destructive hover:underline justify-self-end disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={submitting}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploading ? 'Uploading...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
