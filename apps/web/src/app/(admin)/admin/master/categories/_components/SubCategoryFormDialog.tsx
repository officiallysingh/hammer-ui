'use client';

import React, { useState } from 'react';
import { masterApi, SubCategoryVM } from '@repo/api';
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
import EmojiPicker from '@/components/common/EmojiPicker';
import { parseApiError } from '@/lib/api-errors';

interface SubCategoryFormDialogProps {
  categoryId: string | null;
  categoryName?: string;
  onClose: () => void;
  onCreated: (categoryId: string, subs: SubCategoryVM[]) => void;
}

export function SubCategoryFormDialog({
  categoryId,
  categoryName,
  onClose,
  onCreated,
}: SubCategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setIcon('');
    setFieldErrors({});
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await masterApi.createSubCategory(categoryId, {
        name: name.trim(),
        icon: icon || undefined,
      });
      const subs = await masterApi.getSubCategoriesByCategory(categoryId);
      reset();
      onCreated(categoryId, subs);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create sub-category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!categoryId}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add sub-category</DialogTitle>
          <DialogDescription>
            Add a sub-category to{' '}
            <span className="font-medium text-foreground">{categoryName}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sc-name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="sc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((p) => {
                  const n = { ...p };
                  delete n.name;
                  return n;
                });
              }}
              placeholder="Mobile"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label>
              Icon <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <EmojiPicker
              value={icon}
              onChange={setIcon}
              placeholder="Pick an icon for this sub-category"
            />
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
