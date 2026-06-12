'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS, PolicyInfoButton, ordinalSuffix } from './PolicyShared';

interface WinnerBlockProps {
  title: string;
  type: string;
  kth: string;
  name: string;
  description: string;
  onFieldChange: (field: string, value: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  options: SelectOption[];
  fieldPrefix: string;
  fieldErrors: Record<string, string>;
  groupDescription?: string;
}

function WinnerBlock({
  title,
  type,
  kth,
  name,
  description,
  onFieldChange,
  onAdd,
  onRemove,
  options,
  fieldPrefix,
  fieldErrors,
  groupDescription,
}: WinnerBlockProps) {
  const added = type !== '';
  const kthNum = parseInt(kth, 10) || 1;
  const showKth =
    type === 'KTH_PRICE_WINNER_DETERMINATION_POLICY' ||
    type === 'KTH_PRICE_WINNER_PRICE_DETERMINATION_POLICY' ||
    type === 'KTH_WINNER_PRICE_DETERMINATION_POLICY';

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        {!added ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!added ? (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} policy defined.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={name ?? ''}
                onChange={(e) => onFieldChange(`${fieldPrefix}Name`, e.target.value)}
                placeholder="Policy name"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={description ?? ''}
                onChange={(e) => onFieldChange(`${fieldPrefix}Description`, e.target.value)}
                placeholder="Brief description"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField
              id={`${fieldPrefix}Type`}
              label="Type"
              required
              value={type}
              options={options}
              onChange={(v) => {
                const defaults = POLICY_DEFAULTS[v];
                onFieldChange(`${fieldPrefix}Type`, v);
                if (!name) onFieldChange(`${fieldPrefix}Name`, defaults?.name ?? '');
                if (!description)
                  onFieldChange(`${fieldPrefix}Description`, defaults?.description ?? '');
              }}
              error={fieldErrors[`${fieldPrefix}Type`]}
              placeholder="Select type..."
            />

            {showKth && (
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldPrefix}Kth`} className="text-xs font-medium">
                  Kth Position <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`${fieldPrefix}Kth`}
                    type="number"
                    min={1}
                    value={kth}
                    onChange={(e) => onFieldChange(`${fieldPrefix}Kth`, e.target.value)}
                    className="h-8 text-sm w-24"
                  />
                  {kthNum > 0 && (
                    <span className="text-sm text-muted-foreground">
                      = {ordinalSuffix(String(kthNum))} place
                    </span>
                  )}
                </div>
                <FieldError message={fieldErrors[`${fieldPrefix}Kth`]} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  winnerDeterminationType: string;
  winnerDeterminationKth: string;
  winnerDeterminationName: string;
  winnerDeterminationDescription: string;
  winnerPriceDeterminationType: string;
  winnerPriceDeterminationKth: string;
  winnerPriceDeterminationName: string;
  winnerPriceDeterminationDescription: string;
  onFieldChange: (field: string, value: string) => void;
  onWinnerAdd: () => void;
  onWinnerRemove: () => void;
  onWinnerPriceAdd: () => void;
  onWinnerPriceRemove: () => void;
  winnerDeterminationOptions: SelectOption[];
  winnerPriceOptions: SelectOption[];
  fieldErrors: Record<string, string>;
  winnerGroupInfo?: string;
  winnerPriceGroupInfo?: string;
}

export function PolicyWinnerSection({
  winnerDeterminationType,
  winnerDeterminationKth,
  winnerDeterminationName,
  winnerDeterminationDescription,
  winnerPriceDeterminationType,
  winnerPriceDeterminationKth,
  winnerPriceDeterminationName,
  winnerPriceDeterminationDescription,
  onFieldChange,
  onWinnerAdd,
  onWinnerRemove,
  onWinnerPriceAdd,
  onWinnerPriceRemove,
  winnerDeterminationOptions,
  winnerPriceOptions,
  fieldErrors,
  winnerGroupInfo,
  winnerPriceGroupInfo,
}: Props) {
  return (
    <>
      <WinnerBlock
        title="Winner Determination"
        type={winnerDeterminationType}
        kth={winnerDeterminationKth}
        name={winnerDeterminationName}
        description={winnerDeterminationDescription}
        onFieldChange={onFieldChange}
        onAdd={onWinnerAdd}
        onRemove={onWinnerRemove}
        options={winnerDeterminationOptions}
        fieldPrefix="winnerDetermination"
        fieldErrors={fieldErrors}
        groupDescription={winnerGroupInfo}
      />
      <WinnerBlock
        title="Winner Price Determination"
        type={winnerPriceDeterminationType}
        kth={winnerPriceDeterminationKth}
        name={winnerPriceDeterminationName}
        description={winnerPriceDeterminationDescription}
        onFieldChange={onFieldChange}
        onAdd={onWinnerPriceAdd}
        onRemove={onWinnerPriceRemove}
        options={winnerPriceOptions}
        fieldPrefix="winnerPriceDetermination"
        fieldErrors={fieldErrors}
        groupDescription={winnerPriceGroupInfo}
      />
    </>
  );
}
