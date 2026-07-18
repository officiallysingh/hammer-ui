'use client';

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button, Label } from '@repo/ui';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface AvatarUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | undefined) => void;
  fallbackText?: string;
  error?: string;
}

export function AvatarUpload({ value, onChange, fallbackText, error }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setLocalError(null);
    if (!file.type.startsWith('image/')) {
      setLocalError('Please select an image file.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError('Image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <Label>
        Profile picture <span className="text-muted-foreground font-normal ml-1">(optional)</span>
      </Label>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-medium text-muted-foreground">{fallbackText}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              {value ? 'Change' : 'Upload'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <p className="text-xs text-muted-foreground">JPG or PNG, up to 2MB.</p>
        </div>
      </div>
      {(localError || error) && <p className="text-xs text-destructive">{localError || error}</p>}
    </div>
  );
}
