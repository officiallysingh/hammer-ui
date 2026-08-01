'use client';

import { useEffect, useState } from 'react';
import { adminApi, PermissionVM } from '@repo/api';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { RowActions } from '@/components/common/admin/RowActions';
import { CreatePermissionDialog, EditPermissionDialog } from './_components/PermissionFormDialog';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';

export default function PermissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [permissions, setPermissions] = useState<PermissionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPerm, setEditPerm] = useState<PermissionVM | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));

  const fetchPermissions = async (ph?: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      setPermissions(await adminApi.getPermissions(ph?.length ? ph : undefined));
    } catch {
      setError('Failed to load permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions(searchParams.getAll('phrases'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    const params = new URLSearchParams();
    phrases.forEach((p) => params.append('phrases', p));
    router.replace(params.toString() ? `?${params.toString()}` : '', { scroll: false });
    fetchPermissions(phrases.length ? phrases : undefined);
  };

  const handleReset = () => {
    setPhrases([]);
    router.replace('', { scroll: false });
    fetchPermissions([]);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await adminApi.deletePermission(id);
      setPermissions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete permission.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<PermissionVM>[] = [
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
        <RowActions
          editLabel="Edit permission"
          deleteLabel="Delete permission"
          deleting={deletingId === row.original.id}
          onEdit={() => setEditPerm(row.original)}
          onDelete={() => setConfirmId(row.original.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Manage permissions and access rights across the system"
        actions={
          <ListToolbarActions
            onAdd={() => setIsCreateOpen(true)}
            addLabel="Add permission"
            onRefresh={() => fetchPermissions(phrases.length ? phrases : undefined)}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <PhraseSearchBar
        phrases={phrases}
        onPhrasesChange={setPhrases}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="Search permissions..."
      />

      <DataTable
        data={permissions}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No permissions found."
        hideSearch
      />

      <CreatePermissionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => fetchPermissions(phrases.length ? phrases : undefined)}
      />

      <EditPermissionDialog
        permission={editPerm}
        onClose={() => setEditPerm(null)}
        onUpdated={(updated) => {
          setPermissions((prev) =>
            prev.map((a) => (a.id === editPerm?.id ? { ...a, ...updated } : a)),
          );
          setEditPerm(null);
        }}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete permission?"
        description="This will permanently remove the permission. Any roles it's assigned to will lose it."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
