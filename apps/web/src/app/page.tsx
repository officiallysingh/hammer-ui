import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@repo/ui';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">H</span>
            </div>
            <span className="text-lg font-bold text-foreground">Hammer</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-foreground">Live Auctions</h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-lg">
            Discover exclusive auctions and place your bids on premium items
          </p>
          <div className="mt-6 flex gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Start Bidding</Link>
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Local image */}
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <Image
              src="/auction.jpg"
              alt="Auction"
              width={500}
              height={300}
              className="rounded-lg"
            />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Vintage Car Auction</h2>
            <p className="text-muted-foreground">Starting at $50,000</p>
          </div>

          {/* Remote image */}
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
              alt="People bidding"
              width={500}
              height={300}
              className="rounded-lg"
            />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Luxury Property Auction</h2>
            <p className="text-muted-foreground">Live bidding in progress</p>
          </div>
        </div>

        {/* Auction items list */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-card shadow-sm border flex items-center justify-center text-muted-foreground"
            >
              Auction item #{i + 1}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-muted-foreground text-sm">
          <p>2026 Hammer Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
