'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, UserCreationReq, adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
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
    <div className="space-y-1.5">
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

interface NewUserFormValues {
  username: string;
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
}

const EMPTY_NEW_USER_FORM: NewUserFormValues = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  mobile: '',
  enabled: true,
  emailVerified: true,
  mobileVerified: true,
  promptChangePwd: true,
  selectedRoles: [],
  selectedPerms: [],
};

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<NewUserFormValues>(EMPTY_NEW_USER_FORM);
  const [allRoles, setAllRoles] = useState<AuthorityGroupVM[]>([]);
  const [availablePerms, setAvailablePerms] = useState<AuthorityVM[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof NewUserFormValues>(key: K, value: NewUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    adminApi
      .getAuthorityGroups()
      .then(setAllRoles)
      .catch(() => {});
  }, []);

  const fetchPermsForRoles = useCallback(async (roleIds: string[]) => {
    if (roleIds.length === 0) {
      setAvailablePerms([]);
      setForm((prev) => ({ ...prev, selectedPerms: [] }));
      return;
    }
    setLoadingPerms(true);
    try {
      const results = await Promise.all(roleIds.map((id) => adminApi.getAuthoritiesByGroup(id)));
      const map = new Map<string, AuthorityVM>();
      results.flat().forEach((p) => map.set(p.id, p));
      const perms = Array.from(map.values());
      setAvailablePerms(perms);
      const availableIds = new Set(perms.map((p) => p.id));
      setForm((prev) => ({
        ...prev,
        selectedPerms: prev.selectedPerms.filter((id) => availableIds.has(id)),
      }));
    } catch {
      setAvailablePerms([]);
    } finally {
      setLoadingPerms(false);
    }
  }, []);

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
    setSaving(true);
    try {
      const payload: UserCreationReq = {
        username: form.username.trim(),
        emailId: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNo: form.mobile.trim() || undefined,
        enabled: form.enabled,
        emailIdVerified: form.emailVerified,
        mobileNoVerified: form.mobileVerified,
        credentialsNonExpired: !form.promptChangePwd,
        promptChangePassword: form.promptChangePwd,
        accountNonLocked: true,
        accountNonExpired: true,
        authorityGroups: form.selectedRoles.length ? form.selectedRoles : undefined,
        authorities: form.selectedPerms.length ? form.selectedPerms : undefined,
      };
      await usersApi.createUser(payload);
      router.push('/admin/users');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add user"
        description="Create a new user account"
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
          <Field
            id="username"
            label="Username"
            value={form.username}
            onChange={(v) => {
              setField('username', v);
              clearErr('username');
            }}
            placeholder="rajveer.singh"
            error={fieldErrors.username}
          />
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
                Additional permissions
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
                onChange={(ids) => setForm((prev) => ({ ...prev, selectedPerms: ids }))}
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
            onChange={(value) => setField('enabled', value)}
          />
          <Toggle
            label="Email verified"
            value={form.emailVerified}
            onChange={(value) => setField('emailVerified', value)}
          />
          <Toggle
            label="Mobile verified"
            value={form.mobileVerified}
            onChange={(value) => setField('mobileVerified', value)}
          />
          <Toggle
            label="Prompt change password"
            description="User must set a new password on next login"
            value={form.promptChangePwd}
            onChange={(value) => setField('promptChangePwd', value)}
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
              'Create user'
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
