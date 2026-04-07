'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { RoleFormDialog, EditRoleDialog } from './_components/RoleFormDialog';

export default function RolesPage() {
  const [groups, setGroups] = useState<AuthorityGroupVM[]>([]);
  const [allPermissions, setAllPermissions] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // expanded: map of groupId -> AuthorityVM[] | 'loading'
  const [expandedPerms, setExpandedPerms] = useState<Record<string, AuthorityVM[] | 'loading'>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<AuthorityGroupVM | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchGroups = async (phrases?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, perms] = await Promise.all([
        adminApi.getAuthorityGroups(false, phrases),
        adminApi.getAuthorities(),
      ]);
      setGroups(data);
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

  const toggleExpand = async (id: string) => {
    if (expandedPerms[id]) {
      // collapse
      setExpandedPerms((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      return;
    }
    setExpandedPerms((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const perms = await adminApi.getAuthoritiesByGroup(id);
      setExpandedPerms((prev) => ({ ...prev, [id]: perms }));
    } catch {
      setExpandedPerms((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  };

  const columns: ColumnDef<AuthorityGroupVM>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const id = row.original.id;
        const state = expandedPerms[id];
        return (
          <button
            onClick={() => toggleExpand(id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {state === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : state ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        );
      },
      size: 40,
    },
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

      {/* Expanded permissions panels */}
      {Object.entries(expandedPerms).map(([groupId, state]) => {
        if (state === 'loading') return null;
        const group = groups.find((g) => g.id === groupId);
        if (!group) return null;
        return (
          <div key={groupId} className="rounded-lg border bg-muted/20 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Permissions for {group.label}
            </h4>
            {state.length === 0 ? (
              <p className="text-xs text-muted-foreground">No permissions assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {state.map((a) => (
                  <span
                    key={a.id}
                    className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

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
