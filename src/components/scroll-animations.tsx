'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

export default function ScrollAnimations() {
  useEffect(() => {
    // Check if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            gsap.fromTo(
              target,
              {
                opacity: 0,
                y: 35,
                scale: 0.98,
              },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                ease: 'power3.out',
                overwrite: 'auto',
              }
            );
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const animatedElements = document.querySelectorAll(
      '.section-head, .tool-card, .changes-band, .stats-row, .trust-row'
    );
    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
