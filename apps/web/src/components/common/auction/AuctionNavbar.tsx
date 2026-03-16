import { Gavel, Search, Bell, User } from 'lucide-react';
import { Button } from '@repo/ui';

const AuctionNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold tracking-wide text-foreground">
            HAM<span className="text-gradient-gold">MER</span>
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {['Live Auctions', 'Upcoming', 'Categories', 'How It Works'].map((item) => (
            <a
              key={item}
              href="#"
              className="font-body text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="gold" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default AuctionNavbar;
