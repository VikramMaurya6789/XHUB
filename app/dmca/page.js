'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FlagIcon, CheckIcon } from '@/components/Icons';

export default function DmcaPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    url: '',
    description: '',
    confirmed: false
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.url || !formData.confirmed) {
      alert('Please fill out all required fields and verify the legal confirmation.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FlagIcon size={24} className="section-heading-icon" />
            <span>DMCA Copyright & Content Removal Request</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
            XHUB complies with 17 U.S.C. § 512 and the Digital Millennium Copyright Act (DMCA). It is our policy to respond to any infringement notices and take appropriate actions under the DMCA and other applicable intellectual property laws.
          </p>
        </div>

        {submitted ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'var(--success)', color: '#000', marginBottom: '1rem' }}>
              <CheckIcon size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Takedown Request Submitted
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto' }}>
              Your notice regarding <strong>{formData.url}</strong> has been logged. Our designated DMCA agent reviews notices within 24 to 48 hours for immediate de-indexing.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '2rem'
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
              Submit an Expedited Notice
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Your Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Studio Representative"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Contact Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="legal@yourdomain.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Exact Video URL(s) to Remove *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xhub-rouge.vercel.app/watch/..."
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Details of Infringement or Removal Reason
                </label>
                <textarea
                  rows={4}
                  placeholder="Please state whether you are the copyright owner, depicted individual, or authorized legal representative."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.825rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  required
                  checked={formData.confirmed}
                  onChange={e => setFormData({ ...formData, confirmed: e.target.checked })}
                  style={{ marginTop: '0.2rem', accentColor: 'var(--brand)' }}
                />
                <span>
                  I swear, under penalty of perjury, that I am the owner or authorized agent of the copyright or privacy rights of the material described above, and that the information in this notification is accurate.
                </span>
              </label>

              <button
                type="submit"
                className="filter-pill-btn active"
                style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 800, marginTop: '0.5rem' }}
              >
                Submit Takedown Notice
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
