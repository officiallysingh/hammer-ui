'use client';

import { useEffect, useState } from 'react';
import { masterApi, CityVM, AreaVM } from '@repo/api';
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

interface AddAreaDialogProps {
  city: CityVM | null;
  onClose: () => void;
  onCreated: (cityId: string, areas: AreaVM[]) => void;
}

export function AddAreaDialog({ city, onClose, onCreated }: AddAreaDialogProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (city) {
      setName('');
      setFieldError('');
      setError(null);
    }
  }, [city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return;
    setError(null);
    setFieldError('');
    setSaving(true);
    try {
      await masterApi.createArea(city.id, { name: name.trim() });
      const areas = await masterApi.getAreasByCity(city.id);
      onCreated(city.id, areas);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors.name) setFieldError(parsed.fieldErrors.name);
      else setError(parsed.general ?? 'Failed to create area.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!city}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add area</DialogTitle>
          <DialogDescription>
            Add an area to <span className="font-medium text-foreground">{city?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="area-name" className={fieldError ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="area-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError('');
              }}
              placeholder="Andheri"
              autoComplete="off"
              autoFocus
              className={fieldError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add area'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
