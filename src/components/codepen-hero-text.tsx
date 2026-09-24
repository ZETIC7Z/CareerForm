'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './codepen-hero-text.css';

export default function CodePenHeroText() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('.codepen-hero-li');
    
    // User requested NO intro effect: "YOU JUST MAKE IT STEADY IN HOME NO EFFECT"
    gsap.set(items, { '--stop-active': '100%', '--stop-hover': '0%' });

    items.forEach((item) => {
      const handleMouseEnter = () => {
        gsap.to(item, {
          '--stop-hover': '100%',
          ease: 'power3.out',
          duration: 0.36
        });
      };
      
      const handleMouseLeave = () => {
        gsap.to(item, {
          '--stop-hover': '0%',
          ease: 'power3.out',
          duration: 0.36
        });
      };

      item.addEventListener('mouseenter', handleMouseEnter);
      item.addEventListener('mouseleave', handleMouseLeave);
      
      (item as any)._cleanup = () => {
        item.removeEventListener('mouseenter', handleMouseEnter);
        item.removeEventListener('mouseleave', handleMouseLeave);
      };
    });

    return () => {
      items.forEach((item) => {
        if ((item as any)._cleanup) (item as any)._cleanup();
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="codepen-hero-text-container" style={{ margin: '20px 0', zIndex: 10, position: 'relative' }}>
      <ul className="codepen-hero-ul">
        <li className="codepen-hero-li">YOUR NEXT CHAPTER</li>
        <li className="codepen-hero-li">STARTS WITH</li>
        <li className="codepen-hero-li">ONE HONEST</li>
        <li className="codepen-hero-li">PAGE</li>
      </ul>
    </div>
  );
}
