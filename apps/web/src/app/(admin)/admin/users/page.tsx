'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, UserDetailVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, UserPlus } from 'lucide-react';
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserDetailVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newMobile, setNewMobile] = useState('');

  const columns: ColumnDef<UserDetailVM>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.username}</span>
      ),
    },
    {
      accessorKey: 'emailId',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.emailId ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'mobileNo',
      header: 'Mobile',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.mobileNo ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-body ${
            row.original.enabled
              ? 'bg-emerald/10 text-emerald border border-emerald/20'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {row.original.enabled ? 'Active' : 'Inactive'}
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

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers();
      // API returns paginated or plain array
      const list = Array.isArray(data) ? data : (data?.content ?? data?.data ?? []);
      setUsers(list);
    } catch (err) {
      console.error(err);
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setDeletingId(id);
    try {
      await usersApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUsername.trim() || !newEmail.trim() || !newFirstName.trim() || !newLastName.trim()) {
      setError('Username, email, first name and last name are required.');
      return;
    }
    setIsCreating(true);
    try {
      await usersApi.createUser({
        username: newUsername.trim(),
        emailId: newEmail.trim(),
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        mobileNo: newMobile.trim() || undefined,
      });
      setNewUsername('');
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewMobile('');
      setIsCreateOpen(false);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Failed to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage registered users and their accounts"
        actions={
          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add user
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add user</DialogTitle>
                  <DialogDescription>Create a new user in the system.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="rajveer.singh"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="abc@xyz.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-first-name">First name</Label>
                      <Input
                        id="new-first-name"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        placeholder="Rajveer"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-last-name">Last name</Label>
                      <Input
                        id="new-last-name"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        placeholder="Singh"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-mobile">Mobile (optional)</Label>
                    <Input
                      id="new-mobile"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      placeholder="7082690057"
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
                        'Create user'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

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
    </div>
  );
}
