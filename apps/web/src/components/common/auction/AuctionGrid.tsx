import { useState } from 'react';
import { motion } from 'framer-motion';
import AuctionCard, { type AuctionItem } from './AuctionCard';
import { AuctionSearchForm, type AuctionSearchValues } from './AuctionSearchForm';

const categories = ['All', 'Art', 'Watches', 'Jewelry', 'Antiques', 'Wine'];

const MOCK_ITEMS: AuctionItem[] = [
  {
    id: '1',
    title: 'Renaissance Oil Painting',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=500&h=400&fit=crop',
    currentBid: 8200,
    totalBids: 23,
    endsAt: new Date(Date.now() + 7200000),
    isLive: true,
  },
  {
    id: '2',
    title: 'Rolex Daytona 1969',
    category: 'Watches',
    image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=500&h=400&fit=crop',
    currentBid: 42000,
    totalBids: 56,
    endsAt: new Date(Date.now() + 3600000),
    isLive: true,
  },
  {
    id: '3',
    title: 'Art Deco Diamond Necklace',
    category: 'Jewelry',
    image: 'https://images.unsplash.com/photo-1515562141589-67f0d866d69b?w=500&h=400&fit=crop',
    currentBid: 15800,
    totalBids: 34,
    endsAt: new Date(Date.now() + 14400000),
    isLive: false,
  },
  {
    id: '4',
    title: 'Ming Dynasty Vase',
    category: 'Antiques',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&h=400&fit=crop',
    currentBid: 28500,
    totalBids: 18,
    endsAt: new Date(Date.now() + 5400000),
    isLive: true,
  },
  {
    id: '5',
    title: 'Château Margaux 1990',
    category: 'Wine',
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=500&h=400&fit=crop',
    currentBid: 3400,
    totalBids: 12,
    endsAt: new Date(Date.now() + 9000000),
    isLive: false,
  },
  {
    id: '6',
    title: 'Contemporary Sculpture',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=500&h=400&fit=crop',
    currentBid: 6700,
    totalBids: 9,
    endsAt: new Date(Date.now() + 18000000),
    isLive: false,
  },
];

const EMPTY_SEARCH: AuctionSearchValues = {
  phrase: '',
  category: 'All',
  fromDate: '',
  tillDate: '',
};

const AuctionGrid = () => {
  const [search, setSearch] = useState<AuctionSearchValues>(EMPTY_SEARCH);

  const filtered = MOCK_ITEMS.filter((item) => {
    if (search.category !== 'All' && item.category !== search.category) return false;
    if (search.phrase && !item.title.toLowerCase().includes(search.phrase.toLowerCase())) {
      return false;
    }
    if (search.fromDate && item.endsAt < new Date(search.fromDate)) return false;
    if (search.tillDate && item.endsAt > new Date(`${search.tillDate}T23:59:59`)) return false;
    return true;
  });

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Featured <span className="text-gradient-gold">Auctions</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-muted-foreground">
            Browse our curated selection of extraordinary items from around the globe.
          </p>
        </motion.div>

        <AuctionSearchForm categories={categories} onSearch={setSearch} />

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => (
              <AuctionCard key={item.id} item={item} index={i} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center font-body text-muted-foreground">
            No auctions match your search.
          </p>
        )}
      </div>
    </section>
  );
};

export default AuctionGrid;
