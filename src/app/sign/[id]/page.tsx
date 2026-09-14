'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Eraser, PenLine, Undo2 } from 'lucide-react';

export default function MobileSignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setHistory(h => [...h.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    ctx.putImageData(prev, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDraw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveHistory();
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPoint.current = { x: clientX - rect.left, y: clientY - rect.top };
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPoint.current = { x, y };
  };

  const stopDraw = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    setSubmitting(true);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch('/api/sign-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, signature: dataUrl }),
      });
      if (res.ok) {
        setSent(true);
      }
    } catch {
      alert('Failed to send signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      <header style={{ textAlign: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>CareerForm PH Mobile Sign</h1>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Draw your signature using your finger</p>
      </header>

      {sent ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}>
          <CheckCircle2 size={56} color="#10b981" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>Signature Transmitted!</h2>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
            Your signature has been delivered to your computer screen. You can return to your desktop now.
          </p>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          {/* Controls bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setColor('#000000')}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#000000',
                  border: color === '#000000' ? '2px solid #06b6d4' : '2px solid transparent',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {color === '#000000' && <Check size={14} color="#ffffff" />}
              </button>
              <button
                type="button"
                onClick={() => setColor('#0052cc')}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#0052cc',
                  border: color === '#0052cc' ? '2px solid #06b6d4' : '2px solid transparent',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {color === '#0052cc' && <Check size={14} color="#ffffff" />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: history.length === 0 ? 0.4 : 1,
                  cursor: 'pointer',
                }}
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Eraser size={14} /> Clear
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div style={{
            position: 'relative',
            flex: 1,
            touchAction: 'none',
            display: 'flex',
            backgroundColor: '#ffffff',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                touchAction: 'none',
              }}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
            />
            <div style={{
              position: 'absolute',
              bottom: '22%',
              left: 24,
              right: 24,
              height: 1,
              backgroundColor: '#e2e8f0',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Footer Submit */}
          <div style={{ padding: 14, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              disabled={!hasDrawn || submitting}
              onClick={submitSignature}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                backgroundColor: hasDrawn ? '#06b6d4' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                cursor: hasDrawn ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <PenLine size={18} /> {submitting ? 'Transmitting...' : 'Send to PDS Builder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
