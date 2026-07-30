'use client';

import { useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import type { PolicyEvaluationMap } from '@repo/api';
import { FieldError, SelectOption } from './AuctionShared';
import { PreconditionItem } from './AuctionStep3Types';
import { EvaluationList } from './PolicyEvaluationDisplay';
import {
  DayHourDropdowns,
  NameDescriptionFields,
  POLICY_DEFAULTS,
  PolicyInfoButton,
  SELECT_CLS,
  SortButtons,
  moveItem,
} from './PolicyShared';

interface Props {
  preconditions: PreconditionItem[];
  onChange: (updated: PreconditionItem[]) => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
  groupDescription?: string;
  evaluationsByIndex?: Record<number, PolicyEvaluationMap>;
}

/** Fields for a single precondition (name/description, type, validation window).
 *  Shared by the list section below and by the single-policy edit view on the
 *  auction edit-policies page. */
export function PreconditionFields({
  index,
  precondition,
  onChange,
  options,
  usedTypes,
  fieldErrors,
}: {
  /** The item's index in the full `preconditions` array — used to key field errors
   *  consistently with `validatePolicies` (e.g. `precondition_type_${index}`). */
  index: number;
  precondition: PreconditionItem;
  onChange: (patch: Partial<PreconditionItem>) => void;
  options: SelectOption[];
  usedTypes: string[];
  fieldErrors: Record<string, string>;
}) {
  return (
    <>
      <NameDescriptionFields
        name={precondition.name}
        description={precondition.description}
        nameId={`precondition_name_${index}`}
        descId={`precondition_desc_${index}`}
        onNameChange={(v) => onChange({ name: v })}
        onDescriptionChange={(v) => onChange({ description: v })}
        nameError={fieldErrors[`precondition_name_${index}`]}
      />

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Type <span className="text-destructive">*</span>
        </Label>
        <select
          value={precondition.type}
          onChange={(e) => {
            const t = e.target.value;
            const defaults = POLICY_DEFAULTS[t];
            onChange({
              type: t,
              count: '',
              name: precondition.name || defaults?.name || '',
              description: precondition.description || defaults?.description || '',
            });
          }}
          className={SELECT_CLS}
        >
          <option value="" disabled>
            No preconditions
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={usedTypes.includes(opt.value) && opt.value !== precondition.type}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors[`precondition_type_${index}`]} />
      </div>

      {precondition.type && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {precondition.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Minimum Participants <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                required
                value={precondition.count}
                onChange={(e) => onChange({ count: e.target.value })}
                placeholder="e.g. 5"
                className="h-8 text-sm max-w-[160px]"
              />
              <FieldError message={fieldErrors[`precondition_count_${index}`]} />
            </div>
          )}
          <DayHourDropdowns
            label="Check fulfillment before auction starts"
            daysValue={precondition.validationDays}
            hoursValue={precondition.validationHours}
            onDaysChange={(v) => onChange({ validationDays: v })}
            onHoursChange={(v) => onChange({ validationHours: v })}
          />
        </div>
      )}
    </>
  );
}

const EMPTY_ITEM: PreconditionItem = {
  name: '',
  description: '',
  type: '',
  count: '',
  validationDays: '',
  validationHours: '0',
};

export function PolicyPreconditionsSection({
  preconditions,
  onChange,
  options,
  fieldErrors,
  groupDescription,
  evaluationsByIndex,
}: Props) {
  const usedTypes = preconditions.map((p) => p.type).filter(Boolean);

  // Preconditions that were already saved (have an id) are shown elsewhere as
  // read-only evaluate cards with their own edit/delete actions — this list only
  // ever renders drafts (not yet saved).
  const visible = preconditions.map((p, i) => ({ p, i })).filter(({ p }) => !p.id);

  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const add = () => {
    const availableType = options.find((opt) => !usedTypes.includes(opt.value));
    const defaults = availableType ? POLICY_DEFAULTS[availableType.value] : undefined;
    onChange([
      ...preconditions,
      {
        ...EMPTY_ITEM,
        type: availableType?.value ?? '',
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
      },
    ]);
  };
  const remove = (i: number) => onChange(preconditions.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<PreconditionItem>) =>
    onChange(preconditions.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const reorderVisible = (reorderFn: (subset: PreconditionItem[]) => PreconditionItem[]) => {
    const indices = visible.map((v) => v.i);
    const subset = visible.map((v) => v.p);
    const reordered = reorderFn(subset);
    const updated = [...preconditions];
    indices.forEach((origIdx, k) => {
      updated[origIdx] = reordered[k]!;
    });
    onChange(updated);
  };

  const move = (i: number, dir: -1 | 1) => {
    const localIdx = visible.findIndex((v) => v.i === i);
    reorderVisible((subset) => moveItem(subset, localIdx, dir));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Preconditions</h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        {usedTypes.length < options.length && (
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No preconditions</p>
      ) : (
        <div className="space-y-3">
          {visible.map(({ p: pc, i }, localIdx) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                if (!dragHandleActiveRef.current) {
                  e.preventDefault();
                  return;
                }
                dragIndexRef.current = localIdx;
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdx(localIdx);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndexRef.current;
                if (from !== null && from !== localIdx) {
                  reorderVisible((subset) => {
                    const updated = [...subset];
                    const [moved] = updated.splice(from, 1);
                    updated.splice(localIdx, 0, moved!);
                    return updated;
                  });
                }
                dragIndexRef.current = null;
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                dragHandleActiveRef.current = false;
                dragIndexRef.current = null;
                setDragOverIdx(null);
              }}
              className={`rounded-lg border bg-muted/20 p-3 space-y-3 ${dragOverIdx === localIdx ? 'border-primary shadow-sm' : 'border-border/70'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {visible.length > 1 && (
                    <>
                      <GripVertical
                        className="h-4 w-4 text-muted-foreground cursor-grab shrink-0"
                        onPointerDown={() => {
                          dragHandleActiveRef.current = true;
                        }}
                      />
                      <SortButtons
                        index={localIdx}
                        total={visible.length}
                        onMove={(dir) => move(i, dir)}
                      />
                    </>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    Precondition {localIdx + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <PreconditionFields
                index={i}
                precondition={pc}
                onChange={(patch) => update(i, patch)}
                options={options}
                usedTypes={usedTypes}
                fieldErrors={fieldErrors}
              />

              {evaluationsByIndex?.[i] && <EvaluationList evaluations={evaluationsByIndex[i]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
