'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
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
  Building2,
  MapPinned,
  Landmark,
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
import { UserAvatar } from '@/components/common/admin/UserAvatar';

// ── Nav structure ─────────────────────────────────────────────────────────────
// Three kinds of nav entries:
//   1. flat    — a direct link rendered at the top level (no group wrapper)
//   2. group   — collapsible section with direct-link children
//   3. grouped subItems — an expandable item inside a group whose children are links

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
  kind: 'group';
  label: string;
  items: NavItem[];
}

interface NavFlat {
  kind: 'flat';
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

type NavEntry = NavGroup | NavFlat;

const navEntries: NavEntry[] = [
  {
    kind: 'group',
    label: 'User Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, description: 'Manage accounts' },
      { href: '/admin/roles', label: 'Roles', icon: ShieldCheck, description: 'Access roles' },
      {
        href: '/admin/permissions',
        label: 'Permissions',
        icon: KeyRound,
        description: 'Access rights',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Master',
    items: [
      {
        href: '/admin/master/categories',
        label: 'Categories',
        icon: Tag,
        description: 'Item categories',
      },
      {
        href: '/admin/master/states',
        label: 'States',
        icon: MapPin,
        description: 'States, cities & areas',
      },
      { href: '/admin/master/cities', label: 'Cities', icon: Building2, description: 'All cities' },
      { href: '/admin/master/areas', label: 'Areas', icon: MapPinned, description: 'All areas' },
      { href: '/admin/master/banks', label: 'Banks', icon: Landmark, description: 'Bank accounts' },
    ],
  },
  {
    kind: 'group',
    label: 'Managed Types',
    items: [
      {
        href: '/admin/metadata/components',
        label: 'Components',
        icon: Puzzle,
        description: 'Reusable property groups',
      },
      {
        href: '/admin/metadata',
        label: 'Templates',
        icon: Database,
        description: 'Type definitions',
      },
    ],
  },
  // ── Flat items ──────────────────────────────────────────────────────────────
  {
    kind: 'flat',
    href: '/admin/listings',
    label: 'Listings',
    icon: List,
    description: 'Auction listings',
  },
  {
    kind: 'flat',
    href: '/admin/auctions',
    label: 'Auctions',
    icon: Gavel,
    description: 'Manage auctions',
  },
];

// ── Flat list for topbar label lookup ─────────────────────────────────────────
const allNavItems: { href: string; label: string; description: string; icon: React.ElementType }[] =
  [
    ...navEntries.flatMap((entry) => {
      if (entry.kind === 'flat') {
        return [
          {
            href: entry.href,
            label: entry.label,
            description: entry.description,
            icon: entry.icon,
          },
        ];
      }
      return entry.items.flatMap((item) =>
        item.subItems
          ? item.subItems.map((sub) => ({
              href: sub.href,
              label: sub.label,
              description: sub.description,
              icon: sub.icon ?? item.icon,
            }))
          : [
              {
                href: item.href ?? '',
                label: item.label,
                description: item.description,
                icon: item.icon,
              },
            ],
      );
    }),
  ];

// ── Sub-route title overrides ─────────────────────────────────────────────────
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
  { match: /\/admin\/users\/new$/, label: 'Add user', description: 'Create a new user account' },
  { match: /\/admin\/users\/.+\/edit$/, label: 'Edit user', description: 'Update user details' },
  { match: /\/admin\/listings\/new$/, label: 'New listing', description: 'Create a new listing' },
  {
    match: /\/admin\/listings\/.+\/edit$/,
    label: 'Edit listing',
    description: 'Update listing details',
  },
  { match: /\/admin\/metadata\/new$/, label: 'New type', description: 'Create a type definition' },
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
  { match: /\/admin\/auctions\/new$/, label: 'New auction', description: 'Create a new auction' },
  {
    match: /\/admin\/auctions\/.+\/edit$/,
    label: 'Edit auction',
    description: 'Update auction details',
  },
  { match: /\/admin\/auctions\/.+\/view$/, label: 'View auction', description: 'Auction details' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) =>
    item.subItems
      ? item.subItems.some((sub) => pathname.startsWith(sub.href))
      : item.href
        ? pathname.startsWith(item.href)
        : false,
  );
}

function isSubItemActive(href: string, pathname: string): boolean {
  return href === '/admin/metadata'
    ? pathname.startsWith(href) && !pathname.startsWith('/admin/metadata/components')
    : pathname.startsWith(href);
}

// ── SidebarContent ────────────────────────────────────────────────────────────
interface SidebarContentProps {
  pathname: string;
  username: string;
  userInfo: { firstName?: string; lastName?: string; profilePicture?: string | null } | null;
  onNavClick: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  pathname,
  username,
  userInfo,
  onNavClick,
  onSignOut,
}: SidebarContentProps) {
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
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-border/60 shrink-0">
        <img
          src="/oxneer_logo_light.svg"
          alt="OXNEER"
          className="h-9 w-auto shrink-0 dark:hidden"
        />
        <img
          src="/oxneer_logo_dark.svg"
          alt="OXNEER"
          className="h-9 w-auto shrink-0 hidden dark:block"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navEntries.map((entry) => {
          // ── Flat item (Listings / Auctions) ─────────────────────────────
          if (entry.kind === 'flat') {
            const active = pathname.startsWith(entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-body flex-1">{entry.label}</span>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70 shrink-0" />
                )}
              </Link>
            );
          }

          // ── Collapsible group ────────────────────────────────────────────
          const isOpen = !!openGroups[entry.label];
          const hasActive = groupHasActive(entry, pathname);

          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-widest transition-colors outline-none ${
                  hasActive
                    ? 'text-primary'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {entry.items.map((item) => {
                    const { href, label, icon: Icon } = item;
                    const active = href
                      ? href === '/admin/metadata'
                        ? pathname.startsWith(href) &&
                          !pathname.startsWith('/admin/metadata/components')
                        : pathname.startsWith(href)
                      : false;
                    return (
                      <Link
                        key={href ?? label}
                        href={href ?? '#'}
                        onClick={onNavClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                        <span className="font-body flex-1">{label}</span>
                        {active && <ChevronRight className="h-3 w-3 shrink-0 text-primary/60" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-3 shrink-0 space-y-1">
        <Link
          href="/profile"
          onClick={onNavClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
        >
          <UserAvatar
            src={userInfo?.profilePicture}
            firstName={userInfo?.firstName}
            lastName={userInfo?.lastName}
            username={username}
            size={30}
          />
          <div className="min-w-0 flex-1">
            <p className="font-body text-sm font-medium text-foreground truncate leading-none">
              {username}
            </p>
            <p className="font-body text-[11px] text-muted-foreground mt-0.5">Administrator</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-body"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

// ── AdminLayout ───────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser, isAdmin, userInfo } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!user || !isAdmin()) router.replace('/login');
  }, [user, isAdmin, router]);

  if (!user || !isAdmin()) return null;

  const subRoute = subRouteTitles.find((r) => r.match.test(pathname));
  const activeLink = allNavItems.find((l) => l.href && pathname.startsWith(l.href));

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearUser();
    router.push('/login');
  };

  const sidebarProps: SidebarContentProps = {
    pathname,
    username: user.username,
    userInfo: userInfo ?? null,
    onNavClick: () => {},
    onSignOut: handleSignOut,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card flex-col h-full">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-card border-r border-border flex flex-col z-10">
            <SidebarContent {...sidebarProps} onNavClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Topbar */}
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
                  <UserAvatar
                    src={userInfo?.profilePicture}
                    firstName={userInfo?.firstName}
                    lastName={userInfo?.lastName}
                    username={user.username}
                    size={32}
                  />
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
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <UserAvatar
                      src={userInfo?.profilePicture}
                      firstName={userInfo?.firstName}
                      lastName={userInfo?.lastName}
                      username={user.username}
                      size={36}
                    />
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
