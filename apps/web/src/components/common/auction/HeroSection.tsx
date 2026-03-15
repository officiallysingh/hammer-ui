import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden pt-16">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-body text-xs font-medium tracking-wider text-primary uppercase">
                Live Auctions Now
              </span>
            </div>

            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
              Discover &<br />
              <span className="text-gradient-gold">Bid on</span>
              <br />
              Rare Treasures
            </h1>

            <p className="mt-6 max-w-md font-body text-lg leading-relaxed text-muted-foreground">
              Experience the thrill of live auctions. Bid on curated collections of art, antiques,
              watches, and luxury items from around the world.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="gold" size="lg" className="gap-2 text-base">
                Explore Auctions
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="gold-outline" size="lg" className="text-base">
                Learn More
              </Button>
            </div>

            <div className="mt-12 flex gap-12">
              {[
                { value: '12K+', label: 'Active Bidders' },
                { value: '$48M', label: 'Total Sales' },
                { value: '2.5K', label: 'Items Sold' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="font-body text-xs text-muted-foreground tracking-wider uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <FeaturedAuctionCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeaturedAuctionCard = () => {
  return (
    <div className="relative rounded-2xl border border-border bg-gradient-card p-1 shadow-card">
      <div className="overflow-hidden rounded-xl">
        <Image
          src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=500&fit=crop"
          alt="Featured auction artwork"
          width={600}
          height={500}
          className="h-[420px] w-full object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-emerald/10 px-3 py-1 font-body text-xs font-medium text-emerald">
            ● Live Now
          </span>
          <span className="font-body text-sm text-muted-foreground">Ends in 2h 34m</span>
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold text-foreground">
          Abstract Composition No. 7
        </h3>
        <p className="mt-1 font-body text-sm text-muted-foreground">Modern Art Collection</p>
        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
              Current Bid
            </p>
            <p className="font-display text-2xl font-bold text-primary">$14,500</p>
          </div>
          <Button variant="gold" size="sm">
            Place Bid
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
