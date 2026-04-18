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
} from 'lucide-react';
import { Button } from '@repo/ui';
import { blobsApi, BlobVM } from '@repo/api';

interface UploadedFile {
  file: File;
  blob?: BlobVM;
  uploading: boolean;
  error?: string;
  thumbnail: boolean;
  classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  /** local object URL for preview before/after upload */
  previewUrl?: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface Step2Props {
  listingId: string;
  username: string;
  uploads: UploadedFile[];
  onUploadsChange: (uploads: UploadedFile[]) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

function fileClassifier(file: File): 'IMAGE' | 'VIDEO' | 'DOCUMENT' {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

function FileIcon({ classifier }: { classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT' }) {
  if (classifier === 'VIDEO') return <Film className="h-10 w-10 text-purple-400" />;
  return <FileText className="h-10 w-10 text-amber-400" />;
}

export function Step2Media({
  listingId,
  username,
  uploads,
  onUploadsChange,
  onNext,
  onBack,
  onCancel,
}: Step2Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [existingBlobs, setExistingBlobs] = useState<BlobVM[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(false);

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

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      uploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const validFiles: File[] = [];
    const invalidFiles: { name: string; size: string }[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidFiles.push({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) });
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      alert(
        `The following files exceed the ${MAX_FILE_SIZE_MB}MB limit:\n${invalidFiles.map((f) => `${f.name} (${f.size}MB)`).join('\n')}`,
      );
    }
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
          entityType: 'listing',
          classifier: item.classifier,
          thumbnail: item.thumbnail ? 'true' : 'false',
        });
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

  /** Set thumbnail — only one image can be thumbnail at a time */
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

  const updateUpload = (idx: number, patch: Partial<UploadedFile>) =>
    onUploadsChange(uploads.map((u, i) => (i === idx ? { ...u, ...patch } : u)));

  /** Remove from local list only — no API call */
  const removeUpload = (idx: number) => {
    const u = uploads[idx];
    if (u?.previewUrl) URL.revokeObjectURL(u.previewUrl);
    onUploadsChange(uploads.filter((_, i) => i !== idx));
  };

  const deleteBlob = async (blobId: string) => {
    try {
      await blobsApi.deleteBlob(blobId);
      setExistingBlobs((prev) => prev.filter((b) => b.id !== blobId));
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Media files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images, videos, or documents for this listing. Mark one image as the thumbnail.
          </p>
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
          <p className="text-xs text-muted-foreground mt-1">
            Images, videos, PDFs · max {MAX_FILE_SIZE_MB}MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
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
                    <FileIcon classifier={u.classifier} />
                  )}

                  {/* Uploading overlay */}
                  {u.uploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}

                  {/* Uploaded badge */}
                  {!u.uploading && u.blob && (
                    <div className="absolute top-1.5 left-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow" />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeUpload(i)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Info + controls */}
                <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                  <p className="text-xs font-medium text-foreground truncate" title={u.file.name}>
                    {u.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(u.file.size / 1024).toFixed(1)} KB
                  </p>

                  {/* Classifier select */}
                  <select
                    value={u.classifier}
                    onChange={(e) =>
                      updateUpload(i, { classifier: e.target.value as UploadedFile['classifier'] })
                    }
                    disabled={u.uploading}
                    className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </select>

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
            {existingBlobs.map((blob) => (
              <div
                key={blob.id}
                className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                  blob.metadata?.thumbnail === 'true'
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border'
                }`}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {blob.metadata?.classifier === 'IMAGE' ? (
                    <Image
                      src={`/api/v1/blobs/${blob.id}/download`}
                      alt={blob.fileName || 'image'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <FileIcon
                      classifier={
                        (blob.metadata?.classifier as 'IMAGE' | 'VIDEO' | 'DOCUMENT') || 'DOCUMENT'
                      }
                    />
                  )}
                  {blob.metadata?.thumbnail === 'true' && (
                    <div className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground font-medium">
                      Thumbnail
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBlob(blob.id)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="text-xs font-medium text-foreground truncate" title={blob.fileName}>
                    {blob.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {blob.size ? `${(blob.size / 1024).toFixed(1)} KB` : ''} ·{' '}
                    {blob.metadata?.classifier}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="button" onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
