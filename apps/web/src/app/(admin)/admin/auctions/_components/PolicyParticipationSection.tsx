'use client';

import { useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { ParticipationEligibilityItem } from './AuctionStep3Types';
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
  policies: ParticipationEligibilityItem[];
  onChange: (updated: ParticipationEligibilityItem[]) => void;
  options: SelectOption[];
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  groupDescription?: string;
}

const EMPTY_ITEM: ParticipationEligibilityItem = {
  name: '',
  description: '',
  type: '',
  basis: '',
  value: '',
  deadlineDays: '',
  deadlineHours: '0',
};

export function PolicyParticipationSection({
  policies,
  onChange,
  options,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  groupDescription,
}: Props) {
  const usedTypes = policies.map((p) => p.type).filter(Boolean);
  const hasAnyOneParticipates = policies.some((p) => p.type === '');

  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const add = () => {
    const availableType = options.find((opt) => !usedTypes.includes(opt.value));
    const defaults = availableType ? POLICY_DEFAULTS[availableType.value] : undefined;
    onChange([
      ...policies,
      {
        ...EMPTY_ITEM,
        type: availableType?.value ?? '',
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
      },
    ]);
  };
  const remove = (i: number) => onChange(policies.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => onChange(moveItem(policies, i, dir));
  const update = (i: number, patch: Partial<ParticipationEligibilityItem>) =>
    onChange(policies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Participation Eligibility Policy
          </h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        {!hasAnyOneParticipates && usedTypes.length < options.length && (
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

      {policies.length === 0 ? (
        <p className="text-sm text-muted-foreground">Any one can participate (no restrictions)</p>
      ) : (
        <div className="space-y-3">
          {policies.map((pp, i) => {
            const isLast = i === policies.length - 1;
            const isAnyOne = pp.type === '';
            const pct =
              pp.basis === 'PERCENTAGE' && pp.value
                ? (openingPrice * parseFloat(pp.value)) / 100
                : null;
            return (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  if (!dragHandleActiveRef.current) {
                    e.preventDefault();
                    return;
                  }
                  dragIndexRef.current = i;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIdx(i);
                }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current;
                  if (from !== null && from !== i) {
                    const updated = [...policies];
                    const [moved] = updated.splice(from, 1);
                    updated.splice(i, 0, moved!);
                    onChange(updated);
                  }
                  dragIndexRef.current = null;
                  setDragOverIdx(null);
                }}
                onDragEnd={() => {
                  dragHandleActiveRef.current = false;
                  dragIndexRef.current = null;
                  setDragOverIdx(null);
                }}
                className={`rounded-lg border bg-muted/20 p-3 space-y-3 ${dragOverIdx === i ? 'border-primary shadow-sm' : 'border-border/70'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {policies.length > 1 && (
                      <>
                        <GripVertical
                          className="h-4 w-4 text-muted-foreground cursor-grab shrink-0"
                          onPointerDown={() => {
                            dragHandleActiveRef.current = true;
                          }}
                        />
                        <SortButtons
                          index={i}
                          total={policies.length}
                          onMove={(dir) => move(i, dir)}
                        />
                      </>
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                      Policy {i + 1}
                    </span>
                  </div>
                  {!isAnyOne && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Type select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Type {!isAnyOne && <span className="text-destructive">*</span>}
                  </Label>
                  <select
                    value={pp.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      const defaults = POLICY_DEFAULTS[t];
                      update(i, {
                        type: t,
                        basis: '',
                        value: '',
                        name: pp.name || defaults?.name || '',
                        description: pp.description || defaults?.description || '',
                      });
                    }}
                    className={SELECT_CLS}
                  >
                    {i === 0 && <option value="">Any one can participate</option>}
                    {options
                      .filter((opt) => !usedTypes.includes(opt.value) || opt.value === pp.type)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  <FieldError message={fieldErrors[`participation_type_${i}`]} />
                </div>

                {/* Name / description — only when a real type is chosen */}
                {pp.type && (
                  <NameDescriptionFields
                    name={pp.name}
                    description={pp.description}
                    nameId={`p_name_${i}`}
                    descId={`p_desc_${i}`}
                    onNameChange={(v) => update(i, { name: v })}
                    onDescriptionChange={(v) => update(i, { description: v })}
                  />
                )}

                {pp.type && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SelectField
                      id={`participation_basis_${i}`}
                      label="Basis"
                      required
                      value={pp.basis}
                      options={[
                        { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
                        { value: 'PERCENTAGE', label: 'Percentage of Opening Price' },
                      ]}
                      onChange={(v) =>
                        update(i, { basis: v as 'FIXED_AMOUNT' | 'PERCENTAGE', value: '' })
                      }
                      error={fieldErrors[`participation_basis_${i}`]}
                      placeholder="Select basis..."
                    />
                  </div>
                )}

                {pp.basis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`p_value_${i}`} className="text-xs font-medium">
                        {pp.basis === 'PERCENTAGE' ? 'Percentage' : 'Amount'}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative flex items-center">
                        <Input
                          id={`p_value_${i}`}
                          type="number"
                          min={0}
                          max={pp.basis === 'PERCENTAGE' ? 100 : undefined}
                          step="0.01"
                          value={pp.value}
                          onChange={(e) => update(i, { value: e.target.value })}
                          placeholder="0.00"
                          className={pp.basis === 'PERCENTAGE' ? 'pr-8' : ''}
                        />
                        {pp.basis === 'PERCENTAGE' && (
                          <span className="absolute right-3 text-sm text-muted-foreground">%</span>
                        )}
                      </div>
                      {pp.basis === 'PERCENTAGE' && pct !== null && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {currencyUnit} {pct.toFixed(precision)}
                        </p>
                      )}
                      <FieldError message={fieldErrors[`participation_value_${i}`]} />
                    </div>

                    {isLast ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Deadline before auction starts
                        </Label>
                        <p className="text-xs text-muted-foreground py-[7px]">
                          No deadline — applies until auction start
                        </p>
                      </div>
                    ) : (
                      <DayHourDropdowns
                        label="Deadline before auction starts"
                        daysValue={pp.deadlineDays}
                        hoursValue={pp.deadlineHours}
                        onDaysChange={(v) => update(i, { deadlineDays: v })}
                        onHoursChange={(v) => update(i, { deadlineHours: v })}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
