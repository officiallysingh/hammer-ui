'use client';

import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Image,
  FileText,
  Film,
} from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { blobsApi, BlobVM } from '@repo/api';

interface UploadedFile {
  file: File;
  blob?: BlobVM;
  uploading: boolean;
  error?: string;
  thumbnail: boolean;
  classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

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
  if (classifier === 'IMAGE') return <Image className="h-4 w-4 text-primary" />;
  if (classifier === 'VIDEO') return <Film className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-amber-500" />;
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

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const newUploads: UploadedFile[] = Array.from(files).map((file) => ({
      file,
      uploading: true,
      thumbnail: false,
      classifier: fileClassifier(file),
    }));
    onUploadsChange([...uploads, ...newUploads]);

    // Upload each file
    for (let i = 0; i < newUploads.length; i++) {
      const item = newUploads[i]!;
      const idx = uploads.length + i;
      try {
        const blob = await blobsApi.upload(item.file, {
          bucket: username,
          entityId: listingId,
          classifier: item.classifier,
          thumbnail: item.thumbnail ? 'true' : 'false',
        });
        onUploadsChange((prev: UploadedFile[]) =>
          prev.map((u, j) => (j === idx ? { ...u, blob, uploading: false } : u)),
        );
      } catch {
        onUploadsChange((prev: UploadedFile[]) =>
          prev.map((u, j) => (j === idx ? { ...u, uploading: false, error: 'Upload failed' } : u)),
        );
      }
    }
  };

  const updateUpload = (idx: number, patch: Partial<UploadedFile>) =>
    onUploadsChange(uploads.map((u, i) => (i === idx ? { ...u, ...patch } : u)));

  const removeUpload = (idx: number) => onUploadsChange(uploads.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Media files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images, videos, or documents for this listing. Files are attached to listing{' '}
            <code className="font-mono">{listingId}</code>.
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
          <p className="text-xs text-muted-foreground mt-1">Images, videos, PDFs</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <FileIcon classifier={u.classifier} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(u.file.size / 1024).toFixed(1)} KB · {u.classifier}
                  </p>
                  {u.error && <p className="text-xs text-destructive">{u.error}</p>}
                </div>

                {/* Classifier select */}
                <select
                  value={u.classifier}
                  onChange={(e) =>
                    updateUpload(i, { classifier: e.target.value as UploadedFile['classifier'] })
                  }
                  disabled={u.uploading}
                  className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>

                {/* Thumbnail toggle — images only */}
                {u.classifier === 'IMAGE' && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={u.thumbnail}
                      onChange={(e) => updateUpload(i, { thumbnail: e.target.checked })}
                      className="accent-primary h-3.5 w-3.5"
                    />
                    Thumbnail
                  </label>
                )}

                {/* Status */}
                {u.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : u.blob ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : null}

                <button
                  type="button"
                  onClick={() => removeUpload(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
