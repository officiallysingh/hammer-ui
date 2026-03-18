'use client';

import { Toaster } from '@repo/ui';
import AuctionNavbar from '@/components/common/auction/AuctionNavbar';
import HeroSection from '@/components/common/auction/HeroSection';
import AuctionGrid from '@/components/common/auction/AuctionGrid';
import SiteFooter from '@/components/common/SiteFooter';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuctionNavbar />
      <main className="flex-1">
        <HeroSection />
        <AuctionGrid />
      </main>
      <SiteFooter />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
