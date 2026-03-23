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
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { CreateUserDialog, EditUserDialog } from './_components/UserFormDialog';

export default function UsersPage() {
  const [users, setUsers] = useState<UserDetailVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDetailVM | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await usersApi.getUsers());
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      await usersApi.updateUser(user.id, { emailId: user.emailId, ...patch });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
    } catch {
      setError(errorMsg);
    } finally {
      setActionId(null);
    }
  };

  const columns: ColumnDef<UserDetailVM>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-medium text-foreground font-mono text-xs">
          {row.original.username ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'emailId',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.emailId}</span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(' ');
        return <span className="text-foreground">{name || '—'}</span>;
      },
    },
    {
      accessorKey: 'mobileNo',
      header: 'Mobile',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.mobileNo ?? '—'}</span>
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setEditUser(user)}
              title="Edit user"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
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
              title={user.enabled ? 'Disable user' : 'Enable user'}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : user.enabled ? (
                <PowerOff className="h-3.5 w-3.5" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </Button>
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
              title={user.accountNonLocked ? 'Lock account' : 'Unlock account'}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : user.accountNonLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(user.id)}
              disabled={deletingId === user.id}
              title="Delete user"
            >
              {deletingId === user.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
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
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add user
            </Button>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading}>
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
      />

      <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={fetchUsers} />

      <EditUserDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === editUser?.id ? { ...u, ...updated } : u)));
          setEditUser(null);
        }}
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
