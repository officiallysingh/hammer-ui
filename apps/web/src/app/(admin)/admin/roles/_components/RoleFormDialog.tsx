'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
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
import { MultiSelect } from '@/components/common/admin/MultiSelect';
import { parseApiError } from '@/lib/api-errors';

// ── Create ────────────────────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPermissions: AuthorityVM[];
  onCreated: () => void;
}

interface RoleFormValues {
  name: string;
  label: string;
  description: string;
  selectedIds: string[];
}

const EMPTY_ROLE_FORM: RoleFormValues = {
  name: '',
  label: '',
  description: '',
  selectedIds: [],
};

export function RoleFormDialog({
  open,
  onOpenChange,
  allPermissions,
  onCreated,
}: CreateRoleDialogProps) {
  const [form, setForm] = useState<RoleFormValues>(EMPTY_ROLE_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const reset = () => {
    setForm(EMPTY_ROLE_FORM);
    setFieldErrors({});
    setError(null);
  };
  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await adminApi.createAuthorityGroup({
        name: form.name.trim(),
        label: form.label.trim(),
        description: form.description.trim() || '',
        authorities: form.selectedIds,
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add role</DialogTitle>
          <DialogDescription>Create a new authority group (role).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cr-name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="cr-name"
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                clearErr('name');
              }}
              placeholder="admin"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-label" className={fieldErrors.label ? 'text-destructive' : ''}>
              Label
            </Label>
            <Input
              id="cr-label"
              value={form.label}
              onChange={(e) => {
                setField('label', e.target.value);
                clearErr('label');
              }}
              placeholder="Admin"
              autoComplete="off"
              className={
                fieldErrors.label ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.label && <p className="text-xs text-destructive">{fieldErrors.label}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="cr-desc"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Administration"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Permissions <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={allPermissions.map((p) => ({
                value: p.id,
                label: p.label,
                sublabel: p.name,
              }))}
              value={form.selectedIds}
              onChange={(ids) => setField('selectedIds', ids)}
              placeholder="Select permissions..."
              searchPlaceholder="Search permissions..."
              emptyMessage="No permissions found"
            />
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
                'Create role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

interface EditRoleDialogProps {
  role: AuthorityGroupVM | null;
  allPermissions: AuthorityVM[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditRoleDialog({ role, allPermissions, onClose, onUpdated }: EditRoleDialogProps) {
  const [form, setForm] = useState<RoleFormValues>(EMPTY_ROLE_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Track originals for diff
  const origRef = React.useRef<{
    name: string;
    label: string;
    description: string;
    perms: string[];
  } | null>(null);

  useEffect(() => {
    if (role) {
      const perms = (role.authorities ?? []).map((a) => a.id);
      origRef.current = {
        name: role.name,
        label: role.label,
        description: role.description ?? '',
        perms,
      };
      setForm({
        name: role.name,
        label: role.label,
        description: role.description ?? '',
        selectedIds: perms,
      });
      setFieldErrors({});
      setError(null);
    }
  }, [role]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !origRef.current) return;
    setError(null);
    setFieldErrors({});

    const orig = origRef.current;
    const patch: Parameters<typeof adminApi.updateAuthorityGroup>[1] = {};
    if (form.name.trim() !== orig.name) patch.name = form.name.trim() || undefined;
    if (form.label.trim() !== orig.label) patch.label = form.label.trim() || undefined;
    if ((form.description.trim() || '') !== orig.description)
      patch.description = form.description.trim() || undefined;

    const permsChanged =
      form.selectedIds.length !== orig.perms.length ||
      form.selectedIds.some((id) => !orig.perms.includes(id));
    if (permsChanged) patch.authorities = form.selectedIds;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateAuthorityGroup(role.id, patch);
      onUpdated();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!role}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{role?.label}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="er-name" className={fieldErrors.name ? 'text-destructive' : ''}>
              Name
            </Label>
            <Input
              id="er-name"
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                clearErr('name');
              }}
              placeholder="admin"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="er-label" className={fieldErrors.label ? 'text-destructive' : ''}>
              Label
            </Label>
            <Input
              id="er-label"
              value={form.label}
              onChange={(e) => {
                setField('label', e.target.value);
                clearErr('label');
              }}
              placeholder="Admin"
              autoComplete="off"
              className={
                fieldErrors.label ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.label && <p className="text-xs text-destructive">{fieldErrors.label}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="er-desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="er-desc"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Administration"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Permissions <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={allPermissions.map((p) => ({
                value: p.id,
                label: p.label,
                sublabel: p.name,
              }))}
              value={form.selectedIds}
              onChange={(ids) => setField('selectedIds', ids)}
              placeholder="Select permissions..."
              searchPlaceholder="Search permissions..."
              emptyMessage="No permissions found"
            />
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
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
