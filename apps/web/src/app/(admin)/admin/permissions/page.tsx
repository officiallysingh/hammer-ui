'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { adminApi, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { CreatePermissionDialog, EditPermissionDialog } from './_components/PermissionFormDialog';

export default function PermissionsPage() {
  const [authorities, setAuthorities] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPerm, setEditPerm] = useState<AuthorityVM | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchAuthorities = async (phrases?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setAuthorities(await adminApi.getAuthorities(phrases));
    } catch {
      setError('Failed to load permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchAuthorities(value.trim() || undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await adminApi.deleteAuthority(id);
      setAuthorities((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete permission.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<AuthorityVM>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.name}</span>
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
          <Tip label="Edit permission">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setEditPerm(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete permission">
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
        title="Permissions"
        description="Manage authorities and access rights across the system"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add permission
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuthorities(search.trim() || undefined)}
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
        data={authorities}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No permissions found."
        searchPlaceholder="Search permissions..."
        onSearch={handleSearch}
        searchValue={search}
      />

      <CreatePermissionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={fetchAuthorities}
      />

      <EditPermissionDialog
        permission={editPerm}
        onClose={() => setEditPerm(null)}
        onUpdated={(updated) => {
          setAuthorities((prev) =>
            prev.map((a) => (a.id === editPerm?.id ? { ...a, ...updated } : a)),
          );
          setEditPerm(null);
        }}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete permission?"
        description="This will permanently remove the permission and revoke it from all roles."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
