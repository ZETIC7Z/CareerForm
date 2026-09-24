'use client';

import React, { useState, useEffect } from 'react';

/**
 * Pure 4K 3D Philippine Cinematic National Emblem (Matching User Image 3: media_1789902810105.png)
 * Unboxed, clean, integrated directly above the hero title.
 * Loop:
 * 1. 3 Golden Stars (Luzon, Visayas, Mindanao) drop and land sequentially.
 * 2. 8-Ray Golden Sun emerges and rotates continuously with radiant specular flares.
 * 3. Royal Blue and Scarlet Red silk swooshes unfurl across.
 */
export default function HeroPhilippineCinematic() {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let tLoop: NodeJS.Timeout;

    const startCycle = () => {
      // Step 1: 3 Stars drop and land
      setPhase(1);

      // Step 2: 8-ray Sun emerges and rotates (at 1.6s)
      t1 = setTimeout(() => {
        setPhase(2);
      }, 1600);

      // Step 3: Royal Blue and Red ribbons unfurl (at 3.4s)
      t2 = setTimeout(() => {
        setPhase(3);
      }, 3400);

      // Smooth continuous loop restart (at 10s)
      tLoop = setTimeout(() => {
        startCycle();
      }, 10000);
    };

    startCycle();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tLoop);
    };
  }, []);

  return (
    <div
      className="hero-ph-pure-emblem"
      aria-label="Official Philippine National Emblem 3D Animation"
      style={{
        position: 'relative',
        width: '180px',
        height: '90px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 160 110"
        width="180"
        height="90"
        style={{
          overflow: 'visible',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
        }}
      >
        <defs>
          {/* 3D Metallic Gold Gradient */}
          <linearGradient id="emblemGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9C4" />
            <stop offset="25%" stopColor="#FBBF24" />
            <stop offset="65%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* Royal Blue Silk Ribbon Gradient */}
          <linearGradient id="emblemBlue" x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="40%" stopColor="#3B82F6" />
            <stop offset="80%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Scarlet Red Silk Ribbon Gradient */}
          <linearGradient id="emblemRed" x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#DC2626" />
            <stop offset="85%" stopColor="#991B1B" />
            <stop offset="100%" stopColor="#450A0A" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="emblemGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. THREE STARS (Landing One by One) */}
        {/* Top Center Star */}
        <g
          style={{
            transformOrigin: '80px 22px',
            transform: phase >= 1 ? 'translateY(0px) scale(1)' : 'translateY(-35px) scale(0)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
          }}
        >
          <polygon
            points="80,12 82.5,19 90,19 84,24 86.5,31 80,26.5 73.5,31 76,24 70,19 77.5,19"
            fill="url(#emblemGold)"
            filter="url(#emblemGlow)"
          />
        </g>

        {/* Left Star */}
        <g
          style={{
            transformOrigin: '48px 36px',
            transform: phase >= 1 ? 'translateY(0px) scale(1)' : 'translateY(-35px) scale(0)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, opacity 0.4s ease 0.2s',
          }}
        >
          <polygon
            points="48,27 50.5,34 58,34 52,39 54.5,46 48,41.5 41.5,46 44,39 38,34 45.5,34"
            fill="url(#emblemGold)"
            filter="url(#emblemGlow)"
          />
        </g>

        {/* Right Star */}
        <g
          style={{
            transformOrigin: '112px 36px',
            transform: phase >= 1 ? 'translateY(0px) scale(1)' : 'translateY(-35px) scale(0)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s, opacity 0.4s ease 0.4s',
          }}
        >
          <polygon
            points="112,27 114.5,34 122,34 116,39 118.5,46 112,41.5 105.5,46 108,39 102,34 109.5,34"
            fill="url(#emblemGold)"
            filter="url(#emblemGlow)"
          />
        </g>

        {/* 2. ROTATING 8-RAY GOLDEN SUN */}
        <g
          style={{
            transformOrigin: '80px 65px',
            transform: phase >= 2 ? 'scale(1) rotate(0deg)' : 'scale(0.2) rotate(-180deg)',
            opacity: phase >= 2 ? 1 : 0,
            transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
          }}
        >
          <g className={phase >= 2 ? 'sun-spin-anim' : ''}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <g key={angle} transform={`rotate(${angle} 80 65)`}>
                <polygon points="80,42 82.5,52 80,55 77.5,52" fill="url(#emblemGold)" />
                <polygon points="76,46 78,53 75,54" fill="url(#emblemGold)" opacity="0.85" />
                <polygon points="84,46 85,54 82,53" fill="url(#emblemGold)" opacity="0.85" />
              </g>
            ))}
          </g>
          {/* Sun Center Orb */}
          <circle
            cx="80"
            cy="65"
            r="13"
            fill="url(#emblemGold)"
            stroke="#FFF9C4"
            strokeWidth="0.8"
            filter="url(#emblemGlow)"
          />
        </g>

        {/* 3. ROYAL BLUE AND SCARLET RED SILK RIBBONS (Exact Match to Image 3) */}
        <g
          style={{
            transformOrigin: '80px 84px',
            transform: phase >= 3 ? 'scaleX(1) scaleY(1)' : 'scaleX(0) scaleY(0.4)',
            opacity: phase >= 3 ? 1 : 0,
            transition: 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
          }}
        >
          {/* Blue Silk Wave */}
          <path
            d="M 22 80 Q 52 64 80 75 T 138 68 C 132 80 110 88 80 84 Q 48 88 22 80 Z"
            fill="url(#emblemBlue)"
            filter="drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45))"
          />
          {/* Red Silk Wave */}
          <path
            d="M 26 84 Q 54 78 80 88 T 140 79 C 130 93 106 100 80 96 Q 46 99 26 84 Z"
            fill="url(#emblemRed)"
            filter="drop-shadow(0 2px 5px rgba(0, 0, 0, 0.5))"
          />
        </g>
      </svg>

      <style jsx>{`
        .sun-spin-anim {
          animation: emblemSunRotate 14s linear infinite;
          transform-origin: 80px 65px;
        }
        @keyframes emblemSunRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
