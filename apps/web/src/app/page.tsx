'use client';

import Image from 'next/image';

import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">Live Auctions</h1>
        <Button className="mt-6" variant="outline" onClick={() => alert('Let\'s start bidding!')}>Let's start bidding!</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Local image */}
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <Image
            src="/auction.jpg"
            alt="Auction"
            width={500}
            height={300}
            className="rounded-lg"
          />
          <h2 className="mt-4 text-lg font-semibold">Vintage Car Auction</h2>
          <p className="text-gray-500">Starting at $50,000</p>
        </div>

        {/* Remote image */}
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
            alt="People bidding"
            width={500}
            height={300}
            className="rounded-lg"
          />
          <h2 className="mt-4 text-lg font-semibold">Luxury Property Auction</h2>
          <p className="text-gray-500">Live bidding in progress</p>
        </div>
      </div>

      {/* Force scroll */}
      <div className="space-y-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-white shadow-sm border flex items-center justify-center text-gray-400"
          >
            Auction item #{i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
