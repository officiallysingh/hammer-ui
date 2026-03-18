import { Gavel } from 'lucide-react';

const footerLinks = {
  Auctions: ['Live Now', 'Upcoming', 'Past Results', 'Categories'],
  Company: ['About Us', 'How It Works', 'Press', 'Careers'],
  Support: ['Help Center', 'Contact Us', 'Terms of Service', 'Privacy Policy'],
};

const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Gavel className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">
                HAM<span className="text-gradient-gold">MER</span>
              </span>
            </div>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              The premier destination for live auctions on rare art, antiques, watches, and luxury
              collectibles.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-body text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-body text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-muted-foreground">
            © 2026 Hammer Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Terms', 'Privacy', 'Cookies'].map((item) => (
              <a
                key={item}
                href="#"
                className="font-body text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
