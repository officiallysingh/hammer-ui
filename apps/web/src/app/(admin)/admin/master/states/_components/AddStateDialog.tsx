'use client';

import { useState } from 'react';
import { masterApi } from '@repo/api';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';

interface AddStateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddStateDialog({ open, onOpenChange, onCreated }: AddStateDialogProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setFieldError('');
    setError(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError('');
    setSaving(true);
    try {
      await masterApi.createState({ name: name.trim() });
      reset();
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors.name) setFieldError(parsed.fieldErrors.name);
      else setError(parsed.general ?? 'Failed to create state.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add state</DialogTitle>
          <DialogDescription>Create a new state.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="state-name" className={fieldError ? 'text-destructive' : ''}>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="state-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError('');
              }}
              placeholder="Maharashtra"
              autoComplete="off"
              autoFocus
              className={fieldError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add state'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
