'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi, AuthorityVM } from '@repo/api';
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

// ── Shared form fields ────────────────────────────────────────────────────────

function PermissionFields({
  name,
  onName,
  label,
  onLabel,
  description,
  onDescription,
  fieldErrors,
  clearErr,
  nameId,
  labelId,
  descId,
}: {
  name: string;
  onName: (v: string) => void;
  label: string;
  onLabel: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  fieldErrors: Record<string, string>;
  clearErr: (f: string) => void;
  nameId: string;
  labelId: string;
  descId: string;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={nameId} className={fieldErrors.name ? 'text-destructive' : ''}>
          Name
        </Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => {
            onName(e.target.value);
            clearErr('name');
          }}
          placeholder="admin.users.create"
          autoComplete="off"
          className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={labelId} className={fieldErrors.label ? 'text-destructive' : ''}>
          Label
        </Label>
        <Input
          id={labelId}
          value={label}
          onChange={(e) => {
            onLabel(e.target.value);
            clearErr('label');
          }}
          placeholder="Create Users"
          autoComplete="off"
          className={fieldErrors.label ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {fieldErrors.label && <p className="text-xs text-destructive">{fieldErrors.label}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={descId} className={fieldErrors.description ? 'text-destructive' : ''}>
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={descId}
          value={description}
          onChange={(e) => {
            onDescription(e.target.value);
            clearErr('description');
          }}
          placeholder="Allows creating users"
          autoComplete="off"
          className={
            fieldErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''
          }
        />
        {fieldErrors.description && (
          <p className="text-xs text-destructive">{fieldErrors.description}</p>
        )}
      </div>
    </>
  );
}

// ── Create ────────────────────────────────────────────────────────────────────

interface CreatePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreatePermissionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePermissionDialogProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
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
      await adminApi.createAuthority({
        name: name.trim(),
        label: label.trim(),
        description: description.trim(),
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add permission</DialogTitle>
          <DialogDescription>Create a new authority (permission).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PermissionFields
            name={name}
            onName={setName}
            label={label}
            onLabel={setLabel}
            description={description}
            onDescription={setDescription}
            fieldErrors={fieldErrors}
            clearErr={clearErr}
            nameId="cp-name"
            labelId="cp-label"
            descId="cp-desc"
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
                'Create permission'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

interface EditPermissionDialogProps {
  permission: AuthorityVM | null;
  onClose: () => void;
  onUpdated: (updated: Pick<AuthorityVM, 'name' | 'label' | 'description'>) => void;
}

export function EditPermissionDialog({
  permission,
  onClose,
  onUpdated,
}: EditPermissionDialogProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const origRef = useRef<{ name: string; label: string; description: string } | null>(null);

  useEffect(() => {
    if (permission) {
      const orig = {
        name: permission.name,
        label: permission.label,
        description: permission.description ?? '',
      };
      origRef.current = orig;
      setName(orig.name);
      setLabel(orig.label);
      setDescription(orig.description);
      setFieldErrors({});
      setError(null);
    }
  }, [permission]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission || !origRef.current) return;
    setError(null);
    setFieldErrors({});

    const orig = origRef.current;
    const patch: Parameters<typeof adminApi.updateAuthority>[1] = {};
    if (name.trim() !== orig.name) patch.name = name.trim() || undefined;
    if (label.trim() !== orig.label) patch.label = label.trim() || undefined;
    if ((description.trim() || '') !== orig.description)
      patch.description = description.trim() || undefined;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateAuthority(permission.id, patch);
      onUpdated({
        name: name.trim(),
        label: label.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!permission}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit permission</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{permission?.label}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PermissionFields
            name={name}
            onName={setName}
            label={label}
            onLabel={setLabel}
            description={description}
            onDescription={setDescription}
            fieldErrors={fieldErrors}
            clearErr={clearErr}
            nameId="ep-name"
            labelId="ep-label"
            descId="ep-desc"
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
