'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Users, ShieldCheck, KeyRound, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@repo/ui';

const navLinks = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/roles', label: 'Roles', icon: ShieldCheck },
  { href: '/admin/permissions', label: 'Permissions', icon: KeyRound },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!user || !isAdmin()) {
      router.replace('/login');
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin()) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">H</span>
          </div>
          <span className="font-bold text-foreground text-lg">Hammer</span>
          <span className="ml-1 text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t p-4 space-y-2">
          <p className="text-xs text-muted-foreground truncate">
            Signed in as <span className="font-semibold text-foreground">{user.username}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              clearUser();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b bg-card px-6 flex items-center gap-2 shrink-0">
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            {navLinks.find((l) => pathname.startsWith(l.href))?.label ?? 'Admin'}
          </span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
