'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import ReactSelect from 'react-select';
import { makeReactSelectStyles } from '@/components/common/admin/GroupedSubcategorySelect';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { PriceChangeItem } from './AuctionStep3Types';
import {
  NameDescriptionFields,
  POLICY_DEFAULTS,
  PolicyInfoButton,
  SELECT_CLS,
  SortButtons,
  moveItem,
} from './PolicyShared';

interface Props {
  auctionType: string;
  priceChangePolicies: PriceChangeItem[];
  priceChangePolicyType: string;
  onPoliciesChange: (updated: PriceChangeItem[]) => void;
  onPolicyTypeChange: (v: string) => void;
  stepBasedOptions: SelectOption[];
  clockBasedOptions: SelectOption[];
  fieldErrors: Record<string, string>;
  groupDescription?: string;
}

const STEP_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

const EMPTY_ITEM: PriceChangeItem = {
  name: '',
  description: '',
  type: '',
  windowHours: '',
  windowMinutes: '0',
  steps: [],
  value: '',
};

export function PolicyPriceProgressionSection({
  auctionType,
  priceChangePolicies,
  priceChangePolicyType,
  onPoliciesChange,
  onPolicyTypeChange,
  stepBasedOptions,
  clockBasedOptions,
  fieldErrors,
  groupDescription,
}: Props) {
  const isStepBased = auctionType === 'STEP_BASED';

  const add = () => {
    const firstType = stepBasedOptions[0]?.value ?? '';
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    onPoliciesChange([
      ...priceChangePolicies,
      {
        ...EMPTY_ITEM,
        type: firstType,
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
      },
    ]);
  };
  const remove = (i: number) => onPoliciesChange(priceChangePolicies.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => onPoliciesChange(moveItem(priceChangePolicies, i, dir));
  const update = (i: number, patch: Partial<PriceChangeItem>) =>
    onPoliciesChange(priceChangePolicies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  if (!isStepBased) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Price Progression</h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        <SelectField
          id="priceChangePolicyType"
          label="Type"
          value={priceChangePolicyType}
          options={clockBasedOptions}
          onChange={onPolicyTypeChange}
          error={fieldErrors['priceChangePolicyType']}
          placeholder="Select type..."
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Price Progression</h3>
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

      {priceChangePolicies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No price progression windows defined.</p>
      ) : (
        <div className="space-y-3">
          {priceChangePolicies.map((pc, i) => {
            const isLast = i === priceChangePolicies.length - 1;
            return (
              <div key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SortButtons
                      index={i}
                      total={priceChangePolicies.length}
                      onMove={(dir) => move(i, dir)}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Window {i + 1}
                      <span className="ml-1 text-muted-foreground/50">· priority {i + 1}</span>
                      {isLast && (
                        <span className="ml-1 text-muted-foreground/50">· rest of auction</span>
                      )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField
                    id={`pc_type_${i}`}
                    label="Type"
                    required
                    value={pc.type}
                    options={stepBasedOptions}
                    onChange={(v) => {
                      const defaults = POLICY_DEFAULTS[v];
                      update(i, {
                        type: v,
                        name: pc.name || defaults?.name || '',
                        description: pc.description || defaults?.description || '',
                      });
                    }}
                    error={fieldErrors[`priceChange_type_${i}`]}
                    placeholder="Select type..."
                  />

                  {isLast ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Window Duration</Label>
                      <p className="text-xs text-muted-foreground py-[7px]">
                        Covers rest of auction
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Window Duration</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={pc.windowHours}
                          onChange={(e) => update(i, { windowHours: e.target.value })}
                          className="w-20 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: 25 }, (_, h) => (
                            <option key={h} value={String(h)}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-muted-foreground">h</span>
                        <select
                          value={pc.windowMinutes}
                          onChange={(e) => update(i, { windowMinutes: e.target.value })}
                          className="w-20 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {Array.from({ length: 60 }, (_, m) => (
                            <option key={m} value={String(m)}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                      <FieldError message={fieldErrors[`priceChange_window_${i}`]} />
                    </div>
                  )}
                </div>

                {pc.type && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Step Multipliers{' '}
                        <span className="text-muted-foreground text-[10px]">
                          (1–10, leave empty for all)
                        </span>
                      </Label>
                      <ReactSelect
                        isMulti
                        options={STEP_OPTIONS}
                        value={STEP_OPTIONS.filter((o) => pc.steps.includes(o.value))}
                        onChange={(selected) => update(i, { steps: selected.map((s) => s.value) })}
                        placeholder="Select steps..."
                        menuPortalTarget={
                          typeof document !== 'undefined' ? document.body : undefined
                        }
                        styles={makeReactSelectStyles<true>()}
                      />
                      <FieldError message={fieldErrors[`priceChange_steps_${i}`]} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`pc_value_${i}`} className="text-xs font-medium">
                        Value / Increment
                      </Label>
                      <Input
                        id={`pc_value_${i}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={pc.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                      <FieldError message={fieldErrors[`priceChange_value_${i}`]} />
                    </div>
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
