'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuthorityGroupVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, ChevronDown, ChevronRight, Plus } from 'lucide-react';
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

export default function RolesPage() {
  const [groups, setGroups] = useState<AuthorityGroupVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const columns: ColumnDef<AuthorityGroupVM>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        if (!row.original.authorities || row.original.authorities.length === 0) return null;
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-body bg-primary/10 text-primary border border-primary/20">
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
          onClick={() => handleDelete(row.original.id)}
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

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAuthorityGroups(true);
      setGroups(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load roles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    setDeletingId(id);
    try {
      await adminApi.deleteAuthorityGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete role.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName.trim() || !newLabel.trim() || !newDescription.trim()) {
      setError('Name, label and description are required.');
      return;
    }
    setIsCreating(true);
    try {
      await adminApi.createAuthorityGroup({
        name: newName.trim(),
        label: newLabel.trim(),
        description: newDescription.trim(),
      });
      setNewName('');
      setNewLabel('');
      setNewDescription('');
      setIsCreateOpen(false);
      await fetchGroups();
    } catch (err) {
      console.error(err);
      setError('Failed to create role.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage authority groups and their assigned permissions"
        actions={
          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add role</DialogTitle>
                  <DialogDescription>Create a new authority group (role).</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="new-role-name">Name</Label>
                    <Input
                      id="new-role-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="admin"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-role-label">Label</Label>
                    <Input
                      id="new-role-label"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Admin"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-role-description">Description</Label>
                    <Input
                      id="new-role-description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Administration"
                      autoComplete="off"
                    />
                  </div>

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
                        'Create role'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

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
        if (!group?.authorities || group.authorities.length === 0) return null;
        return (
          <div key={groupId} className="mt-2 rounded-lg border bg-muted/20 p-4">
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
    </div>
  );
}
