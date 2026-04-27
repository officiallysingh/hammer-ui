'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  FileText,
  Film,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@repo/ui';
import { blobsApi, BlobVM, BlobProperties } from '@repo/api';
import type { BlobPropertyPatch } from '@repo/api';

interface UploadedFile {
  file: File;
  blob?: BlobVM;
  uploading: boolean;
  error?: string;
  thumbnail: boolean;
  classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  previewUrl?: string;
}

const SIZE_LIMITS: Record<UploadedFile['classifier'], number> = {
  IMAGE: 2 * 1024 * 1024,
  VIDEO: 10 * 1024 * 1024,
  DOCUMENT: 5 * 1024 * 1024,
};

const SIZE_LABELS: Record<UploadedFile['classifier'], string> = {
  IMAGE: '2 MB',
  VIDEO: '10 MB',
  DOCUMENT: '5 MB',
};

const FORMATS: Record<UploadedFile['classifier'], string> = {
  IMAGE: 'PNG, JPG, WEBP, GIF',
  VIDEO: 'MP4, MOV, AVI, WEBM',
  DOCUMENT: 'PDF, DOC, DOCX',
};

const ACCEPT: Record<UploadedFile['classifier'], string> = {
  IMAGE: 'image/png,image/jpg,image/jpeg,image/webp,image/gif',
  VIDEO: 'video/mp4,video/quicktime,video/avi,video/webm',
  DOCUMENT: '.pdf,.doc,.docx',
};

const MAX_PER_TYPE = 5;

interface Step2Props {
  listingId: string;
  username: string;
  uploads: UploadedFile[];
  onUploadsChange: (uploads: UploadedFile[]) => void;
  /** Called with blob IDs and any changed blob properties */
  onSave: (blobIds: string[], blobProperties: Record<string, BlobPropertyPatch>) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

function blobDisplayClassifier(blob: BlobVM): UploadedFile['classifier'] {
  // mediaType can be a string like "image/jpeg" or a BlobMediaType object
  const mt =
    typeof blob.mediaType === 'string'
      ? blob.mediaType
      : blob.mediaType
        ? `${blob.mediaType.type ?? ''}/${blob.mediaType.subtype ?? ''}`
        : '';
  if (mt.startsWith('image/')) return 'IMAGE';
  if (mt.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

function fileClassifier(file: File): UploadedFile['classifier'] {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

// ─── MediaBlock ───────────────────────────────────────────────────────────────

interface MediaBlockProps {
  classifier: UploadedFile['classifier'];
  uploads: UploadedFile[];
  existingBlobs: BlobVM[];
  onAddFiles: (files: FileList | null, classifier: UploadedFile['classifier']) => void;
  onRemoveUpload: (idx: number) => void;
  onRemoveExisting: (id: string) => void;
  onSetThumbnail: (idx: number, checked: boolean) => void;
  onSetExistingThumbnail: (id: string, checked: boolean) => void;
}

function MediaBlock({
  classifier,
  uploads,
  existingBlobs,
  onAddFiles,
  onRemoveUpload,
  onRemoveExisting,
  onSetThumbnail,
  onSetExistingThumbnail,
}: MediaBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const myUploads = uploads
    .map((u, i) => ({ ...u, originalIdx: i }))
    .filter((u) => u.classifier === classifier);
  const myExisting = existingBlobs.filter((b) => blobDisplayClassifier(b) === classifier);
  const total = myUploads.length + myExisting.length;
  const remaining = MAX_PER_TYPE - total;
  const atLimit = remaining <= 0;

  const Icon = classifier === 'IMAGE' ? ImageIcon : classifier === 'VIDEO' ? Film : FileText;
  const iconColor =
    classifier === 'IMAGE'
      ? 'text-blue-500'
      : classifier === 'VIDEO'
        ? 'text-purple-500'
        : 'text-amber-500';
  const borderColor =
    classifier === 'IMAGE'
      ? 'border-blue-200 dark:border-blue-900'
      : classifier === 'VIDEO'
        ? 'border-purple-200 dark:border-purple-900'
        : 'border-amber-200 dark:border-amber-900';
  const headerBg =
    classifier === 'IMAGE'
      ? 'bg-blue-10 dark:bg-blue-950/30'
      : classifier === 'VIDEO'
        ? 'bg-purple-10 dark:bg-purple-950/30'
        : 'bg-amber-10 dark:bg-amber-950/30';
  const label = classifier === 'IMAGE' ? 'Images' : classifier === 'VIDEO' ? 'Videos' : 'Documents';

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden flex flex-col`}>
      {/* Block header */}
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between border-b ${borderColor}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{FORMATS[classifier]}</span>
          <span>·</span>
          <span>Max {SIZE_LABELS[classifier]}</span>
          <span>·</span>
          {/* Slot indicator */}
          <span className={`font-medium ${atLimit ? 'text-destructive' : 'text-foreground'}`}>
            {total}/{MAX_PER_TYPE}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Slot progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: MAX_PER_TYPE }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < total
                  ? atLimit
                    ? 'bg-destructive'
                    : classifier === 'IMAGE'
                      ? 'bg-blue-500'
                      : classifier === 'VIDEO'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* File grid */}
        {(myUploads.length > 0 || myExisting.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Existing blobs */}
            {myExisting.map((blob) => {
              const isThumbnail = blob.metadata?.['thumbnail'] === 'true';
              return (
                <div
                  key={blob.id}
                  className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                    isThumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  }`}
                >
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {classifier === 'IMAGE' ? (
                      <Image
                        src={blobsApi.getDownloadUrl(blob.id)}
                        alt={blob.fileName || 'image'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : classifier === 'VIDEO' ? (
                      <Film className="h-8 w-8 text-purple-400" />
                    ) : (
                      <FileText className="h-8 w-8 text-amber-400" />
                    )}
                    {isThumbnail && (
                      <div className="absolute top-1 left-1 rounded bg-primary px-1 py-0.5 text-[9px] text-primary-foreground font-medium leading-none">
                        Thumb
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(blob.id)}
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1">
                    <p
                      className="text-[10px] font-medium text-foreground truncate"
                      title={blob.fileName}
                    >
                      {blob.fileName}
                    </p>
                    {classifier === 'IMAGE' && (
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 rounded px-2 py-1 hover:bg-muted/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={isThumbnail}
                          onChange={(e) => onSetExistingThumbnail(blob.id, e.target.checked)}
                          className="accent-primary h-3 w-3"
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            isThumbnail ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {isThumbnail ? '✓ Thumbnail' : 'Set as thumbnail'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}

            {/* New uploads */}
            {myUploads.map((u) => (
              <div
                key={u.originalIdx}
                className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                  u.thumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                }`}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {classifier === 'IMAGE' && u.previewUrl ? (
                    <Image src={u.previewUrl} alt={u.file.name} fill className="object-cover" />
                  ) : classifier === 'VIDEO' ? (
                    <Film className="h-8 w-8 text-purple-400" />
                  ) : (
                    <FileText className="h-8 w-8 text-amber-400" />
                  )}
                  {u.uploading && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-[9px] text-primary font-medium">Uploading...</span>
                    </div>
                  )}
                  {!u.uploading && u.blob && (
                    <div className="absolute top-1 left-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 drop-shadow" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveUpload(u.originalIdx)}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-1.5 space-y-1">
                  <p
                    className="text-[10px] font-medium text-foreground truncate"
                    title={u.file.name}
                  >
                    {u.file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(u.file.size / 1024).toFixed(0)} KB
                  </p>
                  {classifier === 'IMAGE' && (
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 rounded px-2 py-1 hover:bg-muted/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={u.thumbnail}
                        onChange={(e) => onSetThumbnail(u.originalIdx, e.target.checked)}
                        className="accent-primary h-3 w-3"
                      />
                      <span
                        className={`text-[10px] font-medium ${
                          u.thumbnail ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {u.thumbnail ? '✓ Thumbnail' : 'Set as thumbnail'}
                      </span>
                    </label>
                  )}
                  {u.error && <p className="text-[10px] text-destructive">{u.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {!atLimit && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onAddFiles(e.dataTransfer.files, classifier);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg py-6 px-4 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.02] shadow-md'
                : 'border-border hover:border-primary/40 hover:bg-muted/20'
            }`}
          >
            <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Drop files here or <span className="text-primary font-medium">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {remaining} slot{remaining !== 1 ? 's' : ''} remaining • Max{' '}
                {SIZE_LABELS[classifier]}
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT[classifier]}
              className="hidden"
              onChange={(e) => onAddFiles(e.target.files, classifier)}
            />
          </div>
        )}

        {atLimit && (
          <p className="text-xs text-destructive text-center py-2">
            Maximum {MAX_PER_TYPE} {label.toLowerCase()} reached
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step2Media ───────────────────────────────────────────────────────────────

export function Step2Media({
  listingId,
  username,
  uploads,
  onUploadsChange,
  onSave,
  onNext,
  onBack,
  onCancel,
}: Step2Props) {
  const [existingBlobs, setExistingBlobs] = useState<BlobVM[]>([]);
  const [originalBlobs, setOriginalBlobs] = useState<BlobVM[]>([]);
  const [originalBlobIds, setOriginalBlobIds] = useState<string[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    const controller = new AbortController();
    setLoadingBlobs(true);
    blobsApi
      .getBlobsByEntityId(listingId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setExistingBlobs(data);
          setOriginalBlobs(data);
          setOriginalBlobIds(data.map((b) => b.id));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setExistingBlobs([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingBlobs(false);
      });
    return () => controller.abort();
  }, [listingId]);

  useEffect(() => {
    return () => {
      uploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countByType = (cls: UploadedFile['classifier']) =>
    uploads.filter((u) => u.classifier === cls).length +
    existingBlobs.filter((b) => blobDisplayClassifier(b) === cls).length;

  const handleAddFiles = async (
    files: FileList | null,
    forClassifier: UploadedFile['classifier'],
  ) => {
    if (!files?.length) return;
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const cls = fileClassifier(file);
      // Only accept files matching the block's classifier
      if (cls !== forClassifier) {
        errors.push(`"${file.name}" is not a valid ${forClassifier.toLowerCase()}.`);
        return;
      }
      if (file.size > SIZE_LIMITS[cls]) {
        errors.push(`"${file.name}" exceeds the ${SIZE_LABELS[cls]} limit.`);
        return;
      }
      if (countByType(cls) >= MAX_PER_TYPE) {
        errors.push(`Max ${MAX_PER_TYPE} ${cls.toLowerCase()}s allowed.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length) alert(errors.join('\n'));
    if (!validFiles.length) return;

    const newUploads: UploadedFile[] = validFiles.map((file) => ({
      file,
      uploading: true,
      thumbnail: false,
      classifier: forClassifier,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    let current = [...uploads, ...newUploads];
    onUploadsChange(current);

    for (let i = 0; i < newUploads.length; i++) {
      const item = newUploads[i]!;
      const idx = uploads.length + i;
      try {
        const blob = await blobsApi.upload(item.file, {
          bucket: username,
          entityId: listingId,
          classifier: 'LISTING', //item.classifier,
          metadata: { thumbnail: item.thumbnail ? 'true' : 'false' },
        } satisfies BlobProperties);
        current = current.map((u, j) => (j === idx ? { ...u, blob, uploading: false } : u));
        onUploadsChange(current);
      } catch {
        current = current.map((u, j) =>
          j === idx ? { ...u, uploading: false, error: 'Upload failed. Please try again.' } : u,
        );
        onUploadsChange(current);
      }
    }
  };

  const setThumbnail = (idx: number, checked: boolean) => {
    onUploadsChange(
      uploads.map((u, i) => ({
        ...u,
        thumbnail:
          u.classifier === 'IMAGE'
            ? i === idx
              ? checked
              : checked
                ? false
                : u.thumbnail
            : u.thumbnail,
      })),
    );
  };

  const setExistingBlobThumbnail = (blobId: string, checked: boolean) => {
    if (checked) {
      onUploadsChange(
        uploads.map((u) => ({ ...u, thumbnail: u.classifier === 'IMAGE' ? false : u.thumbnail })),
      );
    }
    setExistingBlobs((prev) =>
      prev.map((b) => {
        if (b.id === blobId)
          return { ...b, metadata: { ...b.metadata, thumbnail: checked ? 'true' : 'false' } };
        if (checked && blobDisplayClassifier(b) === 'IMAGE')
          return { ...b, metadata: { ...b.metadata, thumbnail: 'false' } };
        return b;
      }),
    );
  };

  const removeUpload = (idx: number) => {
    const u = uploads[idx];
    if (u?.previewUrl) URL.revokeObjectURL(u.previewUrl);
    onUploadsChange(uploads.filter((_, i) => i !== idx));
  };

  const removeExistingBlob = (blobId: string) => {
    setExistingBlobs((prev) => prev.filter((b) => b.id !== blobId));
  };

  const hasExistingBlobChanges =
    originalBlobIds.length !== existingBlobs.length ||
    originalBlobIds.some((id) => !existingBlobs.some((b) => b.id === id));

  /** Build blobProperties patch — only blobs whose metadata changed */
  const buildBlobProperties = (): Record<string, BlobPropertyPatch> => {
    const result: Record<string, BlobPropertyPatch> = {};

    // Existing blobs with changed metadata (e.g. thumbnail toggled)
    existingBlobs.forEach((blob) => {
      const orig = originalBlobs.find((o) => o.id === blob.id);
      if (!orig) return;
      const origMeta = JSON.stringify(orig.metadata ?? {});
      const newMeta = JSON.stringify(blob.metadata ?? {});
      if (origMeta !== newMeta) {
        result[blob.id] = { metadata: blob.metadata as Record<string, string> };
      }
    });

    // New uploads — include their metadata (thumbnail flag)
    uploads.forEach((u) => {
      if (u.blob?.id) {
        result[u.blob.id] = {
          metadata: { thumbnail: u.thumbnail ? 'true' : 'false' },
        };
      }
    });

    return result;
  };

  const handleSaveAndContinue = async () => {
    setSaveError(null);
    const newBlobIds = uploads.filter((u) => u.blob?.id).map((u) => u.blob!.id);
    const blobProperties = buildBlobProperties();
    const hasBlobPropertyChanges = Object.keys(blobProperties).length > 0;
    const hasChanges = newBlobIds.length > 0 || hasExistingBlobChanges || hasBlobPropertyChanges;

    if (!hasChanges) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      await onSave([...existingBlobs.map((b) => b.id), ...newBlobIds], blobProperties);
      onNext();
    } catch {
      setSaveError('Failed to save media. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const anyUploading = uploads.some((u) => u.uploading);
  const newBlobIds = uploads.filter((u) => u.blob?.id).map((u) => u.blob!.id);
  const blobProperties = buildBlobProperties();
  const hasBlobPropertyChanges = Object.keys(blobProperties).length > 0;
  const hasChanges = newBlobIds.length > 0 || hasExistingBlobChanges || hasBlobPropertyChanges;
  const hasNewBlobs = uploads.some((u) => u.blob?.id);

  const blockProps = (cls: UploadedFile['classifier']) => ({
    classifier: cls,
    uploads,
    existingBlobs,
    onAddFiles: handleAddFiles,
    onRemoveUpload: removeUpload,
    onRemoveExisting: removeExistingBlob,
    onSetThumbnail: setThumbnail,
    onSetExistingThumbnail: setExistingBlobThumbnail,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Media files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images, videos, and documents. Max {MAX_PER_TYPE} files per type.{' '}
            <span className="text-primary font-medium">
              Only one image can be set as thumbnail.
            </span>
          </p>
          {hasChanges && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {newBlobIds.length > 0 &&
                  `${newBlobIds.length} new file${newBlobIds.length > 1 ? 's' : ''} to upload. `}
                {hasExistingBlobChanges && 'Existing files modified. '}
                {hasBlobPropertyChanges && 'Thumbnail settings updated. '}
                Changes will be saved when you continue.
              </p>
            </div>
          )}
        </div>

        {loadingBlobs ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Loading existing media...</p>
              <p className="text-xs">Please wait while we fetch your files</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <MediaBlock {...blockProps('IMAGE')} />
            <MediaBlock {...blockProps('VIDEO')} />
            <MediaBlock {...blockProps('DOCUMENT')} />
          </div>
        )}
      </div>

      {saveError && <p className="text-xs text-destructive">{saveError}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={saving || anyUploading}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {hasChanges ? 'Save & Continue' : 'Continue'} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
