import { LucideIcon } from 'lucide-react';

export interface TimelineNode {
  id: string;
  label: string;
  Icon: LucideIcon;
  dotClass: string;
  labelClass: string;
  borderClass: string;
  title: string;
  time?: string;
  timeTo?: string;
  subs: string[];
  durationToNext?: string | null;
}

export interface NestedChild {
  id: string;
  time?: string;
  timeTo?: string;
  name: string;
  description?: string;
  tags?: { label: string; value?: string }[];
}
