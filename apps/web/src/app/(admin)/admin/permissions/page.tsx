'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';

export default function PermissionsPage() {
  const [authorities, setAuthorities] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

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

  const fetchAuthorities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAuthorities();
      setAuthorities(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await adminApi.deleteAuthority(id);
      setAuthorities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete permission.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!newName.trim() || !newLabel.trim() || !newDescription.trim()) {
      setError('Name, label and description are required.');
      return;
    }
    setIsCreating(true);
    try {
      await adminApi.createAuthority({
        name: newName.trim(),
        label: newLabel.trim(),
        description: newDescription.trim(),
      });
      setNewName('');
      setNewLabel('');
      setNewDescription('');
      setIsCreateOpen(false);
      await fetchAuthorities();
    } catch (err) {
      console.error(err);
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFieldErrors(parsed.fieldErrors);
      } else {
        setError(parsed.general ?? 'Failed to create permission.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Manage authorities and access rights across the system"
        actions={
          <div className="flex gap-2">
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  setFieldErrors({});
                  setError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add permission
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add permission</DialogTitle>
                  <DialogDescription>Create a new authority (permission).</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="new-permission-name"
                      className={fieldErrors.name ? 'text-destructive' : ''}
                    >
                      Name
                    </Label>
                    <Input
                      id="new-permission-name"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        clearFieldError('name');
                      }}
                      placeholder="admin.users.create"
                      autoComplete="off"
                      className={
                        fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                      }
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-destructive">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="new-permission-label"
                      className={fieldErrors.label ? 'text-destructive' : ''}
                    >
                      Label
                    </Label>
                    <Input
                      id="new-permission-label"
                      value={newLabel}
                      onChange={(e) => {
                        setNewLabel(e.target.value);
                        clearFieldError('label');
                      }}
                      placeholder="Create Users"
                      autoComplete="off"
                      className={
                        fieldErrors.label ? 'border-destructive focus-visible:ring-destructive' : ''
                      }
                    />
                    {fieldErrors.label && (
                      <p className="text-xs text-destructive">{fieldErrors.label}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="new-permission-description"
                      className={fieldErrors.description ? 'text-destructive' : ''}
                    >
                      Description
                    </Label>
                    <Input
                      id="new-permission-description"
                      value={newDescription}
                      onChange={(e) => {
                        setNewDescription(e.target.value);
                        clearFieldError('description');
                      }}
                      placeholder="Allows creating users"
                      autoComplete="off"
                      className={
                        fieldErrors.description
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }
                    />
                    {fieldErrors.description && (
                      <p className="text-xs text-destructive">{fieldErrors.description}</p>
                    )}
                  </div>

                  {error && <ErrorAlert message={error} />}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          Saving
                        </>
                      ) : (
                        'Create permission'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={fetchAuthorities} disabled={isLoading}>
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
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete permission?"
        description="This will permanently remove the permission and revoke it from all roles."
        confirmLabel="Delete"
        onConfirm={() => confirmId !== null && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
