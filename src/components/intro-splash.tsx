'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The site's opening splash: black edge to edge, then two marks in sequence.
 *
 *   1. The ZETICUZ developer mark fades in, holds, and fades back to black (~0–1.95s).
 *   2. The CareerForm mark fades in larger while a burst of the same four-point sparkles
 *      the cursor trail uses rains around it (~1.95–3.85s), then fades back to black.
 *   3. The whole overlay dissolves and the site is already there underneath (~3.85–5.1s).
 *
 * It mounts once per full page load (inside the root layout, so client-side navigation
 * never replays it) and covers the viewport — `position: fixed; inset: 0` — so it is
 * edge-to-edge on every shape of screen, landscape or portrait. While it is up the page
 * cannot scroll (`intro-lock` on <html>) and the browser's own zoom is already disabled
 * by the viewport meta, so a phone held in portrait shows the same clean black stage a
 * desktop does.
 *
 * Reduced motion skips the show entirely: the effect tears itself down on the first tick
 * so those readers land straight on the page.
 */

const SPARK_PALETTE = ['#0038A8', '#CE1126', '#FCD116', '#FFFFFF', '#FCD116'];

/** Choreography, in milliseconds. The overlays themselves animate in CSS (globals.css). */
const PHASE_CAREERFORM_AT = 1_950;
const PHASE_EXIT_AT = 3_850;
const PHASE_DONE_AT = 5_100;

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  spin: number;
  rays: number;
};

export default function IntroSplash() {
  // `phase === 'done'` removes the overlay from the DOM; 'exit' fades it out in CSS.
  const [phase, setPhase] = useState<'zeticuz' | 'careerform' | 'exit' | 'done'>('zeticuz');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('intro-lock');

    // Reduced motion: no show at all — straight to the site.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('intro-lock');
      setPhase('done');
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('careerform'), PHASE_CAREERFORM_AT),
      window.setTimeout(() => setPhase('exit'), PHASE_EXIT_AT),
      window.setTimeout(() => {
        root.classList.remove('intro-lock');
        setPhase('done');
      }, PHASE_DONE_AT),
    ];

    return () => {
      timers.forEach(t => window.clearTimeout(t));
      root.classList.remove('intro-lock');
    };
  }, []);

  // The sparkle field: a self-contained canvas running only while the CareerForm mark is
  // on stage. Same palette and same four/eight-point star as the cursor trail, bursting
  // from around the logo instead of following the pointer.
  useEffect(() => {
    if (phase !== 'careerform' && phase !== 'exit') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sparks: Spark[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let spawnTimer = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // A burst scatters stars across the logo's footprint — centred, roughly 70vw wide.
    const burst = () => {
      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.min(width * 0.36, 460);
      const ry = Math.min(height * 0.22, 190);
      for (let i = 0; i < 7; i++) {
        const angle = Math.random() * Math.PI * 2;
        const life = 500 + Math.random() * 700;
        sparks.push({
          x: cx + (Math.random() - 0.5) * 2 * rx,
          y: cy + (Math.random() - 0.5) * 2 * ry,
          vx: Math.cos(angle) * (0.15 + Math.random() * 0.7),
          vy: Math.sin(angle) * (0.1 + Math.random() * 0.5) - 0.45,
          life,
          max: life,
          size: 2.2 + Math.random() * 3.4,
          color: SPARK_PALETTE[Math.floor(Math.random() * SPARK_PALETTE.length)],
          spin: (Math.random() - 0.5) * 0.06,
          rays: Math.random() < 0.2 ? 8 : 4,
        });
      }
      if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
    };
    burst();

    const drawStar = (s: Spark, scale: number) => {
      const outer = s.size * scale;
      const inner = outer * (s.rays === 8 ? 0.34 : 0.22);
      ctx.beginPath();
      for (let i = 0; i < s.rays * 2; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / s.rays) * i + Math.PI / 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    };

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const delta = previous ? Math.min(32, now - previous) : 16;
      previous = now;

      spawnTimer += delta;
      if (spawnTimer > 200 && phase === 'careerform') {
        spawnTimer = 0;
        burst();
      }

      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= delta;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        alive = true;
        s.x += s.vx * delta * 0.06;
        s.y += s.vy * delta * 0.06;
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 0.012;
        const t = s.life / s.max;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 1.5) * (phase === 'exit' ? 0.7 : 1);
        ctx.translate(s.x, s.y);
        ctx.rotate(now * 0.001 * s.spin + s.spin * 10);
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.rays === 8 ? 14 : 8;
        drawStar(s, 0.45 + t * 0.75);
        ctx.restore();
      }
      if (!alive && phase === 'exit') {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    frame = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', resize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [phase]);

  if (phase === 'done') return null;

  const showCareerForm = phase !== 'zeticuz';

  return (
    <div className={`intro-splash ${phase === 'exit' ? 'intro-splash-exit' : ''}`} aria-hidden="true">
      {/* The developer's mark, first. */}
      <img
        src="/zeticuz-logo.svg"
        alt=""
        className="intro-zeticuz"
        draggable={false}
      />

      {/* The product mark, second — bigger, with the sparkles around it. */}
      {showCareerForm && (
        <img
          src="/careerform-logo.svg"
          alt=""
          className="intro-careerform"
          draggable={false}
        />
      )}

      <canvas ref={canvasRef} className="intro-sparks" />
    </div>
  );
}
