import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <Link href="/" className="logo-brand">
              <span className="logo-badge">X</span>
              <span className="logo-text">HUB</span>
            </Link>
            <p className="footer-tagline">
              The world&apos;s leading high-performance adult video discovery network. 100% free streaming with zero buffering.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Information</h4>
              <ul>
                <li><Link href="/terms">Terms &amp; Conditions</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/dmca">DMCA / Copyright</Link></li>
                <li><Link href="/2257">18 U.S.C. 2257 Record-Keeping</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Support &amp; Safety</h4>
              <ul>
                <li><Link href="/content-removal">Content Removal Request</Link></li>
                <li><Link href="/parental-controls">Parental Controls</Link></li>
                <li><Link href="/trust-safety">Trust &amp; Safety</Link></li>
                <li><Link href="/contact">Contact Support</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><Link href="/categories">All Categories</Link></li>
                <li><Link href="/best">Top Rated Videos</Link></li>
                <li><Link href="/creators">Verified Creators</Link></li>
                <li><Link href="/pornstars">Pornstars A-Z</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p className="footer-legal">
            <strong>RTA (Restricted To Adults)</strong> website. All actors appearing on this website were 18 years of age or older at the time of the creation of such depictions. All video data is indexed from open third-party CDN networks.
          </p>
          <p className="footer-copyright">
            © {currentYear} XHUB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
