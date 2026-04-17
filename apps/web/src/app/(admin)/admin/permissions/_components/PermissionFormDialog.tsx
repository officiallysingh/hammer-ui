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

interface PermissionFormValues {
  name: string;
  label: string;
  description: string;
}

const EMPTY_PERMISSION_FORM: PermissionFormValues = {
  name: '',
  label: '',
  description: '',
};

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
  const [form, setForm] = useState<PermissionFormValues>(EMPTY_PERMISSION_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof PermissionFormValues>(key: K, value: PermissionFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });
  const reset = () => {
    setForm(EMPTY_PERMISSION_FORM);
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
        name: form.name.trim(),
        label: form.label.trim(),
        description: form.description.trim(),
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
            name={form.name}
            onName={(value) => {
              setField('name', value);
              clearErr('name');
            }}
            label={form.label}
            onLabel={(value) => {
              setField('label', value);
              clearErr('label');
            }}
            description={form.description}
            onDescription={(value) => {
              setField('description', value);
              clearErr('description');
            }}
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
  const [form, setForm] = useState<PermissionFormValues>(EMPTY_PERMISSION_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const origRef = useRef<{ name: string; label: string; description: string } | null>(null);

  const setField = <K extends keyof PermissionFormValues>(key: K, value: PermissionFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (permission) {
      const orig = {
        name: permission.name,
        label: permission.label,
        description: permission.description ?? '',
      };
      origRef.current = orig;
      setForm(orig);
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
    if (form.name.trim() !== orig.name) patch.name = form.name.trim() || undefined;
    if (form.label.trim() !== orig.label) patch.label = form.label.trim() || undefined;
    if ((form.description.trim() || '') !== orig.description)
      patch.description = form.description.trim() || undefined;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateAuthority(permission.id, patch);
      onUpdated({
        name: form.name.trim(),
        label: form.label.trim(),
        description: form.description.trim() || undefined,
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
            name={form.name}
            onName={(value) => {
              setField('name', value);
              clearErr('name');
            }}
            label={form.label}
            onLabel={(value) => {
              setField('label', value);
              clearErr('label');
            }}
            description={form.description}
            onDescription={(value) => {
              setField('description', value);
              clearErr('description');
            }}
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
