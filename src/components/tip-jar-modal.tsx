'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`dswd-translucent-donate-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Support Developer / Donate"
        className="dswd-donate-btn"
        title="Support Developer — Help maintain this site and continuous updates"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          height: '44px',
          padding: isHovered ? '0 18px 0 12px' : '0 16px 0 12px',
          borderRadius: '999px',
          backgroundColor: isHovered ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: isHovered
            ? '1.5px solid rgba(56, 189, 248, 0.85)'
            : '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: isHovered
            ? '0 0 24px rgba(56, 189, 248, 0.45), 0 8px 25px rgba(0, 0, 0, 0.6)'
            : '0 4px 15px rgba(0, 0, 0, 0.35)',
          cursor: 'pointer',
          color: '#F8FAFC',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isHovered ? 'translateY(-2px) scale(1.03)' : 'none',
        }}
      >
        {/* Animated Icon: Heart pulses by default, switches to ZeticUZ logo on hover */}
        <div className="dswd-icon-capsule">
          <div className="icon-heart-wrap">
            <Heart
              size={15}
              style={{
                color: '#EF4444',
                fill: '#EF4444',
                animation: 'dswdHeartPulse 2.2s infinite ease-in-out',
              }}
            />
          </div>
          <div className="icon-zeticuz-wrap">
            <Image
              src="/brand/zeticuz-logo.svg"
              alt="ZeticUZ Logo"
              width={22}
              height={22}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          </div>
        </div>

        {/* DSWD-Style Translucent Button Typography */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="dswd-btn-title-default">
            DONATE / SUPPORT
          </span>
          <span className="dswd-btn-title-hover">
            ZETICUZ SUPPORT
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: 'rgba(148, 163, 184, 0.85)',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            Maintain Free Updates
          </span>
        </div>
      </button>

      <style jsx global>{`
        .dswd-icon-capsule {
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          overflow: hidden;
          flex-shrink: 0;
        }
        .icon-heart-wrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.25s ease, transform 0.25s ease;
          opacity: 1;
          transform: scale(1);
        }
        .icon-zeticuz-wrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform: scale(0.5) rotate(-20deg);
        }
        .dswd-donate-btn:hover .dswd-icon-capsule {
          background: rgba(56, 189, 248, 0.25);
        }
        .dswd-donate-btn:hover .icon-heart-wrap {
          opacity: 0;
          transform: scale(0.4);
        }
        .dswd-donate-btn:hover .icon-zeticuz-wrap {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .dswd-btn-title-default {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #F1F5F9;
          line-height: 1.1;
          display: block;
        }
        .dswd-btn-title-hover {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #38BDF8;
          line-height: 1.1;
          display: none;
        }
        .dswd-donate-btn:hover .dswd-btn-title-default {
          display: none;
        }
        .dswd-donate-btn:hover .dswd-btn-title-hover {
          display: block;
        }
        @keyframes dswdHeartPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
