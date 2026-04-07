'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, UserDetailVM } from '@repo/api';
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
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserDetailVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async (phrases?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await usersApi.getUsers(0, 20, phrases || undefined));
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchUsers(value.trim() || undefined);
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

  const columns: ColumnDef<UserDetailVM>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => {
        const { firstName, lastName, emailId } = row.original;
        const name = [firstName, lastName].filter(Boolean).join(' ');
        return (
          <div className="flex flex-col gap-0.5">
            {name && <span className="font-medium text-foreground text-sm">{name}</span>}
            <span className="text-muted-foreground text-xs">{emailId}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'mobileNo',
      header: 'Mobile',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.mobileNo ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { enabled, accountNonLocked } = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                enabled
                  ? 'bg-emerald/10 text-emerald border border-emerald/20'
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
    {
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
                className={`h-8 w-8 p-0 ${user.enabled ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-emerald hover:text-emerald hover:bg-emerald/10'}`}
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
                className={`h-8 w-8 p-0 ${!user.accountNonLocked ? 'text-emerald hover:text-emerald hover:bg-emerald/10' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10'}`}
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
    },
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
              onClick={() => fetchUsers(search.trim() || undefined)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <DataTable
        data={users}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No users found."
        searchPlaceholder="Search users..."
        onSearch={handleSearch}
        searchValue={search}
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
