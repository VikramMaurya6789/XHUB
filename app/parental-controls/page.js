import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import ParentalControlsClient from '@/components/ParentalControlsClient';
import { ShieldCheckIcon } from '@/components/Icons';

export const metadata = {
  title: 'Parental Controls & RTA Label — XHUB',
  description: 'Information regarding parental control tools, filtering software, and the Restricted To Adults (RTA) label on XHUB.',
};

export default function ParentalControlsPage() {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheckIcon size={24} className="section-heading-icon" />
            <span>Parental Controls & RTA Notice</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
            XHUB strictly adheres to industry standards to prevent minors from accessing adult content. We provide metadata labels and encourage the use of parental filtering tools.
          </p>
        </div>

        <ParentalControlsClient />

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
              Restricted To Adults (RTA) Website Label
            </h2>
            <p>
              XHUB incorporates the Restricted To Adults (RTA) electronic label across all HTML headers and metadata. The RTA label is a recognized classification tag supported by parental control software, browser extensions, and network filters to universally block access to adult materials.
            </p>
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--brand)',
              marginTop: '0.5rem'
            }}>
              &lt;meta name="RATING" content="RTA-5042-1996-1400-1577-RTA" /&gt;
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Recommended Filtering Software
            </h2>
            <p style={{ marginBottom: '0.75rem' }}>
              Parents and guardians wishing to block access to this and other adult-oriented sites can utilize filtering software and DNS-level blocks:
            </p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong style={{ color: '#fff' }}>CleanBrowsing DNS:</strong> Free family filtering DNS service (185.228.168.168) that blocks adult content network-wide.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Cloudflare 1.1.1.1 for Families:</strong> DNS-level blocking of adult domains (1.1.1.3).
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Net Nanny / Qustodio / Bark:</strong> Comprehensive parental control applications for mobile and desktop devices.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Operating System Controls:</strong> Apple Screen Time (iOS/macOS) and Microsoft Family Safety (Windows).
              </li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Reporting Inappropriate Access
            </h2>
            <p>
              If you have questions or need assistance configuring filters for devices under your control, please contact our support desk via our contact portal or by emailing our designated compliance team.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
