'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Search, Upload } from 'lucide-react';
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
import {
  auctionsApi,
  metadataApi,
  blobsApi,
  ManagedTypeListItemFull,
  ManagedTypeVM,
} from '@repo/api';
import { DismissibleError } from './AuctionShared';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { PropertyFormPreview } from '../../metadata/_components/PropertyFormPreview';
import { parseApiError } from '@/lib/api-errors';

type AddStepMode = 'choose' | 'FORM_STEP' | 'TNC_FORM_STEP';

/** Tiptap emits "<p></p>" for an empty doc — strip tags to check for real content. */
function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim();
}

export function AddStepDialog({
  auctionId,
  open,
  onOpenChange,
  nextOrder,
  hasTnCStep,
  onAdded,
}: {
  auctionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextOrder: number;
  hasTnCStep: boolean;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<AddStepMode>('choose');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FORM_STEP state
  const [formSearchPhrases, setFormSearchPhrases] = useState<string[]>([]);
  const [formSearching, setFormSearching] = useState(false);
  const [formResults, setFormResults] = useState<ManagedTypeListItemFull[]>([]);
  const [selectedType, setSelectedType] = useState<ManagedTypeListItemFull | null>(null);
  const [selectedTypeDetail, setSelectedTypeDetail] = useState<ManagedTypeVM | null>(null);
  const [loadingTypeDetail, setLoadingTypeDetail] = useState(false);

  // TNC_FORM_STEP state
  const [tncName, setTncName] = useState('');
  const [tncDescription, setTncDescription] = useState('');
  const [tncText, setTncText] = useState('');
  const [tncFile, setTncFile] = useState<File | null>(null);
  const [uploadingTnc, setUploadingTnc] = useState(false);

  const reset = () => {
    setMode('choose');
    setError(null);
    setFormSearchPhrases([]);
    setFormResults([]);
    setSelectedType(null);
    setSelectedTypeDetail(null);
    setTncName('');
    setTncDescription('');
    setTncText('');
    setTncFile(null);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const searchFormTypes = useCallback(async (phrases: string[]) => {
    setFormSearching(true);
    try {
      const results = await metadataApi.searchManagedTypeListItems({
        phrases,
        type: 'WORKFLOW_STEP_FORM',
      });
      setFormResults(results);
    } catch {
      // silently ignore search errors
    } finally {
      setFormSearching(false);
    }
  }, []);

  useEffect(() => {
    if (open && mode === 'FORM_STEP') searchFormTypes(formSearchPhrases);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const selectType = (t: ManagedTypeListItemFull) => {
    setSelectedType(t);
    setSelectedTypeDetail(null);
    setLoadingTypeDetail(true);
    metadataApi
      .getManagedTypeById(t.id)
      .then(setSelectedTypeDetail)
      .catch(() => {})
      .finally(() => setLoadingTypeDetail(false));
  };

  const submitFormStep = async () => {
    if (!selectedType) {
      setError('Please select a form template.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await auctionsApi.addWorkflowStep(auctionId, {
        type: 'FORM_STEP',
        name: selectedType.name,
        description: selectedType.description,
        order: nextOrder,
        embedded: { typeId: selectedType.id, pathWiseState: {} },
      });
      onAdded();
      close();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.general ?? 'Failed to add step.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTncStep = async () => {
    if (isRichTextEmpty(tncText) && !tncFile) {
      setError('Provide either Terms and Conditions text or upload a document.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let tncBlobId: string | undefined;
      if (tncFile) {
        setUploadingTnc(true);
        const blob = await blobsApi.upload(tncFile, {
          bucket: 'auction-workflow',
          classifier: 'DOCUMENT',
        });
        setUploadingTnc(false);
        tncBlobId = blob.id || undefined;
      }
      await auctionsApi.addWorkflowStep(auctionId, {
        type: 'TNC_FORM_STEP',
        name: tncName.trim() || undefined,
        description: tncDescription.trim() || undefined,
        order: nextOrder,
        tncText: isRichTextEmpty(tncText) ? undefined : tncText,
        tncBlobId,
      });
      onAdded();
      close();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.general ?? 'Failed to add step.');
    } finally {
      setSubmitting(false);
      setUploadingTnc(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'choose'
              ? 'Add Step'
              : mode === 'FORM_STEP'
                ? 'Add Custom Form Step'
                : 'Add Terms and Conditions Form Step'}
          </DialogTitle>
        </DialogHeader>

        <DismissibleError message={error} />

        {mode === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <button
              type="button"
              onClick={() => setMode('FORM_STEP')}
              className="text-left rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors space-y-1"
            >
              <p className="text-sm font-semibold text-foreground">Custom Form Step</p>
              <p className="text-xs text-muted-foreground">
                Pick a managed form template. Can be added multiple times.
              </p>
            </button>
            <button
              type="button"
              disabled={hasTnCStep}
              onClick={() => !hasTnCStep && setMode('TNC_FORM_STEP')}
              className={`text-left rounded-lg border p-4 transition-colors space-y-1 ${
                hasTnCStep
                  ? 'border-border/50 opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                Terms and Conditions Form Step
              </p>
              <p className="text-xs text-muted-foreground">
                {hasTnCStep
                  ? 'Already added — only one is allowed per workflow.'
                  : 'Terms and Conditions step. Only one allowed.'}
              </p>
            </button>
          </div>
        )}

        {mode === 'FORM_STEP' && (
          <div className="space-y-3 py-1">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search managed types</Label>
                <PhrasesInput
                  value={formSearchPhrases}
                  onChange={setFormSearchPhrases}
                  placeholder="Type a name or tag and press Enter..."
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => searchFormTypes(formSearchPhrases)}
                disabled={formSearching}
              >
                {formSearching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Search
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {formSearching ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Searching...</span>
                </div>
              ) : formResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No managed types found.
                </div>
              ) : (
                formResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectType(t)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      selectedType?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{t.name}</span>
                      {selectedType?.id === t.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {t.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {selectedType && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Form preview</Label>
                {loadingTypeDetail ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 rounded-md border border-border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading form...</span>
                  </div>
                ) : (
                  <PropertyFormPreview properties={selectedTypeDetail?.properties ?? []} />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submitFormStep}
                disabled={submitting || !selectedType}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add
              </Button>
            </div>
          </div>
        )}

        {mode === 'TNC_FORM_STEP' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Participant would only be able to join the auction after accepting terms and
              conditions.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tncName">Name</Label>
              <Input
                id="tncName"
                value={tncName}
                onChange={(e) => setTncName(e.target.value)}
                placeholder="Terms and Conditions"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tncDescription">Description</Label>
              <Input
                id="tncDescription"
                value={tncDescription}
                onChange={(e) => setTncDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tncText">Terms and Conditions text</Label>
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
              {tncFile && (
                <button
                  type="button"
                  onClick={() => setTncFile(null)}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Remove file
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submitTncStep}
                disabled={submitting}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploadingTnc ? 'Uploading...' : 'Add'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
