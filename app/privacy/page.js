import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';

export default function PrivacyPage() {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
          Privacy Policy
        </h1>
        <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p>
            <strong>Effective Date: October 2026</strong>
          </p>
          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>1. Privacy-First Principles</h2>
            <p>
              XHUB is engineered with a strict privacy-first architecture. In v1, XHUB does not require registration, login credentials, or personal profiles. Your Watch Later, Favorites, and Watch History lists are stored strictly within your browser&apos;s local storage (<code style={{ color: 'var(--brand)' }}>localStorage</code>) and are never sent to or stored on our servers.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>2. Data Collection & Analytics</h2>
            <p>
              We do not utilize invasive third-party advertising cookies or cross-site tracking scripts. Server logs collect only minimal non-identifying telemetry (such as requested paths, HTTP status codes, and anonymized referral domains) strictly for security and performance optimization.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>3. Third-Party CDNs</h2>
            <p>
              When playing a video, video segments stream directly between your browser and authorized adult content delivery networks (e.g. RedTube, xhcdn). These CDNs handle media delivery under their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>4. Cookies & Age Gate</h2>
            <p>
              We use a single consent cookie (<code style={{ color: 'var(--brand)' }}>xhub_age_ok=1</code>) to remember your confirmation of being 18 years or older. This cookie contains no personal identifying information.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
