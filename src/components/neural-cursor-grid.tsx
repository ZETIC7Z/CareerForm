'use client';

import { useEffect, useRef } from 'react';

interface GridCell {
  x: number;
  y: number;
  alpha: number;
  fading: boolean;
  lastTouched: number;
}

export default function NeuralCursorGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const squareSize = 80;
    const grid: GridCell[] = [];
    let animationId: number;
    let isRunning = true;

    function initGrid() {
      grid.length = 0;
      for (let x = 0; x < width; x += squareSize) {
        for (let y = 0; y < height; y += squareSize) {
          grid.push({
            x,
            y,
            alpha: 0,
            fading: false,
            lastTouched: 0,
          });
        }
      }
    }

    function getCellAt(x: number, y: number): GridCell | undefined {
      return grid.find(
        cell =>
          x >= cell.x &&
          x < cell.x + squareSize &&
          y >= cell.y &&
          y < cell.y + squareSize
      );
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cell = getCellAt(e.clientX, e.clientY);
      if (cell && cell.alpha === 0) {
        cell.alpha = 1;
        cell.lastTouched = Date.now();
        cell.fading = false;
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Parse active theme accent color
    function getAccentRgb(): [number, number, number] {
      if (typeof window === 'undefined') return [6, 182, 212];
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim();
      if (accent.startsWith('#') && accent.length === 7) {
        const r = parseInt(accent.slice(1, 3), 16);
        const g = parseInt(accent.slice(3, 5), 16);
        const b = parseInt(accent.slice(5, 7), 16);
        return [r, g, b];
      }
      return [6, 182, 212]; // Default Deep Cyan
    }

    let [r, g, b] = getAccentRgb();
    const observer = new MutationObserver(() => {
      [r, g, b] = getAccentRgb();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });

    initGrid();

    function drawGrid() {
      if (!isRunning || !ctx) return;
      ctx.clearRect(0, 0, width, height);
      const now = Date.now();

      for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];

        // Start fading after 450ms
        if (cell.alpha > 0 && !cell.fading && now - cell.lastTouched > 450) {
          cell.fading = true;
        }

        if (cell.fading) {
          cell.alpha -= 0.025;
          if (cell.alpha <= 0) {
            cell.alpha = 0;
            cell.fading = false;
          }
        }

        if (cell.alpha > 0) {
          const centerX = cell.x + squareSize / 2;
          const centerY = cell.y + squareSize / 2;

          const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            6,
            centerX,
            centerY,
            squareSize
          );
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${cell.alpha * 0.9})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, squareSize - 1, squareSize - 1);
        }
      }

      animationId = requestAnimationFrame(drawGrid);
    }

    animationId = requestAnimationFrame(drawGrid);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="neural-grid-canvas"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
