'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import {
  Users,
  ShieldCheck,
  KeyRound,
  LogOut,
  Menu,
  ChevronRight,
  Tag,
  MapPin,
  ExternalLink,
  User,
  ChevronDown,
  List,
  Database,
  Gavel,
  Puzzle,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { authApi } from '@repo/api';
import { ThemeToggle } from '@/components/common/Header/ThemeToggle';

interface NavSubItem {
  href: string;
  label: string;
  description: string;
  icon?: React.ElementType;
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  description: string;
  subItems?: NavSubItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'User Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, description: 'Manage accounts' },
      { href: '/admin/roles', label: 'Roles', icon: ShieldCheck, description: 'Authority groups' },
      {
        href: '/admin/permissions',
        label: 'Permissions',
        icon: KeyRound,
        description: 'Access rights',
      },
    ],
  },
  {
    label: 'Master',
    items: [
      {
        href: '/admin/master/categories',
        label: 'Categories',
        icon: Tag,
        description: 'Item categories',
      },
      // {
      //   href: '/admin/master/states',
      //   label: 'States',
      //   icon: MapPin,
      //   description: 'States, cities & areas',
      // },
    ],
  },
  {
    label: 'Listings',
    items: [
      {
        label: 'Metadata',
        icon: Database,
        description: 'Manage metadata & components',
        subItems: [
          {
            href: '/admin/metadata/components',
            label: 'Components',
            description: 'Reusable property groups',
            icon: Puzzle,
          },
          {
            href: '/admin/metadata',
            label: 'Metadata',
            description: 'Type definitions',
            icon: Database,
          },
        ],
      },
      { href: '/admin/listings', label: 'Listings', icon: List, description: 'Auction listings' },
    ],
  },
  {
    label: 'Auctions',
    items: [
      {
        href: '/admin/auctions',
        label: 'Auctions',
        icon: Gavel,
        description: 'Manage auctions',
      },
    ],
  },
];

// Flat list for topbar label lookup
const allNavItems = navGroups.flatMap((g) =>
  g.items.flatMap((item) =>
    item.subItems
      ? item.subItems.map((sub) => ({
          href: sub.href,
          label: sub.label,
          description: sub.description,
          icon: sub.icon || item.icon,
        }))
      : [
          {
            href: item.href || '',
            label: item.label,
            description: item.description,
            icon: item.icon,
          },
        ],
  ),
);

// Sub-route title overrides
const subRouteTitles: { match: RegExp; label: string; description: string }[] = [
  {
    match: /\/admin\/master\/states$/,
    label: 'States',
    description: 'Manage states, cities & areas',
  },
  {
    match: /\/admin\/master\/categories\/new$/,
    label: 'Add category',
    description: 'Create a new category',
  },
  {
    match: /\/admin\/master\/categories\/.+\/edit$/,
    label: 'Edit category',
    description: 'Update category details',
  },
  {
    match: /\/admin\/master\/categories\/.+\/subcategories\/new$/,
    label: 'Add sub-category',
    description: 'Create a new sub-category',
  },
  {
    match: /\/admin\/users\/new$/,
    label: 'Add user',
    description: 'Create a new user account',
  },
  {
    match: /\/admin\/users\/.+\/edit$/,
    label: 'Edit user',
    description: 'Update user details',
  },
  {
    match: /\/admin\/listings\/new$/,
    label: 'New listing',
    description: 'Create a new listing',
  },
  {
    match: /\/admin\/listings\/.+\/edit$/,
    label: 'Edit listing',
    description: 'Update listing details',
  },
  {
    match: /\/admin\/metadata\/new$/,
    label: 'New type',
    description: 'Create a type definition',
  },
  {
    match: /\/admin\/metadata\/.+\/edit$/,
    label: 'Edit type',
    description: 'Update type definition',
  },
  {
    match: /\/admin\/metadata\/components\/new$/,
    label: 'New component',
    description: 'Create a reusable property group',
  },
  {
    match: /\/admin\/metadata\/components\/.+\/edit$/,
    label: 'Edit component',
    description: 'Update component definition',
  },
  {
    match: /\/admin\/auctions\/new$/,
    label: 'New auction',
    description: 'Create a new auction',
  },
  {
    match: /\/admin\/auctions\/.+\/edit$/,
    label: 'Edit auction',
    description: 'Update auction details',
  },
  {
    match: /\/admin\/auctions\/.+\/view$/,
    label: 'View auction',
    description: 'Auction details',
  },
];

interface SidebarContentProps {
  pathname: string;
  username: string;
  onNavClick: () => void;
  onSignOut: () => void;
}

function SidebarContent({ pathname, username, onNavClick, onSignOut }: SidebarContentProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems) {
          const hasActiveSub = item.subItems.some((sub) => {
            return sub.href === '/admin/metadata'
              ? pathname.startsWith(sub.href) && !pathname.startsWith('/admin/metadata/components')
              : pathname.startsWith(sub.href);
          });
          if (hasActiveSub) {
            initial[item.label] = true;
          }
        }
      });
    });
    return initial;
  });

  // Keep groups open if navigation happens externally
  React.useEffect(() => {
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems) {
          const hasActiveSub = item.subItems.some((sub) => {
            return sub.href === '/admin/metadata'
              ? pathname.startsWith(sub.href) && !pathname.startsWith('/admin/metadata/components')
              : pathname.startsWith(sub.href);
          });
          if (hasActiveSub) {
            setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
          }
        }
      });
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center justify-center px-5 border-b border-border shrink-0">
        <img
          src="/oxneer_logo_light.svg"
          alt="OXNEER"
          className="h-12 w-auto shrink-0 dark:hidden"
        />
        <img
          src="/oxneer_logo_dark.svg"
          alt="OXNEER"
          className="h-12 w-auto shrink-0 hidden dark:block"
        />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 font-body text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const { href, label, icon: Icon, description, subItems } = item;

                if (subItems) {
                  const isOpen = !!openGroups[label];
                  const hasActiveSub = subItems.some((sub) => {
                    return sub.href === '/admin/metadata'
                      ? pathname.startsWith(sub.href) &&
                          !pathname.startsWith('/admin/metadata/components')
                      : pathname.startsWith(sub.href);
                  });

                  return (
                    <div key={label} className="space-y-0.5">
                      <button
                        onClick={() => toggleGroup(label)}
                        className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left outline-none ${
                          hasActiveSub
                            ? 'text-foreground bg-secondary/40'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${hasActiveSub ? 'text-primary' : ''}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-body font-medium">{label}</div>
                          <div className="font-body text-[10px] truncate text-muted-foreground">
                            {description}
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 opacity-70 ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="pl-6 space-y-0.5 mt-1 border-l border-border/60 ml-5">
                          {subItems.map((sub) => {
                            const subActive =
                              sub.href === '/admin/metadata'
                                ? pathname.startsWith(sub.href) &&
                                  !pathname.startsWith('/admin/metadata/components')
                                : pathname.startsWith(sub.href);
                            const SubIcon = sub.icon || Icon;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onNavClick}
                                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                                  subActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <SubIcon
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    subActive
                                      ? 'text-primary'
                                      : 'text-muted-foreground/75 group-hover:text-foreground'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-body">{sub.label}</div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = href ? pathname.startsWith(href) : false;
                return (
                  <Link
                    key={href}
                    href={href || '#'}
                    onClick={onNavClick}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-gold'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-medium">{label}</div>
                      <div
                        className={`font-body text-[10px] truncate ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                      >
                        {description}
                      </div>
                    </div>
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="font-body text-xs font-semibold text-foreground uppercase">
              {username.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body text-sm font-medium text-foreground truncate">{username}</p>
            <p className="font-body text-[10px] text-muted-foreground">Administrator</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-body"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser, isAdmin } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!user || !isAdmin()) router.replace('/login');
  }, [user, isAdmin, router]);

  if (!user || !isAdmin()) return null;

  const subRoute = subRouteTitles.find((r) => r.match.test(pathname));
  const activeLink = allNavItems.find((l) => pathname.startsWith(l.href));

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearUser();
    router.push('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card flex-col h-full">
        <SidebarContent
          pathname={pathname}
          username={user.username}
          onNavClick={() => {}}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-card border-r border-border flex flex-col z-10">
            <SidebarContent
              pathname={pathname}
              username={user.username}
              onNavClick={() => setSidebarOpen(false)}
              onSignOut={handleSignOut}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Topbar — sticky within the main column */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-body text-sm font-semibold text-foreground">
                {subRoute?.label ?? activeLink?.label ?? 'Admin'}
              </h2>
              <p className="font-body text-xs text-muted-foreground hidden sm:block">
                {subRoute?.description ?? activeLink?.description ?? 'Dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors outline-none">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-body text-xs font-bold text-primary uppercase">
                      {user.username.charAt(0)}
                    </span>
                  </div>
                  {/* Name — hidden on small screens */}
                  <div className="hidden sm:flex flex-col items-start min-w-0">
                    <span className="font-body text-sm font-medium text-foreground leading-none truncate max-w-[120px]">
                      {user.username}
                    </span>
                    <span className="font-body text-[10px] text-muted-foreground leading-none mt-0.5">
                      Administrator
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Header */}
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                      <span className="font-body text-sm font-bold text-primary uppercase">
                        {user.username.charAt(0)}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body text-sm font-semibold text-foreground truncate">
                        {user.username}
                      </span>
                      <span className="font-body text-xs text-muted-foreground">Administrator</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/" className="gap-2 cursor-pointer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span>Back to site</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
