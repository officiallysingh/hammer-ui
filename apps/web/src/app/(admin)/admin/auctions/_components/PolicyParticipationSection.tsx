'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { Input } from '@repo/ui';
import { metadataApi, ManagedTypeListItemFull, PolicyEvaluationMap } from '@repo/api';
import { PolicyInfoButton } from './PolicyShared';
import { EvaluationList } from './PolicyEvaluationDisplay';

interface Props {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  typeId: string;
  onTypeIdChange: (typeId: string) => void;
  manualApproval: boolean;
  onManualApprovalToggle: (manualApproval: boolean) => void;
  groupDescription?: string;
  evaluations?: PolicyEvaluationMap;
}

export function PolicyParticipationSection({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  typeId,
  onTypeIdChange,
  manualApproval,
  onManualApprovalToggle,
  groupDescription,
  evaluations,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ManagedTypeListItemFull[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const items = await metadataApi.searchManagedTypeListItems({
          phrases: q.trim() ? [q.trim()] : [],
          type: 'CUSTOM_FORM',
        });
        setResults(items);
      } catch {
        // silently ignore search errors
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Resolve the selected template's name when a typeId is already set (e.g. loaded from a saved policy)
  useEffect(() => {
    if (!typeId) {
      setSelectedName('');
      return;
    }
    const match = results.find((r) => r.id === typeId);
    if (match) {
      setSelectedName(match.name);
      return;
    }
    metadataApi
      .getManagedTypeById(typeId)
      .then((t) => setSelectedName(t.name ?? ''))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    search(q);
  };

  const handleFocus = () => {
    setOpen(true);
    if (!results.length) search(query);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Participation</h3>
        {groupDescription && <PolicyInfoButton description={groupDescription} />}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Auction Participation Policy"
              className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description"
              rows={1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={manualApproval}
            onChange={(e) => onManualApprovalToggle(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Approve/Reject Manually after reviewing participants details
        </label>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">
            Ask participants for additional details
          </h4>

          <div ref={containerRef} className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={handleFocus}
                placeholder="Search form template by name..."
                className="pl-8 text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
              )}
            </div>

            {open && (
              <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {searching && !results.length ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    No managed types found
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                    {results.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onTypeIdChange(t.id);
                          setSelectedName(t.name);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          typeId === t.id ? 'bg-primary/10' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{t.name}</span>
                          {typeId === t.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {t.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {typeId && selectedName && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="text-foreground font-medium">{selectedName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {evaluations && <EvaluationList evaluations={evaluations} />}
    </div>
  );
}
