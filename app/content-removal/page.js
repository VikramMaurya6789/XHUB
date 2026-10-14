'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FlagIcon, CheckIcon } from '@/components/Icons';

export default function ContentRemovalPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    url: '',
    reason: 'copyright',
    details: '',
    confirmed: false
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.url || !formData.confirmed) {
      alert('Please fill out all required fields and check the confirmation box.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FlagIcon size={24} className="section-heading-icon" />
            <span>Content Removal Request</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
            XHUB operates an expedited review system for copyright takedowns, privacy violations, impersonation, and non-consensual material. Legitimate removal requests are prioritized and processed within 24 business hours.
          </p>
        </div>

        {submitted ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '10px',
            padding: '2.5rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'var(--success)', color: '#000', marginBottom: '1rem' }}>
              <CheckIcon size={28} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Removal Notice Received
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto' }}>
              Your notice regarding <strong>{formData.url}</strong> has been logged into our compliance queue. Our Trust & Safety team will review and take appropriate action. Confirmation has been sent to <strong>{formData.email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@rightsowner.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Reason for Removal *
              </label>
              <select
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="copyright">Copyright Infringement (DMCA)</option>
                <option value="privacy">Privacy Violation / Image Rights</option>
                <option value="nonconsensual">Non-Consensual Imagery</option>
                <option value="impersonation">Defamation / Impersonation</option>
                <option value="other">Other Legal Concern</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Exact Video or Page URL *
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
                  padding: '0.75rem 1rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Explanation and Proof of Ownership
              </label>
              <textarea
                rows={4}
                placeholder="Provide details identifying yourself as the authorized rights holder or depictor..."
                value={formData.details}
                onChange={e => setFormData({ ...formData, details: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                required
                checked={formData.confirmed}
                onChange={e => setFormData({ ...formData, confirmed: e.target.checked })}
                style={{ marginTop: '0.2rem' }}
              />
              <span style={{ fontSize: '0.825rem', color: 'var(--text-2)', lineHeight: '1.5' }}>
                I swear, under penalty of perjury, that I am the authorized copyright holder or depictor, and the information provided in this notice is accurate.
              </span>
            </label>

            <button
              type="submit"
              className="filter-pill-btn active"
              style={{
                padding: '0.8rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Submit Content Removal Request
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
