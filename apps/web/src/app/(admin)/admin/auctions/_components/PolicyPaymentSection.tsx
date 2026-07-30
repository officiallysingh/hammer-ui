'use client';

import { useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import type { PolicyEvaluationMap } from '@repo/api';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { PaymentPolicyItem, PolicyHeadItem } from './AuctionStep3Types';
import { EvaluationList } from './PolicyEvaluationDisplay';
import {
  DayHourDropdowns,
  NameDescriptionFields,
  PAYMENT_HEAD_BASIS_OPTIONS_PRE,
  PAYMENT_HEAD_BASIS_OPTIONS_POST,
  PAYMENT_POLICY_NAME_DEFAULTS,
  PAYMENT_HEAD_DEFAULT,
  PAYMENT_HEAD_DEFAULT_POST,
  PolicyInfoButton,
  SortButtons,
  moveItem,
} from './PolicyShared';

type ScheduleReference = 'AUCTION_START_TIME' | 'AUCTION_END_TIME';

/** Fields for a single payment policy (name/description, due date, mode, fee heads).
 *  Shared by the list section below and by the single-policy edit view on the
 *  auction edit-policies page. */
export function PaymentPolicyFields({
  index,
  policy,
  onChange,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  fixedScheduleReference,
  modeOptions,
}: {
  /** The item's index in the full `policies` array — used to key field ids/errors
   *  consistently with `validatePolicies` (e.g. `payment_heads_${index}`). */
  index: number;
  policy: PaymentPolicyItem;
  onChange: (patch: Partial<PaymentPolicyItem>) => void;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  fixedScheduleReference: ScheduleReference;
  modeOptions: SelectOption[];
}) {
  const basisOptions =
    fixedScheduleReference === 'AUCTION_END_TIME'
      ? PAYMENT_HEAD_BASIS_OPTIONS_POST
      : PAYMENT_HEAD_BASIS_OPTIONS_PRE;

  const addHead = () =>
    onChange({ heads: [...policy.heads, makeEmptyHead(fixedScheduleReference)] });
  const removeHead = (j: number) => onChange({ heads: policy.heads.filter((_, idx) => idx !== j) });
  const updateHead = (j: number, patch: Partial<PolicyHeadItem>) =>
    onChange({ heads: policy.heads.map((h, idx) => (idx === j ? { ...h, ...patch } : h)) });

  return (
    <div className="space-y-3">
      <NameDescriptionFields
        name={policy.name}
        description={policy.description}
        nameId={`payment_name_${index}`}
        descId={`payment_desc_${index}`}
        onNameChange={(v) => onChange({ name: v })}
        onDescriptionChange={(v) => onChange({ description: v })}
        nameError={fieldErrors[`payment_name_${index}`]}
      />

      <DayHourDropdowns
        label={fixedScheduleReference === 'AUCTION_END_TIME' ? 'Pay within' : 'Pay before'}
        suffix={
          fixedScheduleReference === 'AUCTION_END_TIME'
            ? 'after auction completion'
            : 'before auction start'
        }
        daysValue={policy.offsetDays}
        hoursValue={policy.offsetHours}
        onDaysChange={(v) => onChange({ offsetDays: v })}
        onHoursChange={(v) => onChange({ offsetHours: v })}
      />

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Mode</Label>
        <div className="flex items-center gap-4">
          {(modeOptions.length > 0
            ? modeOptions
            : [
                { value: 'ONLINE', label: 'Online' },
                { value: 'OFFLINE', label: 'Offline' },
              ]
          ).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm cursor-pointer select-none"
            >
              <input
                type="radio"
                name={`payment_mode_${index}`}
                value={opt.value}
                checked={policy.mode === opt.value}
                onChange={() => onChange({ mode: opt.value })}
                className="accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Payment Head */}
      <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Payment Head</span>
          <button
            type="button"
            onClick={addHead}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add head
          </button>
        </div>
        <FieldError message={fieldErrors[`payment_heads_${index}`]} />

        <div className="space-y-3">
          {policy.heads.map((head, j) => {
            const isPercentage = head.basis.startsWith('PERCENTAGE');
            const pct =
              isPercentage && head.value ? (openingPrice * parseFloat(head.value)) / 100 : null;
            return (
              <div key={j} className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Payment Head {j + 1}
                  </span>
                  {policy.heads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHead(j)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <NameDescriptionFields
                  name={head.name}
                  description={head.description}
                  nameId={`payment_head_name_${index}_${j}`}
                  descId={`payment_head_desc_${index}_${j}`}
                  onNameChange={(v) => updateHead(j, { name: v })}
                  onDescriptionChange={(v) => updateHead(j, { description: v })}
                  nameError={fieldErrors[`payment_head_name_${index}_${j}`]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField
                    id={`payment_head_basis_${index}_${j}`}
                    label="Basis"
                    required
                    value={head.basis}
                    options={basisOptions}
                    onChange={(v) => updateHead(j, { basis: v, value: '' })}
                    error={fieldErrors[`payment_head_basis_${index}_${j}`]}
                    placeholder="Select basis..."
                  />
                </div>

                {head.basis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`payment_head_value_${index}_${j}`}
                        className="text-xs font-medium"
                      >
                        {isPercentage ? 'Percentage' : 'Amount'}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative flex items-center">
                        <Input
                          id={`payment_head_value_${index}_${j}`}
                          type="number"
                          min={0}
                          max={isPercentage ? 100 : undefined}
                          step="0.01"
                          value={head.value}
                          onChange={(e) => updateHead(j, { value: e.target.value })}
                          placeholder="0.00"
                          className={isPercentage ? 'pr-8' : ''}
                        />
                        {isPercentage && (
                          <span className="absolute right-3 text-sm text-muted-foreground">%</span>
                        )}
                      </div>
                      {isPercentage && pct !== null && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {currencyUnit} {pct.toFixed(precision)}
                        </p>
                      )}
                      <FieldError message={fieldErrors[`payment_head_value_${index}_${j}`]} />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={head.refundable}
                          onChange={(e) => updateHead(j, { refundable: e.target.checked })}
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
  );
}

interface Props {
  policies: PaymentPolicyItem[];
  onChange: (updated: PaymentPolicyItem[]) => void;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  groupDescription?: string;
  title: string;
  fixedScheduleReference: ScheduleReference;
  modeOptions: SelectOption[];
  /** Keyed by the item's original index in `policies` (not the filtered/visible index). */
  evaluationsByIndex?: Record<number, PolicyEvaluationMap>;
}

function makeEmptyHead(scheduleReference: ScheduleReference): PolicyHeadItem {
  const defaults =
    scheduleReference === 'AUCTION_END_TIME' ? PAYMENT_HEAD_DEFAULT_POST : PAYMENT_HEAD_DEFAULT;
  return {
    name: defaults.name,
    description: defaults.description,
    basis: '',
    value: '',
    refundable: false,
  };
}

function makeEmptyPolicy(scheduleReference: ScheduleReference): PaymentPolicyItem {
  const defaults = PAYMENT_POLICY_NAME_DEFAULTS[scheduleReference];
  return {
    name: defaults.name,
    description: defaults.description,
    scheduleReference,
    offsetDays: '',
    offsetHours: '0',
    heads: [makeEmptyHead(scheduleReference)],
    mode: 'ONLINE',
  };
}

export function PolicyPaymentSection({
  policies,
  onChange,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  groupDescription,
  title,
  fixedScheduleReference,
  modeOptions,
  evaluationsByIndex,
}: Props) {
  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Payment policies that were already saved (have an id) are shown elsewhere as
  // read-only evaluate cards with their own edit/delete actions — this list only
  // ever renders drafts (not yet saved).
  const visible = policies
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p }) => !p.id && (p.scheduleReference || 'AUCTION_START_TIME') === fixedScheduleReference,
    );

  const reorderVisible = (reorderFn: (subset: PaymentPolicyItem[]) => PaymentPolicyItem[]) => {
    const indices = visible.map((v) => v.i);
    const subset = visible.map((v) => v.p);
    const reordered = reorderFn(subset);
    const updated = [...policies];
    indices.forEach((origIdx, k) => {
      updated[origIdx] = reordered[k]!;
    });
    onChange(updated);
  };

  const add = () => onChange([...policies, makeEmptyPolicy(fixedScheduleReference)]);
  const remove = (i: number) => onChange(policies.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const localIdx = visible.findIndex((v) => v.i === i);
    reorderVisible((subset) => moveItem(subset, localIdx, dir));
  };
  const update = (i: number, patch: Partial<PaymentPolicyItem>) =>
    onChange(policies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment policies defined.</p>
      ) : (
        <div className="space-y-3">
          {visible.map(({ p: pp, i }, localIdx) => (
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
                    Policy {localIdx + 1}
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

              <PaymentPolicyFields
                index={i}
                policy={pp}
                onChange={(patch) => update(i, patch)}
                openingPrice={openingPrice}
                precision={precision}
                currencyUnit={currencyUnit}
                fieldErrors={fieldErrors}
                fixedScheduleReference={fixedScheduleReference}
                modeOptions={modeOptions}
              />

              {evaluationsByIndex?.[i] && <EvaluationList evaluations={evaluationsByIndex[i]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
