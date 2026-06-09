'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { FieldError, SelectOption } from './AuctionShared';
import { PreconditionItem } from './AuctionStep3Types';
import {
  DayHourDropdowns,
  NameDescriptionFields,
  POLICY_DEFAULTS,
  SELECT_CLS,
  SortButtons,
  moveItem,
} from './PolicyShared';

interface Props {
  preconditions: PreconditionItem[];
  onChange: (updated: PreconditionItem[]) => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
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
}: Props) {
  const usedTypes = preconditions.map((p) => p.type).filter(Boolean);

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
  const move = (i: number, dir: -1 | 1) => onChange(moveItem(preconditions, i, dir));
  const update = (i: number, patch: Partial<PreconditionItem>) =>
    onChange(preconditions.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Preconditions</h3>
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

      {preconditions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No preconditions</p>
      ) : (
        <div className="space-y-3">
          {preconditions.map((pc, i) => (
            <div key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SortButtons
                    index={i}
                    total={preconditions.length}
                    onMove={(dir) => move(i, dir)}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Precondition {i + 1}
                    <span className="ml-1 text-muted-foreground/50">· priority {i + 1}</span>
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

              <NameDescriptionFields
                name={pc.name}
                description={pc.description}
                nameId={`pc_name_${i}`}
                descId={`pc_desc_${i}`}
                onNameChange={(v) => update(i, { name: v })}
                onDescriptionChange={(v) => update(i, { description: v })}
              />

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Type <span className="text-destructive">*</span>
                </Label>
                <select
                  value={pc.type}
                  onChange={(e) => {
                    const t = e.target.value;
                    const defaults = POLICY_DEFAULTS[t];
                    update(i, {
                      type: t,
                      count: '',
                      name: pc.name || defaults?.name || '',
                      description: pc.description || defaults?.description || '',
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
                      disabled={usedTypes.includes(opt.value) && opt.value !== pc.type}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors[`precondition_type_${i}`]} />
              </div>

              {pc.type && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Minimum Participants <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={pc.count}
                        onChange={(e) => update(i, { count: e.target.value })}
                        placeholder="e.g. 5"
                        className="h-8 text-sm max-w-[160px]"
                      />
                      <FieldError message={fieldErrors[`precondition_count_${i}`]} />
                    </div>
                  )}
                  <DayHourDropdowns
                    label="Validation Deadline"
                    daysValue={pc.validationDays}
                    hoursValue={pc.validationHours}
                    onDaysChange={(v) => update(i, { validationDays: v })}
                    onHoursChange={(v) => update(i, { validationHours: v })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
