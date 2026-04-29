'use client';

import { Tag } from 'lucide-react';
import { ICON_REGISTRY } from './iconRegistry';

interface CategoryIconProps {
  value?: string | null;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export function CategoryIcon({ value, size = 20, className, fallback }: CategoryIconProps) {
  if (!value)
    return (
      <>{fallback ?? <Tag style={{ width: size, height: size }} className="text-primary" />}</>
    );
  const Icon = ICON_REGISTRY[value];
  if (Icon) return <Icon size={size} className={className} />;
  return (
    <span style={{ fontSize: size * 0.9 }} className={className}>
      {value}
    </span>
  );
}
