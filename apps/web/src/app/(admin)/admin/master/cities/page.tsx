'use client';

import { useEffect, useState } from 'react';
import { masterApi, type StateVM, type CityVM, type AreaVM } from '@repo/api';
import { Loader2, Trash2, Pencil, Building2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/components/common/admin/useConfirmDialog';
import { AddCityDialog } from './_components/AddCityDialog';
import { EditCityDialog } from '../states/_components/EditCityDialog';
import { AddAreaDialog } from '../states/_components/AddAreaDialog';
import { EditAreaDialog } from '../states/_components/EditAreaDialog';

const PAGE_SIZE = 16;

export default function CitiesPage() {
  const [states, setStates] = useState<StateVM[]>([]);
  const [cities, setCities] = useState<CityVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [areasMap, setAreasMap] = useState<Record<string, AreaVM[]>>({});
  const [areasLoading, setAreasLoading] = useState<Record<string, boolean>>({});
  const [addAreaTarget, setAddAreaTarget] = useState<CityVM | null>(null);
  const [editCityTarget, setEditCityTarget] = useState<CityVM | null>(null);
  const [editAreaTarget, setEditAreaTarget] = useState<AreaVM | null>(null);

  useEffect(() => {
    masterApi
      .getStates()
      .then(setStates)
      .catch(() => setStates([]));
  }, []);

  const fetchCities = async (page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await masterApi.searchCities({
        searchText: search.trim() || undefined,
        page,
        size: PAGE_SIZE,
      });
      setCities(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load cities.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities(0);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCity = async (cityId: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) next.delete(cityId);
      else next.add(cityId);
      return next;
    });
    if (!areasMap[cityId]) {
      setAreasLoading((prev) => ({ ...prev, [cityId]: true }));
      try {
        const areas = await masterApi.getAreasByCity(cityId);
        setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
      } catch {
        setError('Failed to load areas.');
      } finally {
        setAreasLoading((prev) => ({ ...prev, [cityId]: false }));
      }
    }
  };

  const refreshAreasForCity = async (cityId: string) => {
    try {
      const areas = await masterApi.getAreasByCity(cityId);
      setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
    } catch {
      setError('Failed to refresh areas.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cities"
        description="All cities across every state"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add city"
            addDisabled={!states.length}
            onRefresh={() => fetchCities(pageIndex)}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search cities or states..."
        className="max-w-sm"
      />

      {isLoading ? (
        <LoadingBlock message="Loading cities..." />
      ) : cities.length === 0 ? (
        <EmptyState icon={Building2} message="No cities found." />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {cities.map((city) => {
            const cityExpanded = expandedCities.has(city.id);
            const areas = areasMap[city.id] ?? [];
            const areasLoaded = !!areasMap[city.id];

            return (
              <div key={city.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <button
                    onClick={() => toggleCity(city.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    aria-expanded={cityExpanded}
                  >
                    {areasLoading[city.id] ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : cityExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground text-sm">{city.name}</span>
                    {city.state?.name && (
                      <span className="text-xs text-muted-foreground ml-1">{city.state.name}</span>
                    )}
                    {areasLoaded && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({areas.length} {areas.length === 1 ? 'area' : 'areas'})
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Tip label="Edit city">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setEditCityTarget(city)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                    <Tip label="Add area">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                        onClick={() => setAddAreaTarget(city)}
                      >
                        <Plus className="h-3 w-3" />
                        Area
                      </Button>
                    </Tip>
                    <Tip label="Delete city">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          openConfirm({
                            title: 'Delete city?',
                            description: `"${city.name}" and all its areas will be permanently removed.`,
                            onConfirm: () =>
                              setCities((prev) => prev.filter((c) => c.id !== city.id)),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tip>
                  </div>
                </div>

                {cityExpanded && (
                  <div className="bg-muted/10 border-t border-border px-10 py-3">
                    {areasLoading[city.id] ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading areas...
                      </div>
                    ) : areas.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No areas yet.{' '}
                        <button
                          onClick={() => setAddAreaTarget(city)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          Add one
                        </button>
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {areas.map((area) => (
                          <div
                            key={area.id}
                            className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                          >
                            <span className="text-foreground font-medium">{area.name}</span>
                            <button
                              onClick={() => setEditAreaTarget({ ...area, city })}
                              className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                              aria-label={`Edit ${area.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                openConfirm({
                                  title: 'Delete area?',
                                  description: `"${area.name}" will be permanently removed.`,
                                  onConfirm: () =>
                                    setAreasMap((prev) => ({
                                      ...prev,
                                      [city.id]: (prev[city.id] ?? []).filter(
                                        (a) => a.id !== area.id,
                                      ),
                                    })),
                                })
                              }
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Delete ${area.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {pageIndex * PAGE_SIZE + 1}–{pageIndex * PAGE_SIZE + cities.length} of{' '}
            {totalRecords} results
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCities(pageIndex - 1)}
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
              onClick={() => fetchCities(pageIndex + 1)}
              disabled={pageIndex + 1 >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AddCityDialog
        open={addOpen}
        states={states}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          fetchCities(pageIndex);
        }}
      />

      <EditCityDialog
        city={editCityTarget}
        states={states}
        onClose={() => setEditCityTarget(null)}
        onUpdated={() => fetchCities(pageIndex)}
      />

      <AddAreaDialog
        city={addAreaTarget}
        onClose={() => setAddAreaTarget(null)}
        onCreated={(cityId, areas) => {
          setAreasMap((prev) => ({ ...prev, [cityId]: areas }));
          setExpandedCities((prev) => new Set([...prev, cityId]));
          setAddAreaTarget(null);
        }}
      />

      <EditAreaDialog
        area={editAreaTarget}
        states={states}
        onClose={() => setEditAreaTarget(null)}
        onUpdated={() => {
          if (editAreaTarget?.city?.id) refreshAreasForCity(editAreaTarget.city.id);
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
