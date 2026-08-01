'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarToggleProps {
  collapsed: boolean;
  onClick: () => void;
  className?: string;
  title?: string;
}

export function SidebarToggle({ collapsed, onClick, className = '', title }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
      className={className}
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </button>
  );
}
