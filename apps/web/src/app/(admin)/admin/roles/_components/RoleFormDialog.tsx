'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { adminApi, type RoleVM, type PermissionVM } from '@repo/api';
import { Loader2, HelpCircle } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { MultiSelect } from '@/components/common/admin/MultiSelect';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';
import { ROLE_NAME_PATTERN, ROLE_NAME_ERROR, ROLE_NAME_TIP } from '@/lib/validation';

function RoleNameLabel({ htmlFor, error }: { htmlFor: string; error?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className={error ? 'text-destructive' : ''}>
        Name <span className="text-destructive">*</span>
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {ROLE_NAME_TIP}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ── Create ────────────────────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPermissions: PermissionVM[];
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
    if (!ROLE_NAME_PATTERN.test(form.name.trim())) {
      setFieldErrors({ name: ROLE_NAME_ERROR });
      return;
    }
    setSaving(true);
    try {
      await adminApi.createRole({
        name: form.name.trim(),
        label: form.label.trim(),
        description: form.description.trim() || '',
        permissions: form.selectedIds,
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
          <DialogDescription>Create a new role.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <RoleNameLabel htmlFor="cr-name" error={fieldErrors.name} />
            <Input
              id="cr-name"
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                clearErr('name');
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!ROLE_NAME_PATTERN.test(value)) return;
                const taken = await resolvesExists(adminApi.checkRoleNameExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
              }}
              placeholder="Auction-Manager"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-label" className={fieldErrors.label ? 'text-destructive' : ''}>
              Label <span className="text-destructive">*</span>
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
  role: RoleVM | null;
  allPermissions: PermissionVM[];
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
      const perms = (role.permissions ?? []).map((a) => a.id);
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

    if (!ROLE_NAME_PATTERN.test(form.name.trim())) {
      setFieldErrors({ name: ROLE_NAME_ERROR });
      return;
    }

    const orig = origRef.current;
    const patch: Parameters<typeof adminApi.updateRole>[1] = {};
    if (form.name.trim() !== orig.name) patch.name = form.name.trim() || undefined;
    if (form.label.trim() !== orig.label) patch.label = form.label.trim() || undefined;
    if ((form.description.trim() || '') !== orig.description)
      patch.description = form.description.trim() || undefined;

    const permsChanged =
      form.selectedIds.length !== orig.perms.length ||
      form.selectedIds.some((id) => !orig.perms.includes(id));
    if (permsChanged) patch.permissions = form.selectedIds;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateRole(role.id, patch);
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
            <RoleNameLabel htmlFor="er-name" error={fieldErrors.name} />
            <Input
              id="er-name"
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                clearErr('name');
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!ROLE_NAME_PATTERN.test(value) || value === (origRef.current?.name ?? ''))
                  return;
                const taken = await resolvesExists(adminApi.checkRoleNameExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, name: 'This name is already in use.' }));
              }}
              placeholder="Auction-Manager"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="er-label" className={fieldErrors.label ? 'text-destructive' : ''}>
              Label <span className="text-destructive">*</span>
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
