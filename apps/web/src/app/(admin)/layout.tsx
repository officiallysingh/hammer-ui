'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
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
  FileText,
  Gavel,
  Puzzle,
  Building2,
  MapPinned,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui';
import { authApi } from '@repo/api';
import { ThemeToggle } from '@/components/common/Header/ThemeToggle';
import { UserAvatar } from '@/components/common/admin/UserAvatar';

// ── Nav structure ─────────────────────────────────────────────────────────────

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
    label: 'Master Data',
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
    label: 'Templates',
    items: [
      {
        href: '/admin/metadata/components',
        label: 'Components',
        icon: Puzzle,
        description: 'Reusable property groups',
      },
      {
        href: '/admin/metadata/listing-catalogs',
        label: 'Listing Catalogs',
        icon: Database,
        description: 'Listing property templates',
      },
      {
        href: '/admin/metadata/custom-forms',
        label: 'Custom Forms',
        icon: FileText,
        description: 'Auction workflow step form templates',
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
  {
    match: /\/admin\/metadata\/listing-catalogs\/new$/,
    label: 'New listing catalog',
    description: 'Create a listing catalog template',
  },
  {
    match: /\/admin\/metadata\/listing-catalogs\/.+\/edit$/,
    label: 'Edit listing catalog',
    description: 'Update listing catalog template',
  },
  {
    match: /\/admin\/metadata\/custom-forms\/new$/,
    label: 'New custom form',
    description: 'Create a custom form template',
  },
  {
    match: /\/admin\/metadata\/custom-forms\/.+\/edit$/,
    label: 'Edit custom form',
    description: 'Update custom form template',
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
  {
    match: /\/admin\/auctions\/.+\/view$/,
    label: 'View auction',
    description: 'Auction details & policy workflow',
  },
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

// ── SidebarContent ────────────────────────────────────────────────────────────
interface SidebarContentProps {
  pathname: string;
  username: string;
  userInfo: { firstName?: string; lastName?: string; profilePicture?: string | null } | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavClick: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  pathname,
  username,
  userInfo,
  collapsed = false,
  onToggleCollapse,
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
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    Admin Portal
                  </span>
                </div>
              </>
            )}
          </Link>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
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

// ── AdminLayout ───────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser, isAdmin, userInfo } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed, closeSidebar } =
    useUIStore();

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
    collapsed: sidebarCollapsed,
    onToggleCollapse: toggleSidebarCollapsed,
    onNavClick: () => {},
    onSignOut: handleSignOut,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full border-r border-border bg-card shrink-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />
          <aside className="relative w-72 bg-card border-r border-border flex flex-col z-10 shadow-2xl">
            <SidebarContent {...sidebarProps} collapsed={false} onNavClick={closeSidebar} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent"
              onClick={toggleSidebar}
              aria-label="Toggle mobile sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-body text-sm font-semibold text-foreground">
                  {subRoute?.label ?? activeLink?.label ?? 'Admin Portal'}
                </h2>
              </div>
              <p className="font-body text-[11px] text-muted-foreground hidden sm:block">
                {subRoute?.description ?? activeLink?.description ?? 'Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-accent transition-colors outline-none border border-border/40">
                  <UserAvatar
                    src={userInfo?.profilePicture}
                    firstName={userInfo?.firstName}
                    lastName={userInfo?.lastName}
                    username={user.username}
                    size={30}
                  />
                  <div className="hidden sm:flex flex-col items-start min-w-0">
                    <span className="font-body text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">
                      {user.username}
                    </span>
                    <span className="font-body text-[10px] font-medium text-muted-foreground leading-none mt-1">
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
