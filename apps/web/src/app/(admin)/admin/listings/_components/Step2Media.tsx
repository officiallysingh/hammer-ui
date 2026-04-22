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

interface UploadedFile {
  file: File;
  blob?: BlobVM;
  uploading: boolean;
  error?: string;
  thumbnail: boolean;
  classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  previewUrl?: string;
}

// Per-type size limits
const SIZE_LIMITS: Record<UploadedFile['classifier'], number> = {
  IMAGE: 2 * 1024 * 1024, // 2 MB
  VIDEO: 10 * 1024 * 1024, // 10 MB
  DOCUMENT: 5 * 1024 * 1024, // 5 MB
};

const SIZE_LABELS: Record<UploadedFile['classifier'], string> = {
  IMAGE: '2 MB',
  VIDEO: '10 MB',
  DOCUMENT: '5 MB',
};

const MAX_PER_TYPE = 5;

interface Step2Props {
  listingId: string;
  username: string;
  uploads: UploadedFile[];
  onUploadsChange: (uploads: UploadedFile[]) => void;
  /** Called with all blob IDs (new + kept existing) when user has new uploads */
  onSave: (blobIds: string[]) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

function fileClassifier(file: File): UploadedFile['classifier'] {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

function ClassifierBadge({ classifier }: { classifier: UploadedFile['classifier'] }) {
  if (classifier === 'IMAGE')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded">
        <ImageIcon className="h-2.5 w-2.5" />
        Image
      </span>
    );
  if (classifier === 'VIDEO')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400 px-1.5 py-0.5 rounded">
        <Film className="h-2.5 w-2.5" />
        Video
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded">
      <FileText className="h-2.5 w-2.5" />
      Document
    </span>
  );
}

function FilePreviewIcon({ classifier }: { classifier: UploadedFile['classifier'] }) {
  if (classifier === 'VIDEO') return <Film className="h-10 w-10 text-purple-400" />;
  if (classifier === 'DOCUMENT') return <FileText className="h-10 w-10 text-amber-400" />;
  return <ImageIcon className="h-10 w-10 text-blue-400" />;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [existingBlobs, setExistingBlobs] = useState<BlobVM[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    const controller = new AbortController();
    const loadBlobs = async () => {
      setLoadingBlobs(true);
      try {
        const data = await blobsApi.getBlobsByEntityId(listingId);
        if (!controller.signal.aborted) setExistingBlobs(data);
      } catch {
        if (!controller.signal.aborted) setExistingBlobs([]);
      } finally {
        if (!controller.signal.aborted) setLoadingBlobs(false);
      }
    };
    loadBlobs();
    return () => controller.abort();
  }, [listingId]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countByType = (classifier: UploadedFile['classifier']) =>
    uploads.filter((u) => u.classifier === classifier).length +
    existingBlobs.filter((b) => b.metadata?.classifier === classifier).length;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const cls = fileClassifier(file);
      const limit = SIZE_LIMITS[cls];
      const currentCount = countByType(cls);

      if (file.size > limit) {
        errors.push(
          `"${file.name}" exceeds the ${SIZE_LABELS[cls]} limit for ${cls.toLowerCase()}s.`,
        );
        return;
      }
      if (currentCount >= MAX_PER_TYPE) {
        errors.push(`"${file.name}" skipped — max ${MAX_PER_TYPE} ${cls.toLowerCase()}s allowed.`);
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
      classifier: fileClassifier(file),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    const merged = [...uploads, ...newUploads];
    onUploadsChange(merged);

    for (let i = 0; i < newUploads.length; i++) {
      const item = newUploads[i]!;
      const idx = uploads.length + i;
      try {
        const blob = await blobsApi.upload(item.file, {
          bucket: username,
          entityId: listingId,
          classifier: item.classifier,
          metadata: {
            entityType: 'listing',
            thumbnail: item.thumbnail ? 'true' : 'false',
          },
        } satisfies BlobProperties);
        onUploadsChange(merged.map((u, j) => (j === idx ? { ...u, blob, uploading: false } : u)));
      } catch {
        onUploadsChange(
          merged.map((u, j) =>
            j === idx ? { ...u, uploading: false, error: 'Upload failed' } : u,
          ),
        );
      }
    }
  };

  /** Only one image thumbnail at a time */
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

  /** Remove new upload — no API call */
  const removeUpload = (idx: number) => {
    const u = uploads[idx];
    if (u?.previewUrl) URL.revokeObjectURL(u.previewUrl);
    onUploadsChange(uploads.filter((_, i) => i !== idx));
  };

  /** Remove existing blob — local only, submitted on save */
  const removeExistingBlob = (blobId: string) => {
    setExistingBlobs((prev) => prev.filter((b) => b.id !== blobId));
  };

  const handleSaveAndContinue = async () => {
    setSaveError(null);
    const newBlobIds = uploads.filter((u) => u.blob?.id).map((u) => u.blob!.id);
    // If no new uploads, just continue — nothing changed
    if (newBlobIds.length === 0) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      // Include existing blob IDs so the server knows the full set
      const existingIds = existingBlobs.map((b) => b.id);
      await onSave([...existingIds, ...newBlobIds]);
      onNext();
    } catch {
      setSaveError('Failed to save media. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const anyUploading = uploads.some((u) => u.uploading);
  const hasNewBlobs = uploads.some((u) => u.blob?.id);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Media files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images, videos, or documents for this listing. Mark one image as the thumbnail.
          </p>
        </div>

        {/* Limits info */}
        <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="space-y-0.5">
            <p className="font-medium text-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Images
            </p>
            <p>PNG, JPG, JPEG, WEBP, GIF</p>
            <p>
              Max {SIZE_LABELS.IMAGE} · up to {MAX_PER_TYPE} files
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-foreground flex items-center gap-1">
              <Film className="h-3 w-3" /> Videos
            </p>
            <p>MP4, MOV, AVI, WEBM</p>
            <p>
              Max {SIZE_LABELS.VIDEO} · up to {MAX_PER_TYPE} files
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Documents
            </p>
            <p>PDF, DOC, DOCX</p>
            <p>
              Max {SIZE_LABELS.DOCUMENT} · up to {MAX_PER_TYPE} files
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Drop files here or <span className="text-primary">browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/png,image/jpg,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/avi,video/webm,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* New uploads grid */}
        {uploads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploads.map((u, i) => (
              <div
                key={i}
                className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                  u.thumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                }`}
              >
                {/* Preview */}
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {u.classifier === 'IMAGE' && u.previewUrl ? (
                    <Image src={u.previewUrl} alt={u.file.name} fill className="object-cover" />
                  ) : (
                    <FilePreviewIcon classifier={u.classifier} />
                  )}

                  {u.uploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}

                  {!u.uploading && u.blob && (
                    <div className="absolute top-1.5 left-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeUpload(i)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                  <p className="text-xs font-medium text-foreground truncate" title={u.file.name}>
                    {u.file.name}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-muted-foreground">
                      {(u.file.size / 1024).toFixed(1)} KB
                    </p>
                    <ClassifierBadge classifier={u.classifier} />
                  </div>

                  {/* Thumbnail toggle — images only */}
                  {u.classifier === 'IMAGE' && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={u.thumbnail}
                        onChange={(e) => setThumbnail(i, e.target.checked)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span
                        className={
                          u.thumbnail ? 'text-primary font-medium' : 'text-muted-foreground'
                        }
                      >
                        Thumbnail
                      </span>
                    </label>
                  )}

                  {u.error && <p className="text-xs text-destructive">{u.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Existing blobs */}
      {loadingBlobs && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading existing media...</span>
        </div>
      )}

      {existingBlobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Existing media</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {existingBlobs.map((blob) => {
              const cls = (blob.classifier as UploadedFile['classifier']) || 'DOCUMENT';
              const isThumbnail = blob.metadata?.['thumbnail'] === 'true';
              return (
                <div
                  key={blob.id}
                  className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                    isThumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  }`}
                >
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {cls === 'IMAGE' ? (
                      <Image
                        src={blobsApi.getDownloadUrl(blob.id)}
                        alt={blob.fileName || 'image'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <FilePreviewIcon classifier={cls} />
                    )}
                    {isThumbnail && (
                      <div className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground font-medium">
                        Thumbnail
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingBlob(blob.id)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    <p
                      className="text-xs font-medium text-foreground truncate"
                      title={blob.fileName}
                    >
                      {blob.fileName}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-muted-foreground">—</p>
                      <ClassifierBadge classifier={cls} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          ) : hasNewBlobs ? (
            <>
              Save & Continue <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
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
