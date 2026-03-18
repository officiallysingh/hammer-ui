'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gavel, Search, Bell, User, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Button } from '@repo/ui';
import { useAuthStore } from '@/store/authStore';

const navLinks = [
  { label: 'Live Auctions', href: '#auctions' },
  { label: 'Upcoming', href: '#upcoming' },
  { label: 'Categories', href: '#categories' },
  { label: 'How It Works', href: '#how-it-works' },
];

const AuctionNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { user, userInfo, clearUser, isAdmin } = useAuthStore();
  const isLoggedIn = !!user?.authenticated;
  const displayName = userInfo?.firstName
    ? `${userInfo.firstName}${userInfo.lastName ? ` ${userInfo.lastName}` : ''}`
    : (user?.username ?? 'User');

  const handleSignOut = () => {
    clearUser();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Gavel className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold tracking-wide text-foreground">
            HAM<span className="text-gradient-gold">MER</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-body text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Search className="h-5 w-5" />
          </Button>
          {isLoggedIn ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
              >
                <Bell className="h-5 w-5" />
              </Button>
              {isAdmin() && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/users">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <div className="flex items-center gap-2 pl-1 border-l border-border ml-1">
                <span className="text-sm text-muted-foreground hidden lg:inline truncate max-w-[120px]">
                  {displayName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Sign out</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="gold" size="sm" className="gap-1.5" asChild>
                <Link href="/signup">
                  <User className="h-4 w-4" />
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block font-body text-sm text-muted-foreground hover:text-primary transition-colors py-1.5"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="text-foreground font-medium">{displayName}</span>
                </p>
                {isAdmin() && (
                  <Button variant="outline" size="sm" asChild className="w-full justify-start">
                    <Link href="/admin/users" onClick={() => setMobileOpen(false)}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="gold" size="sm" asChild className="w-full">
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AuctionNavbar;
