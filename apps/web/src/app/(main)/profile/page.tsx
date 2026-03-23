'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, authApi } from '@repo/api';
import type { UserInfo } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, User, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui';
import { parseApiError } from '@/lib/api-errors';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={error ? 'text-destructive' : ''}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`pr-10 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Update Profile Tab ────────────────────────────────────────────────────────
function UpdateProfileTab({
  userInfo,
  setUserInfo,
}: {
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo | null) => void;
}) {
  const [firstName, setFirstName] = useState(userInfo?.firstName ?? '');
  const [lastName, setLastName] = useState(userInfo?.lastName ?? '');
  const [mobileNo, setMobileNo] = useState(userInfo?.mobileNo ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setSaving(true);
    try {
      await usersApi.updateSelf({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined,
      });
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          mobileNo: mobileNo.trim() || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={fieldErrors.firstName}>
          <Input
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearErr('firstName');
            }}
            placeholder="John"
            autoComplete="given-name"
            className={
              fieldErrors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
        </Field>
        <Field label="Last name" error={fieldErrors.lastName}>
          <Input
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearErr('lastName');
            }}
            placeholder="Doe"
            autoComplete="family-name"
            className={
              fieldErrors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
        </Field>
      </div>
      <Field label="Mobile number" error={fieldErrors.mobileNo}>
        <Input
          value={mobileNo}
          onChange={(e) => {
            setMobileNo(e.target.value);
            clearErr('mobileNo');
          }}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          type="tel"
          className={
            fieldErrors.mobileNo ? 'border-destructive focus-visible:ring-destructive' : ''
          }
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ── Change Password Tab ───────────────────────────────────────────────────────
function ChangePasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (next !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    const pwdRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d@$!%*?&^]{6,12}$/;
    if (!pwdRegex.test(next)) {
      setFieldErrors({
        newPassword: '6–12 chars, must include uppercase, lowercase and a number.',
      });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Current password" error={fieldErrors.currentPassword}>
        <PasswordInput
          id="current"
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
          placeholder="Enter current password"
          error={fieldErrors.currentPassword}
        />
      </Field>
      <Field label="New password" error={fieldErrors.newPassword}>
        <PasswordInput
          id="new"
          value={next}
          onChange={setNext}
          show={showNext}
          onToggle={() => setShowNext((s) => !s)}
          placeholder="6–12 chars, A-Z, a-z, 0-9"
          error={fieldErrors.newPassword}
        />
      </Field>
      <Field label="Confirm new password" error={fieldErrors.confirm}>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={setConfirm}
          show={showNext}
          onToggle={() => setShowNext((s) => !s)}
          placeholder="Repeat new password"
          error={fieldErrors.confirm}
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving || !current || !next || !confirm} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Update password
            </>
          )}
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Password updated
          </span>
        )}
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo } = useAuthStore();

  if (!user?.authenticated) {
    router.replace('/login');
    return null;
  }

  const displayName = userInfo?.firstName
    ? `${userInfo.firstName}${userInfo.lastName ? ` ${userInfo.lastName}` : ''}`
    : user.username;

  return (
    <div className="w-full px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Avatar header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
            <span className="font-display text-2xl font-bold text-primary uppercase">
              {displayName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{userInfo?.emailId ?? user.username}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1 gap-2">
              <Lock className="h-4 w-4" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <UpdateProfileTab userInfo={userInfo} setUserInfo={setUserInfo} />
          </TabsContent>

          <TabsContent value="password">
            <ChangePasswordTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
