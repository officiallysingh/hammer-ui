'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, AuthorityGroupVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@repo/ui';

export default function RolesPage() {
  const [groups, setGroups] = useState<AuthorityGroupVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Roles</h1>
          <p className="text-sm text-muted-foreground">Manage authority groups (roles)</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchGroups} disabled={isLoading}>
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
              <th className="px-4 py-3 text-left font-medium w-8"></th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Label</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Permissions</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading roles...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No roles found.
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {group.authorities && group.authorities.length > 0 && (
                        <button
                          onClick={() => toggleExpand(group.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expanded.has(group.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground font-mono text-xs">
                      {group.name}
                    </td>
                    <td className="px-4 py-3 text-foreground">{group.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{group.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {group.authorities?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(group.id)}
                        disabled={deletingId === group.id}
                      >
                        {deletingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {expanded.has(group.id) && group.authorities && group.authorities.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-3 bg-muted/20">
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {group.authorities.map((a) => (
                            <span
                              key={a.id}
                              className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
