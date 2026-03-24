'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi, adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
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

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<AuthorityGroupVM[]>([]);
  const [availablePerms, setAvailablePerms] = useState<AuthorityVM[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPermsForRoles = useCallback(async (roleIds: string[], keepPerms?: string[]) => {
    if (roleIds.length === 0) {
      setAvailablePerms([]);
      setSelectedPerms([]);
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
        // initial load — keep only perms that exist in available set
        setSelectedPerms(keepPerms.filter((pid) => availableIds.has(pid)));
      } else {
        setSelectedPerms((prev) => prev.filter((pid) => availableIds.has(pid)));
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
        setUsername(u.username ?? '');
        setEmail(u.emailId ?? '');
        setFirstName(u.firstName ?? '');
        setLastName(u.lastName ?? '');
        setMobile(u.mobileNo ?? '');
        setAllRoles(roles);
        const roleIds = (u.authorityGroups ?? []).map((g) => g.id);
        const permIds = (u.authorities ?? []).map((a) => a.id);
        setSelectedRoles(roleIds);
        // fetch perms for the user's existing roles, pre-selecting their existing perms
        fetchPermsForRoles(roleIds, permIds);
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id, fetchPermsForRoles]);

  const handleRolesChange = (roles: string[]) => {
    setSelectedRoles(roles);
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
      await usersApi.updateUser(id, {
        emailId: email.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobile.trim() || undefined,
        authorityGroups: selectedRoles,
        authorities: selectedPerms,
      });
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
            value={email}
            onChange={(v) => {
              setEmail(v);
              clearErr('emailId');
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="firstName"
              label="First name"
              value={firstName}
              onChange={(v) => {
                setFirstName(v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <Field
              id="lastName"
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
          <Field
            id="mobile"
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
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Roles &amp; Permissions</h3>
          <div className="space-y-1.5">
            <Label>
              Roles <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={allRoles.map((r) => ({ value: r.id, label: r.label, sublabel: r.name }))}
              value={selectedRoles}
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
            {selectedRoles.length === 0 ? (
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
                value={selectedPerms}
                onChange={setSelectedPerms}
                placeholder="Select permissions..."
                searchPlaceholder="Search permissions..."
                emptyMessage={loadingPerms ? 'Loading...' : 'No permissions in selected roles'}
              />
            )}
          </div>
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
