import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';

export default function TermsPage() {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
          Terms & Conditions of Use
        </h1>
        <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p>
            <strong>Effective Date: October 2026</strong>
          </p>
          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>1. Age Requirement & Adult Consent</h2>
            <p>
              By accessing XHUB, you affirm and warrant that you are at least 18 years of age (or the age of majority in your jurisdiction) and that viewing sexually explicit material is legal in the community from which you access this site.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>2. Nature of Service</h2>
            <p>
              XHUB acts as an automated search, discovery, and index engine aggregating publicly accessible media feeds and stream identifiers from third-party content delivery networks. XHUB does not host, encode, or store unauthorized media files on its servers.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>3. User Conduct & Prohibited Material</h2>
            <p>
              XHUB maintains a strict zero-tolerance policy against non-consensual sexual content, underage depictions, and hate speech. Any such content reported via our DMCA/Removal portal is de-indexed expeditiously.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>4. Disclaimer of Warranties</h2>
            <p>
              The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. XHUB shall not be liable for any indirect, incidental, or consequential damages resulting from the use of this website.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
