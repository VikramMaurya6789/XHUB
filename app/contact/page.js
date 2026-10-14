'use client';
import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import { FlagIcon, CheckIcon } from '@/components/Icons';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'support', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSent(true);
  };

  return (
    <>
      <AgeGate />
      <Header />
      <main className="page-wrapper" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Contact Us & Support
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Have questions, technical issues, or feedback regarding XHUB? Fill out the form below or consult our quick assistance options.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>Content Removal</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Expedited copyright and personal privacy takedown requests.</p>
            <Link href="/dmca" className="filter-pill-btn active" style={{ display: 'inline-block', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
              DMCA Removal Form →
            </Link>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>Parental Controls</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Information on blocking adult content with RTA labels and DNS filters.</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>RTA-5042-1996 Compatible</span>
          </div>
        </div>

        {sent ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'var(--success)', color: '#000', marginBottom: '1rem' }}>
              <CheckIcon size={24} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
              Message Received
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
              Thank you for contacting XHUB. We will review your message promptly.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
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
                  Your Email *
                </label>
                <input
                  type="email"
                  required
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
                  Subject
                </label>
                <select
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="support">Technical Support</option>
                  <option value="feedback">Site Feedback / Feature Request</option>
                  <option value="advertising">Advertising Inquiries</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
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

              <button
                type="submit"
                className="filter-pill-btn active"
                style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 800 }}
              >
                Send Message
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
