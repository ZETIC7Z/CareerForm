'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const ASCII_CHARS = ' .:-=+*#%@';

export default function AmbientAsciiScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || 600;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Torus knot generator
    const generateTorusKnot = (p: number, q: number, segments: number, tubeSegments: number): Point3D[] => {
      const points: Point3D[] = [];
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < tubeSegments; j++) {
          const u = (i / segments) * Math.PI * 2;
          const v = (j / tubeSegments) * Math.PI * 2;

          const r = 2 + Math.cos(q * u);
          const x = r * Math.cos(p * u);
          const y = r * Math.sin(p * u);
          const z = -Math.sin(q * u);

          const tubeRadius = 0.45;
          const nx = Math.cos(p * u) * Math.cos(v);
          const ny = Math.sin(p * u) * Math.cos(v);
          const nz = Math.sin(v);

          points.push({
            x: x + tubeRadius * nx,
            y: y + tubeRadius * ny,
            z: z + tubeRadius * nz,
          });
        }
      }
      return points;
    };

    const torusKnot = generateTorusKnot(2, 3, 110, 14);

    const rotatePoint = (point: Point3D, ax: number, ay: number, az: number): Point3D => {
      let { x, y, z } = point;
      const cosX = Math.cos(ax), sinX = Math.sin(ax);
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      y = y1; z = z1;

      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const x2 = x * cosY + z * sinY;
      const z2 = -x * sinY + z * cosY;
      x = x2; z = z2;

      const cosZ = Math.cos(az), sinZ = Math.sin(az);
      const x3 = x * cosZ - y * sinZ;
      const y3 = x * sinZ + y * cosZ;
      return { x: x3, y: y3, z };
    };

    const project = (point: Point3D, cx: number, cy: number, scale: number) => {
      const perspective = 5.2;
      const factor = perspective / (perspective + point.z);
      return {
        x: cx + point.x * scale * factor,
        y: cy + point.y * scale * factor,
        z: point.z,
      };
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.offsetWidth;
      const height = rect.height || canvas.offsetHeight;

      const centerX = width * 0.72;
      const centerY = height * 0.52;
      const scale = Math.min(width, height) * 0.28;

      ctx.clearRect(0, 0, width, height);
      const mouseInfluenceX = (mouseRef.current.x - 0.5) * 0.4;
      const mouseInfluenceY = (mouseRef.current.y - 0.5) * 0.4;

      const time = timeRef.current;
      const angleX = time * 0.25 + mouseInfluenceY;
      const angleY = time * 0.45 + mouseInfluenceX;
      const angleZ = time * 0.18;

      const projectedPoints = torusKnot
        .map(point => {
          const rotated = rotatePoint(point, angleX, angleY, angleZ);
          return project(rotated, centerX, centerY, scale);
        })
        .sort((a, b) => a.z - b.z);

      const charSize = Math.max(12, Math.min(width, height) * 0.024);
      ctx.font = `${charSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      projectedPoints.forEach(point => {
        const normalizedZ = (point.z + 3) / 6;
        const charIndex = Math.floor(normalizedZ * (ASCII_CHARS.length - 1));
        const char = ASCII_CHARS[Math.max(0, Math.min(ASCII_CHARS.length - 1, charIndex))];

        const brightness = 0.15 + normalizedZ * 0.65;
        // Elegant golden/amber amber glow matching CareerForm PH
        ctx.fillStyle = `rgba(239, 181, 48, ${brightness * 0.65})`;
        ctx.fillText(char, point.x, point.y);
      });

      // Ambient floating particles
      for (let i = 0; i < 35; i++) {
        const px = (Math.sin(time * 0.4 + i * 0.6) * 0.35 + 0.65) * width;
        const py = (Math.cos(time * 0.25 + i * 0.8) * 0.35 + 0.5) * height;
        const pz = Math.sin(time + i) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(245, 158, 11, ${pz * 0.25})`;
        ctx.fillText(ASCII_CHARS[Math.floor(pz * (ASCII_CHARS.length - 1))], px, py);
      }

      timeRef.current += 0.007;
      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-ascii-canvas"
      aria-hidden="true"
    />
  );
}
