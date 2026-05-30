'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usersApi, adminApi, UserDetailVM, AuthorityGroupVM } from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  UserPlus,
  Pencil,
  PowerOff,
  Power,
  Lock,
  LockOpen,
  CheckCircle2,
  Circle,
  Search,
  X,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';

interface SelectOption {
  label: string;
  value: string;
}

const reactSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '2.25rem',
    fontSize: '0.875rem',
    '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
  }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'hsl(var(--background))',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
    zIndex: 50,
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
};

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  ) : (
    <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
  );
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserDetailVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Filter state
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [selectedRoles, setSelectedRoles] = useState<SelectOption[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<SelectOption[]>([]);
  const [allRoles, setAllRoles] = useState<AuthorityGroupVM[]>([]);

  // Column visibility
  const [showRoles, setShowRoles] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const phrasesRef = useRef<string[]>(searchParams.getAll('phrases'));

  // Load all roles (with their permissions) once on mount
  useEffect(() => {
    const roleIds = searchParams.getAll('roles');
    const permIds = searchParams.getAll('permissions');
    adminApi
      .getAuthorityGroups(true)
      .then((groups) => {
        setAllRoles(groups);
        if (roleIds.length) {
          setSelectedRoles(
            groups
              .filter((g) => roleIds.includes(g.id))
              .map((g) => ({ label: g.label, value: g.id })),
          );
        }
        if (permIds.length) {
          const allPerms = groups.flatMap((g) => g.authorities ?? []);
          setSelectedPermissions(
            allPerms
              .filter((a) => permIds.includes(a.id))
              .map((a) => ({ label: a.label, value: a.id })),
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roleOptions: SelectOption[] = allRoles.map((g) => ({ label: g.label, value: g.id }));

  const permissionOptions: SelectOption[] = selectedRoles.length
    ? selectedRoles.flatMap((opt) => {
        const group = allRoles.find((g) => g.id === opt.value);
        return (group?.authorities ?? []).map((a) => ({ label: a.label, value: a.id }));
      })
    : allRoles.flatMap((g) => (g.authorities ?? []).map((a) => ({ label: a.label, value: a.id })));

  const fetchUsers = async (opts?: {
    phrases?: string[];
    roles?: string[];
    permissions?: string[];
    showRolesCol?: boolean;
    showPermsCol?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const expand: ('authorities' | 'authority-groups')[] = [];
      if (opts?.showPermsCol ?? showPermissions) expand.push('authorities');
      if (opts?.showRolesCol ?? showRoles) expand.push('authority-groups');
      const result = await usersApi.getUsers(
        0,
        20,
        opts?.phrases?.length ? opts.phrases : undefined,
        expand.length ? expand : undefined,
        opts?.roles?.length ? opts.roles : undefined,
        opts?.permissions?.length ? opts.permissions : undefined,
      );
      setUsers(result.content ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initPhrases = phrasesRef.current.length ? phrasesRef.current : undefined;
    const initRoles = searchParams.getAll('roles');
    const initPerms = searchParams.getAll('permissions');
    fetchUsers({
      phrases: initPhrases,
      roles: initRoles,
      permissions: initPerms,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when column visibility changes
  const prevRoles = useRef(showRoles);
  const prevPerms = useRef(showPermissions);
  useEffect(() => {
    if (prevRoles.current !== showRoles || prevPerms.current !== showPermissions) {
      prevRoles.current = showRoles;
      prevPerms.current = showPermissions;
      fetchUsers({
        phrases: phrasesRef.current.length ? phrasesRef.current : undefined,
        roles: selectedRoles.map((o) => o.value),
        permissions: selectedPermissions.map((o) => o.value),
        showRolesCol: showRoles,
        showPermsCol: showPermissions,
      });
    }
  }, [showRoles, showPermissions]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (ph: string[], roles: SelectOption[], perms: SelectOption[]) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    roles.forEach((r) => params.append('roles', r.value));
    perms.forEach((p) => params.append('permissions', p.value));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    phrasesRef.current = phrases;
    router.replace(buildFilterUrl(phrases, selectedRoles, selectedPermissions), { scroll: false });
    fetchUsers({
      phrases,
      roles: selectedRoles.map((o) => o.value),
      permissions: selectedPermissions.map((o) => o.value),
    });
  };

  const handleReset = () => {
    setPhrases([]);
    setSelectedRoles([]);
    setSelectedPermissions([]);
    phrasesRef.current = [];
    router.replace('', { scroll: false });
    fetchUsers({});
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await usersApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError('Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const patchUser = async (
    user: UserDetailVM,
    patch: Partial<{ enabled: boolean; accountNonLocked: boolean }>,
    errorMsg: string,
  ) => {
    setActionId(user.id);
    try {
      await usersApi.updateUser(user.id, patch as Parameters<typeof usersApi.updateUser>[1]);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
    } catch {
      setError(errorMsg);
    } finally {
      setActionId(null);
    }
  };

  const baseColumns: ColumnDef<UserDetailVM>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.username ?? '—'}</span>
      ),
    },
    {
      id: 'fullName',
      header: 'Full name',
      cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(' ');
        return <span className="text-sm text-foreground">{name || '—'}</span>;
      },
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground">{row.original.emailId}</span>
          <VerifiedBadge verified={row.original.emailIdVerified} />
        </div>
      ),
    },
    {
      id: 'mobile',
      header: 'Mobile',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{row.original.mobileNo ?? '—'}</span>
          {row.original.mobileNo && <VerifiedBadge verified={row.original.mobileNoVerified} />}
        </div>
      ),
    },
    {
      id: 'enabled',
      header: 'Status',
      cell: ({ row }) => {
        const { enabled, accountNonLocked } = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                enabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {enabled ? 'Active' : 'Inactive'}
            </span>
            {!accountNonLocked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                Locked
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const rolesColumn: ColumnDef<UserDetailVM> = {
    id: 'roles',
    header: 'Roles',
    cell: ({ row }) => (
      <TagList
        tags={(row.original.authorityGroups ?? []).map((g) => ({ id: g.id, label: g.label }))}
        variant="primary"
      />
    ),
  };

  const permissionsColumn: ColumnDef<UserDetailVM> = {
    id: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => (
      <TagList
        tags={(row.original.authorities ?? []).map((a) => ({
          id: a.id,
          label: a.name,
          mono: true,
        }))}
        variant="muted"
      />
    ),
  };

  const actionsColumn: ColumnDef<UserDetailVM> = {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const user = row.original;
      const busy = actionId === user.id;
      return (
        <div className="flex items-center gap-0.5">
          <Tip label="Edit user">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/users/${user.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label={user.enabled ? 'Disable user' : 'Enable user'}>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${user.enabled ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'}`}
              onClick={() =>
                patchUser(
                  user,
                  { enabled: !user.enabled },
                  `Failed to ${user.enabled ? 'disable' : 'enable'} user.`,
                )
              }
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : user.enabled ? (
                <PowerOff className="h-3.5 w-3.5" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
          <Tip label={user.accountNonLocked ? 'Lock account' : 'Unlock account'}>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${!user.accountNonLocked ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10'}`}
              onClick={() =>
                patchUser(
                  user,
                  { accountNonLocked: !user.accountNonLocked },
                  `Failed to ${user.accountNonLocked ? 'lock' : 'unlock'} user.`,
                )
              }
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : user.accountNonLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
          <Tip label="Delete user">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(user.id)}
              disabled={deletingId === user.id}
            >
              {deletingId === user.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
        </div>
      );
    },
  };

  const columns: ColumnDef<UserDetailVM>[] = [
    ...baseColumns,
    ...(showRoles ? [rolesColumn] : []),
    ...(showPermissions ? [permissionsColumn] : []),
    actionsColumn,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage registered users and their accounts"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/users/new')}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add user
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchUsers({
                  phrases: phrasesRef.current.length ? phrasesRef.current : undefined,
                  roles: selectedRoles.map((o) => o.value),
                  permissions: selectedPermissions.map((o) => o.value),
                })
              }
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Phrases */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search phrases</Label>
            <PhrasesInput
              value={phrases}
              onChange={(v) => {
                phrasesRef.current = v;
                setPhrases(v);
              }}
              placeholder="Search users..."
            />
          </div>

          {/* Roles */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Roles</Label>
            <Select<SelectOption, true>
              isMulti
              options={roleOptions}
              value={selectedRoles}
              onChange={(vals: MultiValue<SelectOption>) => {
                setSelectedRoles([...vals]);
                // Clear permissions that no longer belong to selected roles
                const roleIds = new Set(vals.map((v) => v.value));
                setSelectedPermissions((prev) =>
                  prev.filter((p) => {
                    const ownerGroup = allRoles.find((g) =>
                      g.authorities?.some((a) => a.id === p.value),
                    );
                    return ownerGroup && roleIds.has(ownerGroup.id);
                  }),
                );
              }}
              placeholder="All roles"
              styles={reactSelectStyles as never}
            />
          </div>

          {/* Permissions */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Permissions</Label>
            <Select<SelectOption, true>
              isMulti
              options={permissionOptions}
              value={selectedPermissions}
              onChange={(vals: MultiValue<SelectOption>) => setSelectedPermissions([...vals])}
              placeholder="All permissions"
              styles={reactSelectStyles as never}
            />
          </div>

          {/* Column toggles */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Show columns</Label>
            <div className="flex items-center gap-3 h-9 px-2 rounded-md border border-input bg-background">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showRoles}
                  onChange={(e) => setShowRoles(e.target.checked)}
                  className="accent-primary h-3.5 w-3.5"
                />
                Roles
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showPermissions}
                  onChange={(e) => setShowPermissions(e.target.checked)}
                  className="accent-primary h-3.5 w-3.5"
                />
                Permissions
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No users found."
        hideSearch
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete user?"
        description="This will permanently remove the user and all associated data."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
