'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Search } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  error,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.filter((o) => value.includes(o.value));
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (val: string) => {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={`min-h-9 w-full rounded-md border px-3 py-1.5 flex items-center gap-1.5 flex-wrap cursor-pointer transition-colors bg-background ${
          open
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-destructive'
              : 'border-input hover:border-primary/50'
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground flex-1">{placeholder}</span>
        ) : (
          <>
            {selected.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs font-medium rounded-full px-2 py-0.5"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => remove(opt.value, e)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 rounded border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${checked ? 'bg-primary/5' : ''}`}
                  >
                    <span
                      className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border'}`}
                    >
                      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-foreground truncate">
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="block font-mono text-xs text-muted-foreground truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {/* Footer count */}
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{value.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-destructive hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
