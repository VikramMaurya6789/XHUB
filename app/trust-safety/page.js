import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { ShieldCheckIcon } from '@/components/Icons';

export const metadata = {
  title: 'Trust & Safety — XHUB',
  description: 'Learn about XHUB policies on user safety, content moderation, 2257 record-keeping compliance, and zero-tolerance enforcement.',
};

export default function TrustAndSafetyPage() {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheckIcon size={24} className="section-heading-icon" />
            <span>Trust & Safety</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
            XHUB maintains a safe, legally compliant streaming platform. We enforce stringent policies regarding legal age, consensual participation, and intellectual property.
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          lineHeight: '1.7',
          color: 'var(--text-2)',
          fontSize: '0.9rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Zero Tolerance for Illegal Material
            </h2>
            <p>
              XHUB enforces an absolute zero-tolerance policy against Child Sexual Abuse Material (CSAM), non-consensual sexual content, revenge material, violence, and hate speech. Any detected violations result in instantaneous deletion, user/IP blacklisting, and immediate reports to the National Center for Missing & Exploited Children (NCMEC) and appropriate law enforcement authorities.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              18 U.S.C. 2257 Compliance
            </h2>
            <p>
              All video content hosted, embedded, or indexed on XHUB consists exclusively of consenting adults aged 18 years or older. Secondary producers and content providers maintain original records required under 18 U.S.C. § 2257 and 28 C.F.R. Part 75.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Rapid Reporting & Content Removal
            </h2>
            <p>
              Anyone depicted in any video who withdrew consent, or copyright holders whose rights have been infringed, can use our expedited <a href="/content-removal" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>Content Removal Request form</a> for priority removal within 24 hours.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Law Enforcement Cooperation
            </h2>
            <p>
              We cooperate fully with valid subpoenas, court orders, and law enforcement investigations concerning criminal activity, abuse, or identity theft. Law enforcement officials may contact legal@xhub.com.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
