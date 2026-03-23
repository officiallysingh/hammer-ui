import AuctionNavbar from '@/components/common/auction/AuctionNavbar';
import SiteFooter from '@/components/common/SiteFooter';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuctionNavbar />
      <main className="min-h-screen pt-16 bg-background">{children}</main>
      <SiteFooter />
    </>
  );
}
