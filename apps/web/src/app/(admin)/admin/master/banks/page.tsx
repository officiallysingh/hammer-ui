'use client';

import { useEffect, useMemo, useState } from 'react';
import { masterApi, BankVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, Pencil, Landmark } from 'lucide-react';
import { Button } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { AddBankDialog, EditBankDialog } from './_components/BankFormDialog';

export default function BanksPage() {
  const [banks, setBanks] = useState<BankVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BankVM | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchBanks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setBanks(await masterApi.getBanks());
    } catch {
      setError('Failed to load banks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.ifscPrefix.toLowerCase().includes(q),
    );
  }, [banks, search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await masterApi.deleteBank(id);
      setBanks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Failed to delete bank.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banks"
        description="Manage bank accounts"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add bank
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBanks} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search banks..."
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading banks...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Landmark className="h-10 w-10 opacity-30" />
          <p className="text-sm">No banks found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((bank) => (
            <div
              key={bank.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground text-sm">{bank.name}</span>
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  {bank.ifscPrefix}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Tip label="Edit bank">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setEditTarget(bank)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Tip>
                <Tip label="Delete bank">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmId(bank.id)}
                    disabled={deletingId === bank.id}
                  >
                    {deletingId === bank.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </Tip>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBankDialog open={addOpen} onOpenChange={setAddOpen} onCreated={fetchBanks} />

      <EditBankDialog
        bank={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={fetchBanks}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete bank?"
        description="This will permanently remove the bank."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
