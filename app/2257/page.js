import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';

export const metadata = {
  title: '18 U.S.C. 2257 Compliance — XHUB',
  description: '18 U.S.C. Section 2257 and 28 C.F.R. Part 75 record-keeping compliance statement for XHUB.',
};

export default function Compliance2257Page() {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
          18 U.S.C. § 2257 Record-Keeping Compliance Statement
        </h1>
        <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p>
            All visual depictions of actual or simulated sexually explicit conduct appearing on this website comply with the record-keeping provisions of 18 U.S.C. § 2257 and 28 C.F.R. Part 75.
          </p>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Original Content & Performers</h2>
            <p>
              All models, actors, and performers appearing in any visual depiction on this website were 18 years of age or older at the time of the creation of the depiction. Proof of age and photographic identification records are maintained by the respective original producers, studios, and copyright holders.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Aggregator & Discovery Index</h2>
            <p>
              XHUB operates strictly as an automated catalog, search engine, and aggregator of publicly available streams and embed sources. XHUB is not the primary producer of the visual depictions found on this site. For each video, the primary custodian of records is the producer or distributor identified in the video metadata or uploader credits.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Custodian of Records Inquiry</h2>
            <p>
              For inquiries regarding the records custodian for any specific title or scene indexed on XHUB, please direct requests to our legal compliance desk via our <a href="/dmca" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>Content Removal / DMCA Portal</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
