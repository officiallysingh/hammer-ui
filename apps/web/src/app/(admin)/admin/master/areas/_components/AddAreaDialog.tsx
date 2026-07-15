'use client';

import { useEffect, useState } from 'react';
import { masterApi, StateVM, CityVM, AreaVM } from '@repo/api';
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
  open: boolean;
  states: StateVM[];
  onClose: () => void;
  onCreated: (area: AreaVM) => void;
}

export function AddAreaDialog({ open, states, onClose, onCreated }: AddAreaDialogProps) {
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<CityVM[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStateId(states[0]?.id ?? '');
      setName('');
      setFieldError('');
      setError(null);
    }
  }, [open, states]);

  useEffect(() => {
    if (!open || !stateId) {
      setCities([]);
      setCityId('');
      return;
    }
    setCitiesLoading(true);
    setCityId('');
    masterApi
      .getCitiesByState(stateId)
      .then((data) => {
        setCities(data);
        setCityId(data[0]?.id ?? '');
      })
      .catch(() => setError('Failed to load cities for this state.'))
      .finally(() => setCitiesLoading(false));
  }, [open, stateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityId) {
      setError('Please select a city.');
      return;
    }
    setError(null);
    setFieldError('');
    setSaving(true);
    try {
      await masterApi.createArea(cityId, { name: name.trim() });
      const areas = await masterApi.getAreasByCity(cityId);
      const created = areas.find((a) => a.name === name.trim()) ?? areas[areas.length - 1];
      const city = cities.find((c) => c.id === cityId);
      const state = states.find((s) => s.id === stateId);
      if (created) onCreated({ ...created, city: city ? { ...city, state } : undefined });
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
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add area</DialogTitle>
          <DialogDescription>Add an area to a city.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="area-state">
              State <span className="text-destructive">*</span>
            </Label>
            <select
              id="area-state"
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="area-city">
              City <span className="text-destructive">*</span>
            </Label>
            <select
              id="area-city"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={citiesLoading || !cities.length}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {cities.length === 0 && <option value="">No cities in this state</option>}
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="area-name" className={fieldError ? 'text-destructive' : ''}>
              Name <span className="text-destructive">*</span>
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
            <Button type="submit" disabled={saving || !cityId}>
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
