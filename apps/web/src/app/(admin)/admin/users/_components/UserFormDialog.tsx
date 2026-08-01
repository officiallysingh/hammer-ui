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
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

function initialsOf(firstName: string, lastName: string) {
  return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined;
}

const PWD_RULES =
  '6–12 characters · at least 1 uppercase · 1 lowercase · 1 digit · allowed special: @$!%*?&^';
const USERNAME_RULES =
  '2–100 characters · lowercase letters and digits only · cannot start with a digit · at most one dot (.) and one underscore (_)';

// ── Shared helpers ────────────────────────────────────────────────────────────

function FieldInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  error,
  optional,
  required,
  tip,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  tip?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className={error ? 'text-destructive' : ''}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
        </Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
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

interface CreateUserFormValues {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  profilePicture: string | undefined;
  enabled: boolean;
  askToVerifyEmail: boolean;
  askToVerifyMobile: boolean;
  promptChangePwd: boolean;
}

const EMPTY_CREATE_USER_FORM: CreateUserFormValues = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  mobile: '',
  profilePicture: undefined,
  enabled: true,
  askToVerifyEmail: false,
  askToVerifyMobile: false,
  promptChangePwd: true,
};

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [form, setForm] = useState<CreateUserFormValues>(EMPTY_CREATE_USER_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof CreateUserFormValues>(key: K, value: CreateUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const reset = () => {
    setForm(EMPTY_CREATE_USER_FORM);
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
    if (
      !form.username.trim() ||
      !form.email.trim() ||
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError('Username, email, first name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: UserCreationReq = {
        username: form.username.trim(),
        emailId: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNo: form.mobile.trim() || undefined,
        profilePicture: form.profilePicture,
        enabled: form.enabled,
        emailIdVerified: !form.askToVerifyEmail,
        mobileNoVerified: !form.askToVerifyMobile,
        // promptChangePassword=true means credentialsNonExpired=false
        credentialsNonExpired: !form.promptChangePwd,
        promptChangePassword: form.promptChangePwd,
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
          <AvatarUpload
            value={form.profilePicture}
            onChange={(v) => setField('profilePicture', v)}
            fallbackText={initialsOf(form.firstName, form.lastName)}
          />
          <FieldInput
            id="cu-username"
            label="Username"
            required
            value={form.username}
            onChange={(v) => {
              setField('username', v);
              clearErr('username');
            }}
            onBlur={async (v) => {
              const value = v.trim();
              if (!value) return;
              const taken = await resolvesExists(usersApi.checkUsernameExists(value));
              if (taken) setFieldErrors((p) => ({ ...p, username: 'This username is taken.' }));
            }}
            placeholder="rajveer.singh"
            error={fieldErrors.username}
            tip={USERNAME_RULES}
          />
          <FieldInput
            id="cu-email"
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            onBlur={async (v) => {
              const value = v.trim();
              if (!value) return;
              const taken = await resolvesExists(usersApi.checkEmailExists(value));
              if (taken)
                setFieldErrors((p) => ({ ...p, emailId: 'This email is already registered.' }));
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              id="cu-first"
              label="First name"
              required
              value={form.firstName}
              onChange={(v) => {
                setField('firstName', v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <FieldInput
              id="cu-last"
              label="Last name"
              required
              value={form.lastName}
              onChange={(v) => {
                setField('lastName', v);
                clearErr('lastName');
              }}
              placeholder="Singh"
              error={fieldErrors.lastName}
            />
          </div>
          <FieldInput
            id="cu-mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            onBlur={async (v) => {
              const value = v.trim();
              if (!value) return;
              const taken = await resolvesExists(usersApi.checkMobileExists(value));
              if (taken)
                setFieldErrors((p) => ({
                  ...p,
                  mobileNo: 'This mobile number is already in use.',
                }));
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
            optional
          />

          {/* Flags */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 space-y-1 divide-y divide-border">
            <ToggleField
              label="Enabled"
              value={form.enabled}
              onChange={(value) => setField('enabled', value)}
              description="User can log in"
            />
            <ToggleField
              label="Ask to verify email"
              value={form.askToVerifyEmail}
              onChange={(value) => setField('askToVerifyEmail', value)}
            />
            <ToggleField
              label="Ask to verify mobile"
              value={form.askToVerifyMobile}
              onChange={(value) => setField('askToVerifyMobile', value)}
            />
            <ToggleField
              label="Prompt change password"
              value={form.promptChangePwd}
              onChange={(value) => setField('promptChangePwd', value)}
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
  interface EditUserFormValues {
    email: string;
    firstName: string;
    lastName: string;
    mobile: string;
    profilePicture: string | undefined;
  }

  const [form, setForm] = useState<EditUserFormValues>({
    email: '',
    firstName: '',
    lastName: '',
    mobile: '',
    profilePicture: undefined,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof EditUserFormValues>(key: K, value: EditUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (user) {
      setForm({
        email: user.emailId ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobile: user.mobileNo ?? '',
        profilePicture: user.profilePicture ?? undefined,
      });
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
      const pictureChanged = form.profilePicture !== (user.profilePicture ?? undefined);
      await usersApi.updateUser(user.id, {
        emailId: form.email.trim() || undefined,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        mobileNo: form.mobile.trim() || undefined,
        ...(pictureChanged ? { profilePicture: form.profilePicture ?? null } : {}),
      });
      onUpdated({
        emailId: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNo: form.mobile.trim(),
        ...(pictureChanged ? { profilePicture: form.profilePicture ?? null } : {}),
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
          <AvatarUpload
            value={form.profilePicture}
            onChange={(v) => setField('profilePicture', v)}
            fallbackText={initialsOf(form.firstName, form.lastName)}
          />
          <FieldInput
            id="eu-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            onBlur={async (v) => {
              const value = v.trim();
              if (!value || value === (user?.emailId ?? '')) return;
              const taken = await resolvesExists(usersApi.checkEmailExists(value));
              if (taken)
                setFieldErrors((p) => ({ ...p, emailId: 'This email is already registered.' }));
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              id="eu-first"
              label="First name"
              value={form.firstName}
              onChange={(v) => {
                setField('firstName', v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <FieldInput
              id="eu-last"
              label="Last name"
              value={form.lastName}
              onChange={(v) => {
                setField('lastName', v);
                clearErr('lastName');
              }}
              placeholder="Singh"
              error={fieldErrors.lastName}
            />
          </div>
          <FieldInput
            id="eu-mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            onBlur={async (v) => {
              const value = v.trim();
              if (!value || value === (user?.mobileNo ?? '')) return;
              const taken = await resolvesExists(usersApi.checkMobileExists(value));
              if (taken)
                setFieldErrors((p) => ({
                  ...p,
                  mobileNo: 'This mobile number is already in use.',
                }));
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
