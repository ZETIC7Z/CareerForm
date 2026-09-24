'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  link: string;
  linkText: string;
  chipTop?: string;
  chipBottom?: string;
}

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 'pds-mirror',
    title: 'Civil Service Form 212',
    subtitle: 'Official Revised 2026 Live Mirror',
    badge: 'OFFICIAL CS FORM 212',
    image: '/images/pds-poster.jpg',
    link: '/builder',
    linkText: 'Launch Live PDS',
    chipTop: 'Official Revised 2026 CS Form 212',
    chipBottom: 'Exports print-ready official A4 PDF',
  },
  {
    id: 'cover-letter',
    title: 'Executive Cover Letter',
    subtitle: 'Civil Service & Work Placement Intent',
    badge: 'APPLICATION LETTER',
    image: '/images/cover-letter-poster.jpg',
    link: '/coverletter',
    linkText: 'Compose Letter',
    chipTop: 'CSC Compliant Application Letter',
    chipBottom: 'To The Appointing Authority',
  },
  {
    id: 'wes-annex',
    title: 'CSC Work Experience Sheet',
    subtitle: 'Standardized Annex to CS Form 212',
    badge: 'WES BUILDER',
    image: '/images/wes-poster.jpg',
    link: '/wes',
    linkText: 'Open WES Annex',
    chipTop: 'CSC MC No. 16, s. 2017 Format',
    chipBottom: 'Career Milestones & Duty Matrix',
  },
  {
    id: 'gov-jobs',
    title: 'Gov Job Portal & Careers',
    subtitle: 'Plantilla Vacancies & Live Hiring',
    badge: 'CSC PLANTILLA',
    image: '/images/job-application-poster.jpg',
    link: '/jobs',
    linkText: 'Explore Vacancies',
    chipTop: '3,400+ Verified Plantilla Jobs',
    chipBottom: 'Instant Auto-Match with PDS',
  },
];

export default function HeroShowcaseCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const total = CAROUSEL_ITEMS.length;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // The launcher stays still: the visitor picks a card, nothing rotates on its own.

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  return (
    <div
      className="hero-carousel-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '660px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* 3D Depth Viewport */}
      <div
        className="carousel-container"
        style={{
          perspective: '1200px',
          width: '100%',
          height: isMobile ? '430px' : '480px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <div
          className="carousel-track"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
          }}
        >
          {CAROUSEL_ITEMS.map((item, index) => {
            // Calculate relative index based on current active card
            const relativeIndex = (index - currentIndex + total) % total;

            // Mathematical positioning matching CodePen PwWMZPv
            let xOffset = 0;
            let zOffset = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 10;

            if (relativeIndex === 0) {
              // Front active card
              xOffset = 0;
              zOffset = 0;
              scale = 1;
              opacity = 1;
              zIndex = 10;
            } else if (relativeIndex === 1) {
              // Second card (behind and to the left)
              xOffset = isMobile ? -65 : -140;
              zOffset = isMobile ? -70 : -120;
              scale = isMobile ? 0.94 : 0.92;
              opacity = 0.85;
              zIndex = 8;
            } else if (relativeIndex === 2) {
              // Third card
              xOffset = isMobile ? -125 : -260;
              zOffset = isMobile ? -140 : -230;
              scale = isMobile ? 0.88 : 0.84;
              opacity = 0.55;
              zIndex = 5;
            } else if (relativeIndex === 3) {
              // Fourth card (furthest back)
              xOffset = isMobile ? -175 : -360;
              zOffset = isMobile ? -190 : -320;
              scale = isMobile ? 0.82 : 0.76;
              opacity = 0.25;
              zIndex = 2;
            }

            const isFront = relativeIndex === 0;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isFront) setCurrentIndex(index);
                }}
                className="carousel-card liquid-glass clay-border"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: isMobile ? '300px' : '380px',
                  height: isMobile ? '420px' : '470px',
                  padding: isMobile ? '12px' : '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '24px',
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: isFront
                    ? '1.5px solid rgba(56, 189, 248, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isFront
                    ? '0 25px 60px rgba(0, 0, 0, 0.6), inset 1px 1px 2px rgba(255, 255, 255, 0.15)'
                    : '0 15px 35px rgba(0, 0, 0, 0.4)',
                  cursor: isFront ? 'default' : 'pointer',
                  transformOrigin: 'center right',
                  transform: `translate3d(${xOffset}px, 0px, ${zOffset}px) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {/* Top Badge & Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '0 4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isFront ? '#10b981' : '#64748b',
                        boxShadow: isFront ? '0 0 6px #10b981' : 'none',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: isFront ? '#38bdf8' : '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    0{index + 1} / 0{total}
                  </span>
                </div>

                {/* Card Visual / Poster Image */}
                <div
                  className="card-image-wrap"
                  style={{
                    position: 'relative',
                    width: '100%',
                    flex: 1,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#090e1a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 300px, 420px"
                    style={{ objectFit: 'cover', objectPosition: 'top' }}
                    priority={index === 0}
                  />

                  {/* Overlaid Floating Chips on Active Front Card */}
                  {isFront && (
                    <>
                      {item.chipTop && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '10px',
                            background: 'rgba(15, 23, 42, 0.92)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8' }} />
                          {item.chipTop}
                        </div>
                      )}
                      {item.chipBottom && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '12px',
                            right: '10px',
                            background: 'rgba(15, 23, 42, 0.92)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                          {item.chipBottom}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card Info */}
                <div
                  className="card-info"
                  style={{
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: isMobile ? '14px' : '15.5px',
                        fontWeight: 700,
                        color: '#ffffff',
                        margin: '0 0 2px 0',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: isMobile ? '11px' : '12px',
                        color: '#94a3b8',
                        margin: 0,
                      }}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  {isFront && (
                    <Link
                      href={item.link}
                      className="btn btn-primary"
                      style={{
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {item.linkText} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel Controls & Indicators */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous card"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {CAROUSEL_ITEMS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: currentIndex === i ? '22px' : '7px',
                height: '7px',
                borderRadius: '999px',
                background: currentIndex === i ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next card"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
