'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, X } from 'lucide-react';

export default function PrivacyCookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem('careerform_privacy_consent');
      if (!consented) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('careerform_privacy_consent', 'accepted_2026');
    } catch {
      // Ignore localStorage errors
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="privacy-cookie-consent-dock"
      role="region"
      aria-label="Privacy and Cookie Consent Notice"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(9, 14, 26, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.65)',
        padding: '12px 24px',
        animation: 'slideUpConsent 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#CBD5E1',
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            CareerForm PH adheres to the <strong>Data Privacy Act of 2012 (RA 10173)</strong>. We use local device storage and essential session telemetry to render real-time PDS mirrors privately without sending your personal data to remote servers. By continuing to use this service or closing this notice, you consent to our practices.{' '}
            <Link
              href="/about#privacy"
              style={{
                color: '#38BDF8',
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleAccept}
            className="btn btn-primary"
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
            }}
          >
            <Check size={14} /> Accept &amp; Continue
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss consent notice"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUpConsent {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
