'use client';

import { useEffect, useMemo, useState } from 'react';
import { masterApi, StateVM, AreaVM } from '@repo/api';
import { Loader2, Trash2, RefreshCw, Plus, MapPinned } from 'lucide-react';
import { Button } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { AddAreaDialog } from './_components/AddAreaDialog';

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
};

const CLOSED_CONFIRM: ConfirmState = {
  open: false,
  title: '',
  description: '',
  onConfirm: () => {},
};

export default function AreasPage() {
  const [states, setStates] = useState<StateVM[]>([]);
  const [areas, setAreas] = useState<AreaVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stateList = await masterApi.getStates();
      setStates(stateList);
      const perState = await Promise.all(
        stateList.map((s) => masterApi.getCitiesByState(s.id, ['areas', 'state']).catch(() => [])),
      );
      const flat = perState.flatMap((cities) =>
        cities.flatMap((c) => (c.areas ?? []).map((a) => ({ ...a, city: c }))),
      );
      setAreas(flat);
    } catch {
      setError('Failed to load areas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return areas.filter((a) => {
      const matchesQuery = q
        ? a.name.toLowerCase().includes(q) ||
          (a.pinCode ?? '').toLowerCase().includes(q) ||
          (a.city?.name ?? '').toLowerCase().includes(q) ||
          (a.city?.state?.name ?? '').toLowerCase().includes(q)
        : true;
      const matchesState = stateFilter ? a.city?.state?.id === stateFilter : true;
      return matchesQuery && matchesState;
    });
  }, [areas, search, stateFilter]);

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, description, onConfirm });
  const closeConfirm = () => setConfirm((prev) => ({ ...prev, open: false }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Areas"
        description="All areas across every city"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={!states.length}>
              <Plus className="h-4 w-4 mr-1" />
              Add area
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search areas, cities, pin codes..."
          className="max-w-sm"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-xs"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading areas...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <MapPinned className="h-10 w-10 opacity-30" />
          <p className="text-sm">No areas found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((area) => (
            <div
              key={area.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground text-sm">{area.name}</span>
                {area.pinCode && (
                  <span className="text-xs text-muted-foreground ml-2">{area.pinCode}</span>
                )}
                {(area.city?.name || area.city?.state?.name) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {[area.city?.name, area.city?.state?.name].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              <Tip label="Delete area">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    openConfirm(
                      'Delete area?',
                      `"${area.name}" will be permanently removed.`,
                      async () => {
                        setAreas((prev) => prev.filter((a) => a.id !== area.id));
                      },
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            </div>
          ))}
        </div>
      )}

      <AddAreaDialog
        open={addOpen}
        states={states}
        onClose={() => setAddOpen(false)}
        onCreated={(area) => {
          setAreas((prev) => [...prev, area]);
          setAddOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Delete"
        onConfirm={() => {
          confirm.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
