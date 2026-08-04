'use client';

import { useEffect, useState } from 'react';
import { masterApi, type StateVM, type AreaVM } from '@repo/api';
import { MapPinned } from 'lucide-react';
import { Button } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { RowActions } from '@/components/common/admin/RowActions';
import { useConfirmDialog } from '@/components/common/admin/useConfirmDialog';
import { AddAreaDialog } from './_components/AddAreaDialog';
import { EditAreaDialog } from '../states/_components/EditAreaDialog';

const PAGE_SIZE = 16;

export default function AreasPage() {
  const [states, setStates] = useState<StateVM[]>([]);
  const [areas, setAreas] = useState<AreaVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AreaVM | null>(null);
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  useEffect(() => {
    masterApi
      .getStates()
      .then(setStates)
      .catch(() => setStates([]));
  }, []);

  const fetchAreas = async (page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await masterApi.searchAreas({
        searchText: search.trim() || undefined,
        page,
        size: PAGE_SIZE,
      });
      setAreas(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load areas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas(0);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <PageHeader
        title="Areas"
        description="All areas across every city"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add area"
            addDisabled={!states.length}
            onRefresh={() => fetchAreas(pageIndex)}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search areas, cities, pin codes..."
        className="max-w-sm"
      />

      {isLoading ? (
        <LoadingBlock message="Loading areas..." />
      ) : areas.length === 0 ? (
        <EmptyState icon={MapPinned} message="No areas found." />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {areas.map((area) => (
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
                {(area.city?.name ?? area.city?.state?.name) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {[area.city?.name, area.city?.state?.name].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              <RowActions
                size="sm"
                editLabel="Edit area"
                deleteLabel="Delete area"
                onEdit={() => setEditTarget(area)}
                onDelete={() =>
                  openConfirm({
                    title: 'Delete area?',
                    description: `"${area.name}" will be permanently removed.`,
                    onConfirm: () => setAreas((prev) => prev.filter((a) => a.id !== area.id)),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {pageIndex * PAGE_SIZE + 1}–{pageIndex * PAGE_SIZE + areas.length} of{' '}
            {totalRecords} results
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAreas(pageIndex - 1)}
              disabled={pageIndex === 0 || isLoading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAreas(pageIndex + 1)}
              disabled={pageIndex + 1 >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AddAreaDialog
        open={addOpen}
        states={states}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          fetchAreas(pageIndex);
        }}
      />

      <EditAreaDialog
        area={editTarget}
        states={states}
        onClose={() => setEditTarget(null)}
        onUpdated={() => fetchAreas(pageIndex)}
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
