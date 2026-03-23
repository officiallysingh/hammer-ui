'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, UserCreationReq, UserDetailVM } from '@repo/api';
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

// ── Shared field error helpers ────────────────────────────────────────────────

function FieldInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={error ? 'text-destructive' : ''}>
        {label}
        {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
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
    setUsername('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setMobile('');
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
    if (!username.trim() || !email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Username, email, first name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: UserCreationReq = {
        username: username.trim(),
        emailId: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNo: mobile.trim() || undefined,
      };
      await usersApi.createUser(payload);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Create a new user in the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldInput
            id="cu-username"
            label="Username"
            value={username}
            onChange={(v) => {
              setUsername(v);
              clearErr('username');
            }}
            placeholder="rajveer.singh"
            error={fieldErrors.username}
          />
          <FieldInput
            id="cu-email"
            label="Email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              clearErr('emailId');
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              id="cu-first"
              label="First name"
              value={firstName}
              onChange={(v) => {
                setFirstName(v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <FieldInput
              id="cu-last"
              label="Last name"
              value={lastName}
              onChange={(v) => {
                setLastName(v);
                clearErr('lastName');
              }}
              placeholder="Singh"
              error={fieldErrors.lastName}
            />
          </div>
          <FieldInput
            id="cu-mobile"
            label="Mobile"
            value={mobile}
            onChange={(v) => {
              setMobile(v);
              clearErr('mobileNo');
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
            optional
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
                'Create user'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditUserDialogProps {
  user: UserDetailVM | null;
  onClose: () => void;
  onUpdated: (updated: Partial<UserDetailVM>) => void;
}

export function EditUserDialog({ user, onClose, onUpdated }: EditUserDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setMobile(user.mobileNo ?? '');
      setFieldErrors({});
      setError(null);
    }
  }, [user]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await usersApi.updateUser(user.id, {
        emailId: user.emailId,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobile.trim() || undefined,
      });
      onUpdated({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNo: mobile.trim(),
      });
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update details for{' '}
            <span className="font-medium text-foreground">{user?.username ?? user?.emailId}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              id="eu-first"
              label="First name"
              value={firstName}
              onChange={(v) => {
                setFirstName(v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <FieldInput
              id="eu-last"
              label="Last name"
              value={lastName}
              onChange={(v) => {
                setLastName(v);
                clearErr('lastName');
              }}
              placeholder="Singh"
              error={fieldErrors.lastName}
            />
          </div>
          <FieldInput
            id="eu-mobile"
            label="Mobile"
            value={mobile}
            onChange={(v) => {
              setMobile(v);
              clearErr('mobileNo');
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
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
