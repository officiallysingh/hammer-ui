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
  Gavel,
  Menu,
  ChevronRight,
  Tag,
  ExternalLink,
  User,
  ChevronDown,
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
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
    ],
  },
];

// Flat list for topbar label lookup
const allNavItems = navGroups.flatMap((g) => g.items);

// Sub-route title overrides
const subRouteTitles: { match: RegExp; label: string; description: string }[] = [
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
];

interface SidebarContentProps {
  pathname: string;
  username: string;
  onNavClick: () => void;
  onSignOut: () => void;
}

function SidebarContent({ pathname, username, onNavClick, onSignOut }: SidebarContentProps) {
  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-border gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Gavel className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display font-bold text-foreground text-base">
            HAM<span className="text-gradient-gold">MER</span>
          </span>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
            Admin
          </span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 font-body text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, description }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
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

  const handleSignOut = () => {
    clearUser();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card flex-col">
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar — fixed within the main column */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
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
        </header>

        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
