'use client';

import { useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { FieldError, SelectField } from './AuctionShared';
import { PaymentPolicyItem, PolicyHeadItem } from './AuctionStep3Types';
import {
  DayHourDropdowns,
  NameDescriptionFields,
  PAYMENT_HEAD_BASIS_OPTIONS,
  PAYMENT_HEAD_TYPE_OPTIONS,
  PAYMENT_SCHEDULE_REFERENCE_OPTIONS,
  PolicyInfoButton,
  SortButtons,
  moveItem,
} from './PolicyShared';

interface Props {
  policies: PaymentPolicyItem[];
  onChange: (updated: PaymentPolicyItem[]) => void;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  groupDescription?: string;
}

const EMPTY_HEAD: PolicyHeadItem = {
  name: '',
  description: '',
  type: '',
  basis: '',
  value: '',
  refundable: false,
};

const EMPTY_POLICY: PaymentPolicyItem = {
  name: '',
  description: '',
  scheduleReference: 'AUCTION_START_TIME',
  offsetDays: '',
  offsetHours: '0',
  heads: [{ ...EMPTY_HEAD }],
};

export function PolicyPaymentSection({
  policies,
  onChange,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  groupDescription,
}: Props) {
  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const add = () => onChange([...policies, { ...EMPTY_POLICY, heads: [{ ...EMPTY_HEAD }] }]);
  const remove = (i: number) => onChange(policies.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => onChange(moveItem(policies, i, dir));
  const update = (i: number, patch: Partial<PaymentPolicyItem>) =>
    onChange(policies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const addHead = (i: number) => update(i, { heads: [...policies[i]!.heads, { ...EMPTY_HEAD }] });
  const removeHead = (i: number, j: number) =>
    update(i, { heads: policies[i]!.heads.filter((_, idx) => idx !== j) });
  const updateHead = (i: number, j: number, patch: Partial<PolicyHeadItem>) =>
    update(i, {
      heads: policies[i]!.heads.map((h, idx) => (idx === j ? { ...h, ...patch } : h)),
    });

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {' '}
            Pre Payment / Participation Eligibility Policy
          </h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {policies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment policies defined.</p>
      ) : (
        <div className="space-y-3">
          {policies.map((pp, i) => (
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
                  <span className="text-xs font-medium text-muted-foreground">Policy {i + 1}</span>
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
                name={pp.name}
                description={pp.description}
                nameId={`payment_name_${i}`}
                descId={`payment_desc_${i}`}
                onNameChange={(v) => update(i, { name: v })}
                onDescriptionChange={(v) => update(i, { description: v })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Due Relative To</Label>
                  <select
                    value={pp.scheduleReference}
                    onChange={(e) => update(i, { scheduleReference: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PAYMENT_SCHEDULE_REFERENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <DayHourDropdowns
                  label="Offset"
                  daysValue={pp.offsetDays}
                  hoursValue={pp.offsetHours}
                  onDaysChange={(v) => update(i, { offsetDays: v })}
                  onHoursChange={(v) => update(i, { offsetHours: v })}
                />
              </div>

              {/* Fee heads */}
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Fee Heads</span>
                  <button
                    type="button"
                    onClick={() => addHead(i)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add head
                  </button>
                </div>
                <FieldError message={fieldErrors[`payment_heads_${i}`]} />

                <div className="space-y-3">
                  {pp.heads.map((head, j) => {
                    const isPercentage = head.basis.startsWith('PERCENTAGE');
                    const pct =
                      isPercentage && head.value
                        ? (openingPrice * parseFloat(head.value)) / 100
                        : null;
                    return (
                      <div
                        key={j}
                        className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Head {j + 1}
                          </span>
                          {pp.heads.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeHead(i, j)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <NameDescriptionFields
                          name={head.name}
                          description={head.description}
                          nameId={`payment_head_name_${i}_${j}`}
                          descId={`payment_head_desc_${i}_${j}`}
                          onNameChange={(v) => updateHead(i, j, { name: v })}
                          onDescriptionChange={(v) => updateHead(i, j, { description: v })}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <SelectField
                            id={`payment_head_type_${i}_${j}`}
                            label="Type"
                            required
                            value={head.type}
                            options={PAYMENT_HEAD_TYPE_OPTIONS}
                            onChange={(v) => updateHead(i, j, { type: v })}
                            error={fieldErrors[`payment_head_type_${i}_${j}`]}
                            placeholder="Select type..."
                          />
                          <SelectField
                            id={`payment_head_basis_${i}_${j}`}
                            label="Basis"
                            required
                            value={head.basis}
                            options={PAYMENT_HEAD_BASIS_OPTIONS}
                            onChange={(v) => updateHead(i, j, { basis: v, value: '' })}
                            error={fieldErrors[`payment_head_basis_${i}_${j}`]}
                            placeholder="Select basis..."
                          />
                        </div>

                        {head.basis && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor={`payment_head_value_${i}_${j}`}
                                className="text-xs font-medium"
                              >
                                {isPercentage ? 'Percentage' : 'Amount'}{' '}
                                <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative flex items-center">
                                <Input
                                  id={`payment_head_value_${i}_${j}`}
                                  type="number"
                                  min={0}
                                  max={isPercentage ? 100 : undefined}
                                  step="0.01"
                                  value={head.value}
                                  onChange={(e) => updateHead(i, j, { value: e.target.value })}
                                  placeholder="0.00"
                                  className={isPercentage ? 'pr-8' : ''}
                                />
                                {isPercentage && (
                                  <span className="absolute right-3 text-sm text-muted-foreground">
                                    %
                                  </span>
                                )}
                              </div>
                              {isPercentage && pct !== null && (
                                <p className="text-xs text-muted-foreground">
                                  ≈ {currencyUnit} {pct.toFixed(precision)}
                                </p>
                              )}
                              <FieldError message={fieldErrors[`payment_head_value_${i}_${j}`]} />
                            </div>
                            <div className="flex items-end pb-1.5">
                              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={head.refundable}
                                  onChange={(e) =>
                                    updateHead(i, j, { refundable: e.target.checked })
                                  }
                                  className="h-4 w-4 rounded border-input"
                                />
                                Refundable
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
