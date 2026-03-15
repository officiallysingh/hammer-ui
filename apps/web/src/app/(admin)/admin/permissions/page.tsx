'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuthorityVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@repo/ui';

export default function PermissionsPage() {
  const [authorities, setAuthorities] = useState<AuthorityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    if (!confirm('Are you sure you want to delete this permission?')) return;
    setDeletingId(id);
    try {
      await adminApi.deleteAuthority(id);
      setAuthorities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete permission.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage authorities (permissions)</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAuthorities} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Label</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading permissions...
                </td>
              </tr>
            ) : authorities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No permissions found.
                </td>
              </tr>
            ) : (
              authorities.map((auth) => (
                <tr key={auth.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{auth.name}</td>
                  <td className="px-4 py-3 text-foreground">{auth.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{auth.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(auth.id)}
                      disabled={deletingId === auth.id}
                    >
                      {deletingId === auth.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
