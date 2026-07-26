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
import { auctionsApi, blobsApi, AuctionWorkflowStep } from '@repo/api';
import { DismissibleError } from './AuctionShared';
import { resolveStr } from './PolicyShared';
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

  const stepType = resolveStr(step?.type);
  const isExplicit = step ? !step.implicit : false;
  const isTnCStep = stepType === 'TNC_FORM_STEP';

  useEffect(() => {
    if (!step) return;
    setName(step.name ?? '');
    setDescription(step.description ?? '');
    setTncText((step as AuctionWorkflowStep & { tncText?: string }).tncText ?? '');
    setTncFile(null);
    setError(null);
  }, [step]);

  const close = () => onOpenChange(false);

  const submit = async () => {
    if (!step) return;
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
