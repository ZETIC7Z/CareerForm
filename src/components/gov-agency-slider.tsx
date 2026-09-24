'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AGENCY_PROGRAMS_DATA } from '@/lib/agency-programs-data';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GovAgencySlider() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedAgency = AGENCY_PROGRAMS_DATA[selectedIndex] || AGENCY_PROGRAMS_DATA[0];

  // Auto-cycle across agencies: Exactly 1 full loop of programs (22s) before auto-switching
  useEffect(() => {
    if (isUserInteracting) return;

    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % AGENCY_PROGRAMS_DATA.length);
    }, 22000);

    return () => clearInterval(timer);
  }, [isUserInteracting]);

  // Keep selected agency card centered/visible in horizontal scroll
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const activeBtn = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeBtn) {
      const containerWidth = container.offsetWidth;
      const btnLeft = activeBtn.offsetLeft;
      const btnWidth = activeBtn.offsetWidth;
      container.scrollTo({
        left: btnLeft - containerWidth / 2 + btnWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleSelectAgency = (index: number) => {
    setSelectedIndex(index);
    setIsUserInteracting(true);

    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 30000);
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Duplicate programs for seamless infinite marquee loop
  const marqueePrograms = [
    ...selectedAgency.programs,
    ...selectedAgency.programs,
    ...selectedAgency.programs,
  ];

  return (
    <div
      className="gov-agency-showcase-suite full-edge-to-edge"
      aria-label="Philippine Government Portals and Services Suite"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        padding: '12px 0 8px',
        overflow: 'hidden',
        background: 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '16px',
        zIndex: 15,
      }}
    >
      {/* Full-bleed Header Band */}
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          padding: '0 36px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#38BDF8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '3px 10px',
              borderRadius: '6px',
            }}
          >
            <Sparkles size={12} /> OFFICIAL PHILIPPINE GOVERNMENT PORTALS
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              fontWeight: 500,
            }}
          >
            Point or click an agency logo to inspect its official 2026 public programs &amp; services
          </span>
        </div>

        {/* Selected Agency Live Pill Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px #10B981',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
            Active Agency:{' '}
            <strong style={{ color: '#F59E0B', fontSize: '13px' }}>{selectedAgency.code}</strong>{' '}
            <span style={{ color: '#94A3B8', fontWeight: 500 }}>({selectedAgency.category})</span>
          </span>
        </div>
      </div>

      {/* 1. CODEPEN STYLE AGENCY SELECTOR: BIGGER LOGOS & SCALE-UP ON SELECTED */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          padding: '0 16px',
        }}
        onMouseEnter={() => setIsUserInteracting(true)}
        onMouseLeave={() => {
          if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
          userInteractionTimeoutRef.current = setTimeout(() => setIsUserInteracting(false), 10000);
        }}
      >
        {/* Left Scroll Arrow */}
        <button
          type="button"
          onClick={() => scrollNav('left')}
          aria-label="Scroll agencies left"
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Agency Cards Horizontal Scroll Row */}
        <div
          ref={scrollContainerRef}
          className="codepen-agency-cards-track"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            overflowX: 'auto',
            padding: '12px 42px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {AGENCY_PROGRAMS_DATA.map((agency, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={agency.code}
                type="button"
                data-index={index}
                onClick={() => handleSelectAgency(index)}
                onMouseEnter={() => handleSelectAgency(index)}
                className={`codepen-agency-card ${isSelected ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '102px',
                  height: '98px',
                  padding: '8px',
                  borderRadius: '16px',
                  backgroundColor: isSelected
                    ? 'rgba(15, 23, 42, 0.98)'
                    : 'rgba(15, 23, 42, 0.6)',
                  border: isSelected
                    ? '2px solid #38BDF8'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isSelected
                    ? '0 0 24px rgba(56, 189, 248, 0.55), 0 8px 24px rgba(0, 0, 0, 0.7)'
                    : '0 4px 12px rgba(0, 0, 0, 0.35)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  /* Selected agency gets bigger than other per user prompt */
                  transform: isSelected ? 'scale(1.22) translateY(-4px)' : 'scale(1)',
                  zIndex: isSelected ? 10 : 1,
                }}
                title={`${agency.code} — ${agency.name}`}
              >
                {/* Enlarged Agency Logo (48px) per user prompt */}
                <div
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    filter: isSelected
                      ? 'drop-shadow(0 3px 10px rgba(56, 189, 248, 0.6))'
                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))',
                  }}
                >
                  <Image
                    src={agency.logo}
                    alt={agency.code}
                    width={48}
                    height={48}
                    style={{
                      objectFit: 'contain',
                      maxHeight: '48px',
                      maxWidth: '48px',
                      width: 'auto',
                      height: 'auto',
                    }}
                    unoptimized={agency.logo.endsWith('.svg')}
                  />
                </div>

                {/* Agency Acronym Code */}
                <span
                  style={{
                    fontSize: isSelected ? '12px' : '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: isSelected ? '#38BDF8' : '#F1F5F9',
                    lineHeight: 1,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {agency.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Arrow */}
        <button
          type="button"
          onClick={() => scrollNav('right')}
          aria-label="Scroll agencies right"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 2. DYNAMIC 2026 PROGRAMS MARQUEE: PROGRAM EMBLEMS & 1 FULL LOOP */}
      <div
        className="agency-programs-marquee-container"
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          marginTop: '12px',
          paddingTop: '6px',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        }}
      >
        <div
          className="agency-programs-marquee-track"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            width: 'max-content',
            /* Completes 1 full loop in 22 seconds before auto-advance */
            animation: 'programsMarqueeLoop 22s linear infinite',
            userSelect: 'none',
            paddingLeft: '24px',
          }}
        >
          {marqueePrograms.map((prog, i) => (
            <div
              key={`${prog.id}-${i}`}
              className="program-service-node"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '8px 16px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                flexShrink: 0,
                transition: 'all 0.25s ease',
              }}
            >
              {/* Program Official Emblem Badge per user prompt */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${prog.emblemColor}22`,
                  border: `1.5px solid ${prog.emblemColor}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                  boxShadow: `0 2px 8px ${prog.emblemColor}33`,
                }}
              >
                {prog.emblemIcon}
              </div>

              {/* Program Information */}
              <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {prog.name}
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.18)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    {prog.badge}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#94A3B8',
                    lineHeight: 1.35,
                    marginTop: '2px',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {prog.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes programsMarqueeLoop {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .agency-programs-marquee-container:hover .agency-programs-marquee-track {
          animation-play-state: paused;
        }
        .codepen-agency-card:hover {
          border-color: #38bdf8 !important;
          transform: scale(1.15) translateY(-2px) !important;
        }
        .program-service-node:hover {
          border-color: rgba(56, 189, 248, 0.5) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        }
        .codepen-agency-cards-track::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
