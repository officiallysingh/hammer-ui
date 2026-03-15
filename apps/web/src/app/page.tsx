'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@repo/ui';
import { useAuthStore } from '@/store/authStore';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Home() {
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">H</span>
            </div>
            <span className="text-lg font-bold text-foreground">Hammer</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[140px]">
                  {displayName}
                </span>
                {isAdmin() && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/users">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <section className="flex flex-col items-center justify-center text-center pt-4">
          {isLoggedIn && (
            <p className="text-muted-foreground mb-2 text-lg">
              Welcome back,{' '}
              <span className="font-semibold text-foreground">
                {userInfo?.firstName ?? user?.username}
              </span>
            </p>
          )}
          <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl">
            Live Auctions
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-lg leading-relaxed">
            Discover exclusive auctions and place your bids on premium items.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {isLoggedIn ? (
              <Button size="lg" asChild>
                <Link href="/">Browse Auctions</Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/signup">Start Bidding</Link>
              </Button>
            )}
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="aspect-video bg-muted relative">
              <Image
                src="/auction.jpg"
                alt="Auction"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-foreground">Vintage Car Auction</h2>
              <p className="text-muted-foreground text-sm mt-1">Starting at $50,000</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="aspect-video bg-muted relative">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
                alt="People bidding"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-foreground">Luxury Property Auction</h2>
              <p className="text-muted-foreground text-sm mt-1">Live bidding in progress</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Featured items</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-card border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <span className="text-muted-foreground">Auction item #{i + 1}</span>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-muted-foreground text-sm">
          <p>© 2026 Hammer Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
