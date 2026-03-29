'use client';

import { useEffect, useState } from 'react';
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

export function RoleFormDialog({
  open,
  onOpenChange,
  allPermissions,
  onCreated,
}: CreateRoleDialogProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const reset = () => {
    setName('');
    setLabel('');
    setDescription('');
    setSelectedIds([]);
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
        name: name.trim(),
        label: label.trim(),
        description: description.trim() || '',
        authorities: selectedIds,
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
      <DialogContent className="max-w-lg">
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
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
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={selectedIds}
              onChange={setSelectedIds}
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
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setLabel(role.label);
      setDescription(role.description ?? '');
      setFieldErrors({});
      setError(null);
      // fetch this role's current permissions
      setLoadingPerms(true);
      adminApi
        .getAuthoritiesByGroup(role.id)
        .then((perms) => setSelectedIds(perms.map((p) => p.id)))
        .catch(() => setSelectedIds([]))
        .finally(() => setLoadingPerms(false));
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
    if (!role) return;
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await adminApi.updateAuthorityGroup(role.id, {
        name: name.trim() || undefined,
        label: label.trim() || undefined,
        description: description.trim() || undefined,
        authorities: selectedIds,
      });
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
      <DialogContent className="max-w-lg">
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
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
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Administration"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>
                Permissions <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              {loadingPerms && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <MultiSelect
              options={allPermissions.map((p) => ({
                value: p.id,
                label: p.label,
                sublabel: p.name,
              }))}
              value={selectedIds}
              onChange={setSelectedIds}
              placeholder={loadingPerms ? 'Loading...' : 'Select permissions...'}
              searchPlaceholder="Search permissions..."
              emptyMessage="No permissions found"
            />
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingPerms}>
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
