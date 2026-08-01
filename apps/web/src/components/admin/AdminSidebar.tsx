'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { navEntries, groupHasActive } from './nav-config';
import { SidebarToggle } from './SidebarToggle';
import type { UserInfoLike } from './UserMenu';

interface AdminSidebarProps {
  username: string;
  userInfo?: UserInfoLike | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
  onSignOut: () => void;
}

export function AdminSidebar({
  username,
  userInfo,
  collapsed = false,
  onToggleCollapse,
  onNavClick = () => {},
  onSignOut,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navEntries.forEach((entry) => {
      if (entry.kind === 'group') init[entry.label] = groupHasActive(entry, pathname);
    });
    return init;
  });

  React.useEffect(() => {
    navEntries.forEach((entry) => {
      if (entry.kind === 'group' && groupHasActive(entry, pathname))
        setOpenGroups((prev) => ({ ...prev, [entry.label]: true }));
    });
  }, [pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-card select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-border/60 shrink-0">
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden py-1">
            {collapsed ? (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary via-primary/95 to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm shadow-primary/20 shrink-0">
                O
              </div>
            ) : (
              <>
                <img
                  src="/oxneer_logo_light.svg"
                  alt="Oxneer"
                  className="h-8 w-auto shrink-0 dark:hidden"
                />
                <img
                  src="/oxneer_logo_dark.svg"
                  alt="Oxneer"
                  className="h-8 w-auto shrink-0 hidden dark:block"
                />
                {/* <div className="flex flex-col truncate">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    Admin Portal
                  </span>
                </div> */}
              </>
            )}
          </Link>

          {/* {onToggleCollapse && (
            <SidebarToggle
              collapsed={collapsed}
              onClick={onToggleCollapse}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            />
          )} */}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5 scrollbar-thin">
          {navEntries.map((entry) => {
            // ── Flat item (Listings / Auctions) ─────────────────────────────
            if (entry.kind === 'flat') {
              const active = pathname.startsWith(entry.href);
              const Icon = entry.icon;

              const linkContent = (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={onNavClick}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
                  } ${collapsed ? 'justify-center px-0 h-10 w-full' : ''}`}
                >
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`}
                  />
                  {!collapsed && <span className="font-body flex-1 truncate">{entry.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={entry.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs">{entry.label}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.description}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            }

            // ── Collapsible group ────────────────────────────────────────────
            const isOpen = !!openGroups[entry.label];
            const hasActive = groupHasActive(entry, pathname);

            if (collapsed) {
              return (
                <div
                  key={entry.label}
                  className="pt-2 first:pt-0 space-y-1 border-t border-border/40 first:border-0"
                >
                  {entry.items.map((item) => {
                    const { href, label, icon: Icon, description } = item;
                    const active = href ? pathname.startsWith(href) : false;

                    return (
                      <Tooltip key={href ?? label}>
                        <TooltipTrigger asChild>
                          <Link
                            href={href ?? '#'}
                            onClick={onNavClick}
                            className={`group relative flex items-center justify-center h-10 w-full rounded-xl text-sm transition-all duration-200 ${
                              active
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
                            }`}
                          >
                            {active && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                            )}
                            <Icon
                              className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`}
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs">{label}</span>
                          <span className="text-[10px] text-muted-foreground">{description}</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={entry.label} className="pt-1.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors outline-none ${
                    hasActive ? 'text-primary' : 'text-muted-foreground/70 hover:text-foreground'
                  }`}
                >
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-0.5 pl-2 border-l border-border/40 ml-3">
                    {entry.items.map((item) => {
                      const { href, label, icon: Icon } = item;
                      const active = href ? pathname.startsWith(href) : false;

                      return (
                        <Link
                          key={href ?? label}
                          href={href ?? '#'}
                          onClick={onNavClick}
                          className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/70'
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : ''}`}
                          />
                          <span className="font-body flex-1 truncate">{label}</span>
                          {active && <ChevronRight className="h-3 w-3 shrink-0 text-primary/70" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-border/60 p-2.5 shrink-0 space-y-1 bg-muted/20">
          {!collapsed ? (
            <Link
              href="/profile"
              onClick={onNavClick}
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-accent transition-colors group"
            >
              <UserAvatar
                src={userInfo?.profilePicture}
                firstName={userInfo?.firstName}
                lastName={userInfo?.lastName}
                username={username}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="font-body text-xs font-semibold text-foreground truncate leading-snug">
                  {username}
                </p>
                <p className="font-body text-[10px] font-medium text-muted-foreground">
                  Administrator
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  onClick={onNavClick}
                  className="flex justify-center py-1 rounded-xl hover:bg-accent transition-colors"
                >
                  <UserAvatar
                    src={userInfo?.profilePicture}
                    firstName={userInfo?.firstName}
                    lastName={userInfo?.lastName}
                    username={username}
                    size={32}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium text-xs">{username}</p>
                <p className="text-[10px] text-muted-foreground">Administrator Profile</p>
              </TooltipContent>
            </Tooltip>
          )}

          {!collapsed ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-medium"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign out</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full flex justify-center py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
