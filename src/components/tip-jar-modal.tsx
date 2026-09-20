'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Heart, ExternalLink, Sparkles } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  sublabel: string;
  value: string;
  link?: string;
  copyValue: string;
}

const CHANNELS: Channel[] = [
  {
    id: 'wise',
    name: 'Wise',
    badge: 'Wise',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    sublabel: 'Send money',
    value: 'https://wise.com/pay/me/samfaussaidzahranp',
    link: 'https://wise.com/pay/me/samfaussaidzahranp',
    copyValue: 'https://wise.com/pay/me/samfaussaidzahranp',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    badge: 'PayPal',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    sublabel: 'paypal.me/zeticuz',
    value: 'https://www.paypal.me/zeticuz',
    link: 'https://www.paypal.me/zeticuz',
    copyValue: 'https://www.paypal.me/zeticuz',
  },
  {
    id: 'gotyme',
    name: 'GoTyme Bank (PH)',
    badge: 'GoTyme',
    badgeColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    sublabel: 'Account Name: Sam Pangilinan',
    value: '017219868407',
    copyValue: '017219868407',
  },
  {
    id: 'gcash',
    name: 'GCash',
    badge: 'GCash',
    badgeColor: '#0ea5e9',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    sublabel: 'Mobile number',
    value: '09245422533',
    copyValue: '09245422533',
  },
  {
    id: 'buymeacoffee',
    name: 'Buy Me a Coffee',
    badge: 'Stripe',
    badgeColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    sublabel: 'buymeacoffee.com/zeticuz',
    value: 'https://buymeacoffee.com/zeticuz',
    link: 'https://buymeacoffee.com/zeticuz',
    copyValue: 'https://buymeacoffee.com/zeticuz',
  },
  {
    id: 'binance',
    name: 'Binance',
    badge: 'Binance',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    sublabel: 'ID',
    value: '1172959541',
    copyValue: '1172959541',
  },
];

export default function TipJarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hue1, setHue1] = useState(270);
  const [hue2, setHue2] = useState(180);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Smooth auto-color cycling inspired by CodePen NPxxyRX
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setHue1((prev) => (prev + 3) % 360);
      setHue2((prev) => (prev + 2.5) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, [open]);

  const handleCopy = (channel: Channel) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(channel.copyValue);
      setCopiedId(channel.id);
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="tip-jar-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* CodePen NPxxyRX Inspired Neon Glow Border Box */}
      <div
        className="tip-jar-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          backgroundColor: '#070a13',
          borderRadius: '24px',
          position: 'relative',
          padding: '24px 22px',
          overflowY: 'auto',
          boxShadow: `
            0 0 0 1.5px hsla(${hue1}, 95%, 65%, 0.8),
            0 0 25px hsla(${hue1}, 90%, 60%, 0.35),
            0 0 60px hsla(${hue2}, 90%, 55%, 0.2),
            0 24px 64px rgba(0, 0, 0, 0.8)
          `,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'box-shadow 0.15s ease',
        }}
      >
        {/* Dynamic color ambient line top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20px',
            right: '20px',
            height: '2px',
            background: `linear-gradient(90deg, hsl(${hue1}, 100%, 70%), hsl(${hue2}, 100%, 70%))`,
            borderRadius: '2px',
            filter: 'blur(0.5px)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 9px',
                borderRadius: '999px',
                background: `hsla(${hue1}, 80%, 60%, 0.15)`,
                border: `1px solid hsla(${hue1}, 80%, 60%, 0.3)`,
                color: `hsl(${hue1}, 90%, 75%)`,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}
            >
              <Heart size={12} fill="currentColor" /> SUPPORT CREATOR
            </div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: 0,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              Tip Jar
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tip Jar"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Caption matching user requirement */}
        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.6,
            color: '#94a3b8',
            margin: '0 0 20px 0',
          }}
        >
          CareerForm PH is free and 100% ad-free. If you&apos;d like to support hosting + the server bill and continuous updates, we would love your support on any amount to one of the channels below. Tap an address to copy it, or tap a link to open it.
        </p>

        {/* Channel Cards (Matching User Images 3 & 4) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CHANNELS.map((ch) => {
            const isCopied = copiedId === ch.id;
            return (
              <div
                key={ch.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: ch.badgeColor,
                        backgroundColor: ch.badgeBg,
                      }}
                    >
                      {ch.badge}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {ch.name}
                        {ch.link && (
                          <a
                            href={ch.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#64748b' }}
                            title="Open in new tab"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                        {ch.sublabel}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(ch)}
                    style={{
                      background: isCopied ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                      color: isCopied ? '#ffffff' : '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Value Box */}
                <div
                  onClick={() => handleCopy(ch)}
                  title="Click to copy"
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    color: '#94a3b8',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'all',
                  }}
                >
                  {ch.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div
          style={{
            marginTop: '18px',
            textAlign: 'center',
            fontSize: '11.5px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={13} style={{ color: `hsl(${hue1}, 90%, 70%)` }} />
          <span>Thank you for supporting Filipino developers & public servants!</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Circular Glowing Tip Jar Trigger Button (Matching User Image 2: media_1789886788860.png)
 * Features glowing purple circular ring with tip jar icon and tooltip caption.
 */
export function TipJarButton({
  onClick,
  className = '',
  style = {},
}: {
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`tip-jar-btn-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Support Developer Tip Jar"
        className="tip-jar-circle-btn"
        title="Support Developer — Help maintain this site and regular updates"
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#0a0d17',
          border: '2px solid #8b5cf6',
          boxShadow: `
            0 0 16px rgba(139, 92, 246, 0.65),
            0 0 32px rgba(139, 92, 246, 0.35),
            inset 0 0 12px rgba(139, 92, 246, 0.4)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#e2e8f0',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.12)';
          e.currentTarget.style.boxShadow =
            '0 0 24px rgba(139, 92, 246, 0.9), 0 0 44px rgba(139, 92, 246, 0.5), inset 0 0 16px rgba(139, 92, 246, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 0 16px rgba(139, 92, 246, 0.65), 0 0 32px rgba(139, 92, 246, 0.35), inset 0 0 12px rgba(139, 92, 246, 0.4)';
        }}
      >
        {/* SVG Tip Jar with $ sign matching Image 2 */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Jar Lid */}
          <path d="M7 3h10a1 1 0 0 1 1 1v1H6V4a1 1 0 0 1 1-1z" />
          {/* Jar Body */}
          <path d="M6 7h12c.55 0 1 .45.9 1l-1.1 11.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5L5.1 8c-.1-.55.35-1 .9-1z" />
          {/* Dollar Sign */}
          <path d="M12 10v6" />
          <path d="M13.5 11.5a1.5 1.5 0 0 0-3 0c0 1.5 3 1.5 3 3a1.5 1.5 0 0 1-3 0" />
        </svg>
      </button>
    </div>
  );
}
