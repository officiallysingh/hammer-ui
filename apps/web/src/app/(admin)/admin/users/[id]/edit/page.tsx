'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  usersApi,
  adminApi,
  AuthorityGroupVM,
  AuthorityVM,
  UserDetailVM,
  UserUpdateReq,
} from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { MultiSelect } from '@/components/common/admin/MultiSelect';
import { parseApiError } from '@/lib/api-errors';

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  optional,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={error ? 'text-destructive' : disabled ? 'text-muted-foreground' : ''}
      >
        {label}
        {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={`${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const originalRef = useRef<UserDetailVM | null>(null);
  const originalRolesRef = useRef<string[]>([]);
  const originalPermsRef = useRef<string[]>([]);

  type UserFormValues = {
    email: string;
    firstName: string;
    lastName: string;
    mobile: string;
    enabled: boolean;
    emailVerified: boolean;
    mobileVerified: boolean;
    promptChangePwd: boolean;
    selectedRoles: string[];
    selectedPerms: string[];
  };

  const EMPTY_USER_FORM: UserFormValues = {
    email: '',
    firstName: '',
    lastName: '',
    mobile: '',
    enabled: true,
    emailVerified: true,
    mobileVerified: true,
    promptChangePwd: false,
    selectedRoles: [],
    selectedPerms: [],
  };

  const [form, setForm] = useState<UserFormValues>(EMPTY_USER_FORM);
  const setField = useCallback(
    <K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const [allRoles, setAllRoles] = useState<AuthorityGroupVM[]>([]);
  const [availablePerms, setAvailablePerms] = useState<AuthorityVM[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // username is display-only
  const [username, setUsername] = useState('');

  const fetchPermsForRoles = useCallback(async (roleIds: string[], keepPerms?: string[]) => {
    if (roleIds.length === 0) {
      setAvailablePerms([]);
      setForm((prev) => ({ ...prev, selectedPerms: [] }));
      return;
    }
    setLoadingPerms(true);
    try {
      const results = await Promise.all(roleIds.map((rid) => adminApi.getAuthoritiesByGroup(rid)));
      const map = new Map<string, AuthorityVM>();
      results.flat().forEach((p) => map.set(p.id, p));
      const perms = Array.from(map.values());
      setAvailablePerms(perms);
      const availableIds = new Set(perms.map((p) => p.id));
      if (keepPerms !== undefined) {
        setForm((prev) => ({
          ...prev,
          selectedPerms: keepPerms.filter((pid) => availableIds.has(pid)),
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          selectedPerms: prev.selectedPerms.filter((pid) => availableIds.has(pid)),
        }));
      }
    } catch {
      setAvailablePerms([]);
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([usersApi.getUserById(id), adminApi.getAuthorityGroups()])
      .then(([u, roles]) => {
        originalRef.current = u;
        setUsername(u.username ?? '');
        setForm({
          email: u.emailId ?? '',
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          mobile: u.mobileNo ?? '',
          enabled: u.enabled,
          emailVerified: u.emailIdVerified,
          mobileVerified: u.mobileNoVerified,
          promptChangePwd: u.promptChangePassword,
          selectedRoles: (u.authorityGroups ?? []).map((g) => g.id),
          selectedPerms: (u.authorities ?? []).map((a) => a.id),
        });
        setAllRoles(roles);
        const roleIds = (u.authorityGroups ?? []).map((g) => g.id);
        const permIds = (u.authorities ?? []).map((a) => a.id);
        originalRolesRef.current = roleIds;
        originalPermsRef.current = permIds;
        fetchPermsForRoles(roleIds, permIds);
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id, fetchPermsForRoles]);

  const handleRolesChange = (roles: string[]) => {
    setForm((prev) => ({ ...prev, selectedRoles: roles }));
    fetchPermsForRoles(roles);
  };

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
    const orig = originalRef.current;
    if (!orig) return;

    // Build patch with only changed fields
    const patch: UserUpdateReq = {};
    if (form.email.trim() !== (orig.emailId ?? '')) patch.emailId = form.email.trim() || undefined;
    if (form.firstName.trim() !== (orig.firstName ?? ''))
      patch.firstName = form.firstName.trim() || undefined;
    if (form.lastName.trim() !== (orig.lastName ?? ''))
      patch.lastName = form.lastName.trim() || undefined;
    if (form.mobile.trim() !== (orig.mobileNo ?? ''))
      patch.mobileNo = form.mobile.trim() || undefined;
    if (form.enabled !== orig.enabled) patch.enabled = form.enabled;
    if (form.emailVerified !== orig.emailIdVerified) patch.emailIdVerified = form.emailVerified;
    if (form.mobileVerified !== orig.mobileNoVerified) patch.mobileNoVerified = form.mobileVerified;
    if (form.promptChangePwd !== orig.promptChangePassword)
      patch.credentialsNonExpired = !form.promptChangePwd;

    // Roles changed?
    const rolesChanged =
      form.selectedRoles.length !== originalRolesRef.current.length ||
      form.selectedRoles.some((r) => !originalRolesRef.current.includes(r));
    if (rolesChanged) patch.authorityGroups = form.selectedRoles;

    // Perms changed?
    const permsChanged =
      form.selectedPerms.length !== originalPermsRef.current.length ||
      form.selectedPerms.some((p) => !originalPermsRef.current.includes(p));
    if (permsChanged) patch.authorities = form.selectedPerms;

    if (Object.keys(patch).length === 0) {
      router.push('/admin/users');
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateUser(id, patch);
      router.push('/admin/users');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit user"
        description={username ? `Editing: ${username}` : 'Update user details'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Account details</h3>
          <Field id="username" label="Username" value={username} disabled />
          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="firstName"
              label="First name"
              value={form.firstName}
              onChange={(v) => {
                setField('firstName', v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <Field
              id="lastName"
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
          <Field
            id="mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
            optional
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Roles &amp; Permissions</h3>
          <div className="space-y-1.5">
            <Label>
              Roles <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={allRoles.map((r) => ({ value: r.id, label: r.label, sublabel: r.name }))}
              value={form.selectedRoles}
              onChange={handleRolesChange}
              placeholder="Select roles..."
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>
                Additional permissions{' '}
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              {loadingPerms && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {form.selectedRoles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Select roles first to see their permissions.
              </p>
            ) : (
              <MultiSelect
                options={availablePerms.map((p) => ({
                  value: p.id,
                  label: p.label,
                  sublabel: p.name,
                }))}
                value={form.selectedPerms}
                onChange={(perms) => setField('selectedPerms', perms)}
                placeholder="Select permissions..."
                searchPlaceholder="Search permissions..."
                emptyMessage={loadingPerms ? 'Loading...' : 'No permissions in selected roles'}
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-6 divide-y divide-border">
          <h3 className="text-sm font-semibold text-foreground py-4">Account settings</h3>
          <Toggle
            label="Enabled"
            description="User can log in"
            value={form.enabled}
            onChange={(v) => setField('enabled', v)}
          />
          <Toggle
            label="Email verified"
            value={form.emailVerified}
            onChange={(v) => setField('emailVerified', v)}
          />
          <Toggle
            label="Mobile verified"
            value={form.mobileVerified}
            onChange={(v) => setField('mobileVerified', v)}
          />
          <Toggle
            label="Prompt change password"
            description="User must set a new password on next login"
            value={form.promptChangePwd}
            onChange={(v) => setField('promptChangePwd', v)}
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/users')}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
