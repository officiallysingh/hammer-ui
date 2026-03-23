'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuthorityGroupVM, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { RoleFormDialog } from './_components/RoleFormDialog';

export default function RolesPage() {
  const [groups, setGroups] = useState<AuthorityGroupVM[]>([]);
  const [allPermissions, setAllPermissions] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, perms] = await Promise.all([
        adminApi.getAuthorityGroups(true),
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

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: ColumnDef<AuthorityGroupVM>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        if (!row.original.authorities?.length) return null;
        return (
          <button
            onClick={() => toggleExpand(row.original.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded.has(row.original.id) ? (
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
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {row.original.authorities?.length ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmId(row.original.id)}
          disabled={deletingId === row.original.id}
        >
          {deletingId === row.original.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
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
            <Button variant="outline" size="sm" onClick={fetchGroups} disabled={isLoading}>
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
      />

      {/* Expanded permissions */}
      {Array.from(expanded).map((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.authorities?.length) return null;
        return (
          <div key={groupId} className="rounded-lg border bg-muted/20 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Permissions for {group.label}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {group.authorities.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
                >
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <RoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        allPermissions={allPermissions}
        onCreated={fetchGroups}
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
