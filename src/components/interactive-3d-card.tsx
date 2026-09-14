'use client';

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';

interface Interactive3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
  glowRadius?: number;
  perspective?: number;
  style?: React.CSSProperties;
}

export default function Interactive3DCard({
  children,
  className = '',
  maxTilt = 10,
  glowColor,
  glowRadius = 300,
  perspective = 1000,
  style = {},
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Tilt ranges from -maxTilt to +maxTilt
    const tiltX = ((y - centerY) / centerY) * -maxTilt;
    const tiltY = ((x - centerX) / centerX) * maxTilt;

    gsap.to(card, {
      rotateX: tiltX,
      rotateY: tiltY,
      duration: 0.25,
      ease: 'power2.out',
      transformPerspective: perspective,
      overwrite: 'auto',
    });

    if (glowRef.current) {
      glowRef.current.style.opacity = '1';
      glowRef.current.style.transform = `translate(${x - glowRadius / 2}px, ${y - glowRadius / 2}px)`;
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    const card = cardRef.current;
    if (!card) return;

    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'power3.out',
      overwrite: 'auto',
    });

    if (glowRef.current) {
      glowRef.current.style.opacity = '0';
    }
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative transform-gpu transition-shadow duration-300 ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {/* Dynamic Cursor-Following Glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute -inset-0 rounded-inherit opacity-0 transition-opacity duration-300 z-10"
        style={{
          width: glowRadius,
          height: glowRadius,
          borderRadius: '50%',
          background: glowColor || 'radial-gradient(circle, var(--accent, rgba(79, 142, 247, 0.22)) 0%, transparent 70%)',
          filter: 'blur(20px)',
          mixBlendMode: 'screen',
          willChange: 'transform, opacity',
        }}
        aria-hidden="true"
      />
      <div className="relative z-20 w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}
