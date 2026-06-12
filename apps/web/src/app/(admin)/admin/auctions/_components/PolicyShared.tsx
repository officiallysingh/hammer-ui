'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Input, Label } from '@repo/ui';

export const POLICY_DEFAULTS: Record<string, { name: string; description: string }> = {
  PARTICIPATION_FEE_POLICY: {
    name: 'Participation Fee',
    description: 'Fee payment to participate in Auction. Non refundable',
  },
  EMD_POLICY: {
    name: 'Earnest Money Deposit',
    description: 'Earnest Money Deposit required to participate in Auction. Refundable',
  },
  MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY: {
    name: 'Minimum required participants',
    description: 'Minimum required participants, if not met then the Auction will be cancelled',
  },
  EXTENSION_POLICY: {
    name: 'Auction extension',
    description: 'Auction extension for last moment offer protection. 0 means unlimited extensions',
  },
  STEP_BASED_OFFER_PRICE_POLICY: {
    name: 'Step based Offer price',
    description: 'Offers are made in step of given amount',
  },
  KTH_PRICE_WINNER_DETERMINATION_POLICY: {
    name: 'Winner determination',
    description: 'Winner determined on the basis of 1st, 2nd or Kth price',
  },
  KTH_PRICE_WINNER_PRICE_DETERMINATION_POLICY: {
    name: 'Winner Price determination',
    description: 'Winner can pay 1st, 2nd or Kth price.',
  },
  KTH_WINNER_PRICE_DETERMINATION_POLICY: {
    name: 'Winner Price determination',
    description: 'Winner can pay 1st, 2nd or Kth price.',
  },
  FULL_PAYMENT_CLEARING_POLICY: {
    name: 'Winner Payment',
    description: 'Winner pays the full Winning Auction Amount',
  },
  INSTALLMENTS_PAYMENT_CLEARING_POLICY: {
    name: 'Installments Payment',
    description: 'Winner pays the winning amount in installments',
  },
};

export function PolicyInfoButton({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="More information"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-border bg-popover p-3 shadow-md text-xs text-popover-foreground leading-relaxed">
            {description}
          </div>
        </>
      )}
    </div>
  );
}

export const SELECT_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

export const TEXTAREA_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none';

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const copy = [...arr];
  const j = i + dir;
  if (j < 0 || j >= copy.length) return copy;
  const tmp = copy[i]!;
  copy[i] = copy[j]!;
  copy[j] = tmp;
  return copy;
}

export function ordinalSuffix(n: string): string {
  const num = parseInt(n, 10);
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  return `${num}th`;
}

export function SortButtons({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DayHourDropdowns({
  daysValue,
  hoursValue,
  onDaysChange,
  onHoursChange,
  label,
}: {
  daysValue: string;
  hoursValue: string;
  onDaysChange: (v: string) => void;
  onHoursChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium">{label}</Label>}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={daysValue}
          onChange={(e) => onDaysChange(e.target.value)}
          className="w-24 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">days</span>
        <select
          value={hoursValue}
          onChange={(e) => onHoursChange(e.target.value)}
          className="w-20 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={String(i)}>
              {i}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">hours</span>
      </div>
    </div>
  );
}

export function NameDescriptionFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  nameId,
  descId,
}: {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  nameId: string;
  descId: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={nameId} className="text-xs font-medium">
          Name
        </Label>
        <Input
          id={nameId}
          value={name ?? ''}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Policy name"
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={descId} className="text-xs font-medium">
          Description
        </Label>
        <textarea
          id={descId}
          value={description ?? ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief description"
          rows={1}
          className={TEXTAREA_CLS}
        />
      </div>
    </div>
  );
}
