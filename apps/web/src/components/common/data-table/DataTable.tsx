'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableUrlState?: boolean;
  onSearch?: (value: string) => void; // when provided, disables client-side filtering
  searchValue?: string; // controlled search value for server-side mode
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data found.',
  searchPlaceholder = 'Search...',
  pageSize = 10,
  enableUrlState = true,
  onSearch,
  searchValue = '',
}: DataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL or defaults
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (!enableUrlState) return [];
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      try {
        return JSON.parse(sortParam);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(() => {
    if (!enableUrlState || onSearch) return '';
    return searchParams.get('search') || '';
  });

  // local input state for server-side search
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pagination, setPagination] = useState(() => {
    if (!enableUrlState) return { pageIndex: 0, pageSize };
    const page = parseInt(searchParams.get('page') || '1') - 1; // URL is 1-based
    return {
      pageIndex: Math.max(0, page),
      pageSize: parseInt(searchParams.get('pageSize') || pageSize.toString()),
    };
  });

  // Update URL when state changes
  useEffect(() => {
    if (!enableUrlState) return;

    const params = new URLSearchParams();

    // Update pagination
    if (pagination.pageIndex > 0) {
      params.set('page', (pagination.pageIndex + 1).toString());
    }

    if (pagination.pageSize !== pageSize) {
      params.set('pageSize', pagination.pageSize.toString());
    }

    // Update sorting
    if (sorting.length > 0) {
      params.set('sort', JSON.stringify(sorting));
    }

    // Update search
    if (globalFilter) {
      params.set('search', globalFilter);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(newUrl, { scroll: false });
  }, [pagination, sorting, globalFilter, enableUrlState, router, pageSize]);

  // Reset to first page when search changes
  useEffect(() => {
    if (enableUrlState) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [globalFilter, enableUrlState]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: onSearch ? undefined : getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: onSearch ? undefined : setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter: onSearch ? undefined : globalFilter,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        {onSearch ? (
          <SearchInput
            value={searchValue}
            onChange={onSearch}
            placeholder={searchPlaceholder}
            className="flex-1 max-w-sm"
          />
        ) : (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1 hover:text-foreground'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <div className="flex flex-col">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-50" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              Showing{' '}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
