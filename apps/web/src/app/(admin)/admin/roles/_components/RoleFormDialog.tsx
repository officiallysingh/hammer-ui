'use client';

import { useEffect, useState } from 'react';
import { adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
import { Loader2, Check } from 'lucide-react';
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

// ── Shared permissions picker ─────────────────────────────────────────────────

function PermissionsPicker({
  allPermissions,
  selectedIds,
  onToggle,
}: {
  allPermissions: AuthorityVM[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = allPermissions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Permissions</Label>
        {selectedIds.size > 0 && (
          <span className="text-xs text-primary font-medium">{selectedIds.size} selected</span>
        )}
      </div>
      <Input
        placeholder="Search permissions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-muted/20 divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center">No permissions found</p>
        ) : (
          filtered.map((perm) => {
            const checked = selectedIds.has(perm.id);
            return (
              <button
                key={perm.id}
                type="button"
                onClick={() => onToggle(perm.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${checked ? 'bg-primary/5' : ''}`}
              >
                <span
                  className={`flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border'}`}
                >
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-foreground truncate">{perm.label}</span>
                  <span className="block font-mono text-xs text-muted-foreground truncate">
                    {perm.name}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });
  const togglePerm = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const reset = () => {
    setName('');
    setLabel('');
    setDescription('');
    setSelectedIds(new Set());
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
        authorities: Array.from(selectedIds),
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
          <PermissionsPicker
            allPermissions={allPermissions}
            selectedIds={selectedIds}
            onToggle={togglePerm}
          />
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setLabel(role.label);
      setDescription(role.description ?? '');
      setSelectedIds(new Set((role.authorities ?? []).map((a) => a.id)));
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
  const togglePerm = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
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
        newAuthorities: Array.from(selectedIds),
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
          <PermissionsPicker
            allPermissions={allPermissions}
            selectedIds={selectedIds}
            onToggle={togglePerm}
          />
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
