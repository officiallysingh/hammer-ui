'use client';

import * as React from 'react';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScrollList({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!listRef.current || !selected) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-val="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div ref={listRef} className="h-48 overflow-y-auto overscroll-contain flex flex-col gap-0.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          data-val={item}
          onClick={() => onSelect(item)}
          className={cn(
            'w-10 rounded px-2 py-1 text-sm text-center transition-colors',
            item === selected
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-muted text-foreground',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

export interface DateRange {
  from?: string; // "yyyy-MM-dd"
  to?: string; // "yyyy-MM-dd"
}

export interface DateRangePickerProps {
  id?: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const from = value?.from ? new Date(value.from + 'T00:00:00') : undefined;
  const to = value?.to ? new Date(value.to + 'T00:00:00') : undefined;

  const label = React.useMemo(() => {
    if (value?.from && value?.to) return `${formatDate(value.from)} – ${formatDate(value.to)}`;
    if (value?.from) return `${formatDate(value.from)} – …`;
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !label && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            onChange({
              from: range?.from ? toIsoDate(range.from) : undefined,
              to: range?.to ? toIsoDate(range.to) : undefined,
            });
            if (range?.from && range?.to) setOpen(false);
          }}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

export interface DatePickerProps {
  id?: string;
  value?: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? formatDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : '');
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

export interface TimePickerProps {
  id?: string;
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a time',
  disabled,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const pick = (h: string, m: string) => onChange(`${h}:${m}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4 shrink-0" />
          {value || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-2 items-start">
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">HH</p>
            <ScrollList
              items={HOURS}
              selected={hour ?? ''}
              onSelect={(h) => pick(h, minute || '00')}
            />
          </div>
          <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">MM</p>
            <ScrollList
              items={MINUTES}
              selected={minute ?? ''}
              onSelect={(m) => pick(hour || '00', m)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

export interface DateTimePickerProps {
  id?: string;
  value?: string; // "yyyy-MM-ddTHH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick date & time',
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const normalized = value?.replace(' ', 'T') ?? '';
  const [datePart, timePart] = normalized ? normalized.split('T') : ['', ''];
  const [hour, minute] = timePart ? timePart.split(':') : ['', ''];

  const selected = datePart ? new Date(datePart + 'T00:00:00') : undefined;

  const update = (d: string, h: string, m: string) => {
    if (!d) return;
    onChange(`${d}T${h || '00'}:${m || '00'}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? formatDateTime(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) update(toIsoDate(date), hour ?? '', minute ?? '');
            }}
            initialFocus
          />
          <div className="flex flex-col p-3 gap-1">
            <p className="text-xs font-medium text-muted-foreground text-center pb-1">Time</p>
            <div className="flex gap-2 items-start">
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">HH</p>
                <ScrollList
                  items={HOURS}
                  selected={hour ?? ''}
                  onSelect={(h) => update(datePart ?? '', h, minute ?? '')}
                />
              </div>
              <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">MM</p>
                <ScrollList
                  items={MINUTES}
                  selected={minute ?? ''}
                  onSelect={(m) => update(datePart ?? '', hour ?? '', m)}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
