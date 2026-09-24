'use client';

/**
 * Launch Builder — infinite card carousel launcher (CodePen xbOXxMV "Infinite Card Carousel").
 * The center card is active; clicking any tool card launches that tool directly.
 * Icons are the site's own tools (PDS Builder, Application Letter, WES, Gov Jobs,
 * Smart Import) drawn as inline SVG marks instead of the pen's original emoji set.
 * Motion honors prefers-reduced-motion (arrow keys still work; autoplay disabled).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CoverLetterSelectionModal from './cover-letter-selection-modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ToolId = 'pds' | 'letter' | 'wes' | 'jobs' | 'import';

interface Tool {
  id: ToolId;
  title: string;
  sub: string;
  href?: string;
  icon: React.ReactNode;
  accent: string;
}

/* ---------- Tool icon SVG marks (our tools) ---------- */

const PdsIcon = (
  <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M16 4C13.8 4 12 5.8 12 8V56C12 58.2 13.8 60 16 60H48C50.2 60 52 58.2 52 56V20L36 4H16Z" fill="white" />
    <path d="M36 4V20H52" fill="#d1d5db" />
    <rect x="18" y="27" width="28" height="3" rx="1.5" fill="#0f172a" />
    <rect x="18" y="34" width="28" height="3" rx="1.5" fill="#0f172a" />
    <rect x="18" y="41" width="28" height="3" rx="1.5" fill="#0f172a" />
    <rect x="18" y="48" width="18" height="3" rx="1.5" fill="#0f172a" />
    <rect x="38" y="46" width="9" height="7" rx="1.5" fill="#06b6d4" />
  </svg>
);

const LetterIcon = (
  <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M8 12C8 9.8 9.8 8 12 8H52C54.2 8 56 9.8 56 12V48C56 50.2 54.2 52 52 52H12C9.8 52 8 50.2 8 48V12Z" fill="white" />
    <path d="M8 12L32 30L56 12" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M8 48L24 32" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
    <path d="M56 48L40 32" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="36" r="6" fill="#ef4444" />
    <circle cx="32" cy="36" r="3.5" fill="#fca5a5" />
  </svg>
);

const WesIcon = (
  <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <polygon points="32,4 56,16 56,44 32,56 8,44 8,16" fill="white" />
    <rect x="18" y="38" width="8" height="6" rx="1" fill="#0f172a" />
    <rect x="28" y="30" width="8" height="14" rx="1" fill="#0f172a" />
    <rect x="38" y="22" width="8" height="22" rx="1" fill="#10b981" />
    <polygon points="42,12 43.5,16 48,16 44.5,19 46,23 42,20.5 38,23 39.5,19 36,16 40.5,16" fill="#0f172a" />
  </svg>
);

const JobsIcon = (
  <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <polygon points="32,6 6,20 58,20" fill="white" />
    <rect x="8" y="22" width="48" height="4" rx="1" fill="white" />
    <rect x="12" y="28" width="6" height="20" rx="1" fill="white" />
    <rect x="23" y="28" width="6" height="20" rx="1" fill="white" />
    <rect x="35" y="28" width="6" height="20" rx="1" fill="white" />
    <rect x="46" y="28" width="6" height="20" rx="1" fill="white" />
    <rect x="6" y="50" width="52" height="6" rx="2" fill="white" />
    <circle cx="48" cy="14" r="5" fill="#f59e0b" />
  </svg>
);

const ImportIcon = (
  <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M12 26C12 14.9 21 6 32 6C41.3 6 49.2 12.4 51.4 21.1C57.4 22.4 62 27.7 62 34C62 41.7 55.7 48 48 48H16C8.3 48 2 41.7 2 34C2 27.2 6.9 21.5 13.5 20.2C13 22 12.5 24 12 26Z" fill="white" />
    <path d="M32 18L44 32H36V46H28V32H20L32 18Z" fill="#0f172a" />
  </svg>
);

/* ---------- Tools (everything on our site) ---------- */

const TOOLS: Tool[] = [
  { id: 'pds', title: 'PDS Builder', sub: 'CS Form 212', href: '/builder', icon: PdsIcon, accent: '#38bdf8' },
  { id: 'letter', title: 'Application Letter', sub: 'Letter Studio', icon: LetterIcon, accent: '#f43f5e' },
  { id: 'wes', title: 'WES Builder', sub: 'Experience Sheet', href: '/wes', icon: WesIcon, accent: '#34d399' },
  { id: 'jobs', title: 'Gov Jobs PH', sub: 'Plantilla Vacancies', href: '/jobs', icon: JobsIcon, accent: '#f59e0b' },
  { id: 'import', title: 'Smart Import', sub: 'PDF / Excel / CSV', href: '/builder?action=import', icon: ImportIcon, accent: '#a78bfa' },
];

export default function ToolsSelectorModal({ open, onClose }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [letterModalOpen, setLetterModalOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // extended ring so the 5 tools loop seamlessly in both directions
  const RING = [...TOOLS, ...TOOLS, ...TOOLS];
  const CARD_W = 250;
  const CARD_GAP = 28;
  const STEP = CARD_W + CARD_GAP;

  const next = useCallback(() => setActive(a => (a + 1) % TOOLS.length), []);
  const prev = useCallback(() => setActive(a => (a - 1 + TOOLS.length) % TOOLS.length), []);

  const goTo = useCallback((tool: Tool) => {
    if (tool.id === 'letter') {
      setLetterModalOpen(true);
      return;
    }
    onClose();
    router.push(tool.href || '/builder');
  }, [onClose, router]);

  /* No autoplay: the ring only moves when the visitor picks an arrow or a card. */

  /* keyboard: arrows rotate, Escape closes */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, next, prev]);

  /* seamless loop: after settling, jump back into the middle copy without animation */
  useEffect(() => {
    if (!open) return;
    setActive(TOOLS.length + (active % TOOLS.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const startReduced = TOOLS.length; // first index of the middle copy

  const handleSettled = () => {
    if (active >= TOOLS.length * 2) setActive(active - TOOLS.length);
    else if (active < TOOLS.length) setActive(active + TOOLS.length);
  };

  const ringIndex = active;
  const offset = -ringIndex * STEP;

  return (
    <>
      <div
        className="modal-backdrop nd-backdrop floating-backdrop-enter"
        style={{
          zIndex: 9998,
          backgroundColor: 'rgba(2, 6, 16, 0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '6px', maxWidth: 640 }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#38bdf8',
              margin: '0 0 8px',
            }}
          >
            ✦ CareerForm Toolkit
          </p>
          <h2
            id="tools-selector-title"
            style={{
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
              color: '#ffffff',
            }}
          >
            Launch Builder
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
            Every tool on our site, one launcher. Pick a card to start — everything runs privately in your browser.
          </p>
        </div>

        {/* Carousel viewport */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Launch a CareerForm tool"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '980px',
            height: '330px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* edge fade masks */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 3,
              background:
                'linear-gradient(90deg, #020617 0%, rgba(2,6,23,0) 18%, rgba(2,6,23,0) 82%, #020617 100%)',
            }}
          />

          <div
            ref={trackRef}
            style={{
              display: 'flex',
              gap: CARD_GAP + 'px',
              alignItems: 'center',
              transform: `translateX(calc(50% - ${CARD_W / 2}px + ${offset}px))`,
              transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
            onTransitionEnd={handleSettled}
          >
            {RING.map((tool, i) => {
              const isActive = i === ringIndex;
              return (
                <button
                  key={`${tool.id}-${i}`}
                  type="button"
                  aria-label={`Open ${tool.title}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => (isActive ? goTo(tool) : setActive(i % TOOLS.length + TOOLS.length))}
                  className="codepen-tool-btn"
                  style={{
                    flex: '0 0 auto',
                    width: CARD_W + 'px',
                    height: '240px',
                    borderRadius: '20px',
                    border: `1px solid ${isActive ? tool.accent : 'rgba(255,255,255,0.09)'}`,
                    background:
                      'linear-gradient(180deg, rgba(30,34,42,0.96) 0%, rgba(18,20,26,0.98) 100%)',
                    boxShadow: isActive
                      ? `0 18px 50px rgba(0,0,0,0.6), 0 0 32px ${tool.accent}33`
                      : '0 8px 22px rgba(0,0,0,0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1)' : 'scale(0.82)',
                    opacity: Math.abs(i - ringIndex) > 2 ? 0 : 1,
                    transition:
                      'transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.55s, box-shadow 0.4s, border-color 0.4s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* accent glow bar */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '20%',
                      right: '20%',
                      height: '3px',
                      borderRadius: '0 0 6px 6px',
                      background: tool.accent,
                      opacity: isActive ? 1 : 0.25,
                      transition: 'opacity 0.4s',
                    }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', filter: isActive ? 'drop-shadow(0 6px 18px rgba(0,0,0,0.5))' : 'grayscale(0.4) opacity(0.75)', transition: 'filter 0.4s' }}>
                    {tool.icon}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', textAlign: 'center' }}>
                    {tool.title}
                  </span>
                  <span style={{ fontSize: '11px', color: tool.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {tool.sub}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        marginTop: 6,
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#020617',
                        background: tool.accent,
                        borderRadius: '999px',
                        padding: '6px 14px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      LAUNCH →
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* arrows */}
          <button
            type="button"
            aria-label="Previous tool"
            onClick={prev}
            style={{
              position: 'absolute',
              left: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 4,
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(10,14,22,0.85)',
              color: '#e2e8f0',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next tool"
            onClick={next}
            style={{
              position: 'absolute',
              right: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 4,
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(10,14,22,0.85)',
              color: '#e2e8f0',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
        </div>

        {/* dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {TOOLS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Go to ${t.title}`}
              onClick={() => setActive(startReduced + i)}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: i === active % TOOLS.length ? t.accent : 'rgba(148,163,184,0.35)',
                transform: i === active % TOOLS.length ? 'scale(1.35)' : 'scale(1)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* footer strip */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11.5px',
            color: '#94a3b8',
          }}
        >
          <span>All forms compliant with CSC MC No. 16, s. 2017 &amp; Revised 2026</span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>· 100% Free · No sign-up</span>
        </div>
      </div>

      {letterModalOpen && (
        <CoverLetterSelectionModal
          open={letterModalOpen}
          onClose={() => {
            setLetterModalOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
