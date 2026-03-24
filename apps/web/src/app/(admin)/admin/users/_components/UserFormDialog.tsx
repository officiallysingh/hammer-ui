'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, UserCreationReq, UserDetailVM } from '@repo/api';
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
import { parseApiError } from '@/lib/api-errors';

const PWD_RULES =
  '6–12 characters · at least 1 uppercase · 1 lowercase · 1 digit · allowed special: @$!%*?&^';

// ── Shared helpers ────────────────────────────────────────────────────────────

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

/** Toggle pill — yes/no boolean field */
function ToggleField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          value ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
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
  // flags — defaults per spec
  const [enabled, setEnabled] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [mobileVerified, setMobileVerified] = useState(true);
  const [promptChangePwd, setPromptChangePwd] = useState(true); // credentialsNonExpired=false
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
    setEnabled(true);
    setEmailVerified(true);
    setMobileVerified(true);
    setPromptChangePwd(true);
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
        enabled,
        emailIdVerified: emailVerified,
        mobileNoVerified: mobileVerified,
        // promptChangePassword=true means credentialsNonExpired=false
        credentialsNonExpired: !promptChangePwd,
        promptChangePassword: promptChangePwd,
        accountNonLocked: true,
        accountNonExpired: true,
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
      <DialogContent className="max-w-lg">
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

          {/* Flags */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 space-y-1 divide-y divide-border">
            <ToggleField
              label="Enabled"
              value={enabled}
              onChange={setEnabled}
              description="User can log in"
            />
            <ToggleField label="Email verified" value={emailVerified} onChange={setEmailVerified} />
            <ToggleField
              label="Mobile verified"
              value={mobileVerified}
              onChange={setMobileVerified}
            />
            <ToggleField
              label="Prompt change password"
              value={promptChangePwd}
              onChange={setPromptChangePwd}
              description="User must change password on next login"
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
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.emailId ?? '');
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
        emailId: email.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobile.trim() || undefined,
      });
      onUpdated({
        emailId: email.trim(),
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
          <FieldInput
            id="eu-email"
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

export { PWD_RULES };
