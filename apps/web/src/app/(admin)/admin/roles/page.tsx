'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { RoleFormDialog, EditRoleDialog } from './_components/RoleFormDialog';

// Extend AuthorityGroupVM locally to cache fetched permissions
type RoleRow = AuthorityGroupVM & { _perms?: AuthorityVM[] };

export default function RolesPage() {
  const [groups, setGroups] = useState<RoleRow[]>([]);
  const [allPermissions, setAllPermissions] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<AuthorityGroupVM | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchGroups = async (phrases?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, perms] = await Promise.all([
        adminApi.getAuthorityGroups(true, phrases), // x-expand: true → authorities included
        adminApi.getAuthorities(),
      ]);
      // Map authorities from the expanded response directly
      setGroups(data.map((g) => ({ ...g, _perms: g.authorities ?? [] })));
      setAllPermissions(perms);
    } catch {
      setError('Failed to load roles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchGroups(value.trim() || undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await adminApi.deleteAuthorityGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch {
      setError('Failed to delete role.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-foreground font-mono text-xs">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ row }) => <span className="text-foreground">{row.original.label}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description ?? '—'}</span>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <TagList
          tags={(row.original._perms ?? []).map((p) => ({ id: p.id, label: p.name, mono: true }))}
          variant="muted"
          max={2}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="Edit role">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setEditRole(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete role">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(row.original.id)}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage authority groups and their assigned permissions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add role
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchGroups(search.trim() || undefined)}
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
        data={groups}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No roles found."
        searchPlaceholder="Search roles..."
        onSearch={handleSearch}
        searchValue={search}
      />

      <RoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        allPermissions={allPermissions}
        onCreated={() => fetchGroups(search.trim() || undefined)}
      />

      <EditRoleDialog
        role={editRole}
        allPermissions={allPermissions}
        onClose={() => setEditRole(null)}
        onUpdated={() => fetchGroups(search.trim() || undefined)}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete role?"
        description="This will permanently remove the role and unassign it from all users."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
