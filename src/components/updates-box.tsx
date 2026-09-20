'use client';

import { useState } from 'react';
import { Sparkles, Calendar, Tag, ChevronDown, ChevronUp, History, CheckCircle2 } from 'lucide-react';
import { PATCH_NOTES, PatchNote } from '@/lib/patch-notes';

export default function UpdatesBox({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayedNotes = expanded ? PATCH_NOTES : PATCH_NOTES.slice(0, 2);

  return (
    <aside
      className={`updates-box-card ${className}`}
      aria-label="Site Updates and Patch Notes"
      style={{
        background: 'var(--card-bg, rgba(15, 23, 42, 0.65))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color, rgba(6, 182, 212, 0.22))',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(6, 182, 212, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        ...style,
      }}
    >
      {/* Decorative top accent gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #10b981 100%)',
        }}
      />

      {/* Header with Title and Live Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <History size={18} />
          </span>
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-primary, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Site Updates &amp; Patch Notes
            </h3>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)',
                margin: '2px 0 0',
              }}
            >
              Latest fixes, improvements &amp; features
            </p>
          </div>
        </div>

        {/* Live Pulsing Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              animation: 'pulse 2s infinite',
            }}
          />
          Live Updates
        </div>
      </div>

      {/* Patch Notes List (most recent at the top) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight: expanded ? '460px' : 'none',
          overflowY: expanded ? 'auto' : 'visible',
          paddingRight: expanded ? '4px' : '0',
        }}
      >
        {displayedNotes.map((note, index) => (
          <article
            key={note.id}
            style={{
              background: note.isLatest
                ? 'var(--patch-highlight-bg, rgba(6, 182, 212, 0.06))'
                : 'var(--patch-item-bg, rgba(255, 255, 255, 0.02))',
              border: note.isLatest
                ? '1px solid var(--accent, rgba(6, 182, 212, 0.3))'
                : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
              borderRadius: '10px',
              padding: '12px 14px',
              transition: 'background 0.2s ease',
            }}
          >
            {/* Meta Row: Date & Version */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent, #06b6d4)',
                    background: 'rgba(6, 182, 212, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  <Calendar size={11} />
                  {note.date}
                </span>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: note.isLatest ? '#38bdf8' : 'var(--text-muted, #94a3b8)',
                    fontFamily: 'monospace',
                  }}
                >
                  {note.version}
                </span>

                {note.isLatest && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#000',
                      background: 'var(--accent, #00e5ff)',
                      padding: '1px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    Latest
                  </span>
                )}
              </div>

              <strong
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #ffffff)',
                }}
              >
                {note.title}
              </strong>
            </div>

            {/* Bullet Notes */}
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              {note.changes.map((change, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.45',
                    color: 'var(--text-secondary, #cbd5e1)',
                  }}
                >
                  {change}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Expand / Collapse Button if more than 2 patch notes */}
      {PATCH_NOTES.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            marginTop: '14px',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            borderRadius: '8px',
            color: 'var(--accent, #06b6d4)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              View older patch notes ({PATCH_NOTES.length - 2} more) <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </aside>
  );
}
