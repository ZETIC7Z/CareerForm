'use client';

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {
  X,
  PenTool,
  Upload,
  Camera,
  Type,
  QrCode,
  RotateCcw,
  Check,
  RefreshCw,
} from 'lucide-react';
import {generateQRCodeSVG} from '@/lib/qr-code';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, date?: string) => void;
  initialName?: string;
};

/**
 * Intelligent Signature Background Remover & Ink Extractor
 * Strips paper background, grain, shadows, and off-white artifacts into transparent PNG.
 * Turns ink strokes into crisp, solid ink (#000000 or chosen color) with clean anti-aliased edges.
 */
export async function processSignatureImage(
  imageSource: string,
  chosenInkColor: string = '#000000'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const d = imgData.data;

      // Parse target ink RGB
      let inkR = 0, inkG = 0, inkB = 0;
      if (chosenInkColor.startsWith('#')) {
        const h = chosenInkColor.replace('#', '');
        if (h.length === 6) {
          inkR = parseInt(h.substring(0, 2), 16);
          inkG = parseInt(h.substring(2, 4), 16);
          inkB = parseInt(h.substring(4, 6), 16);
        }
      }

      // Check if image already has transparent background
      let transparentCount = 0;
      const totalPixels = img.width * img.height;
      for (let i = 3; i < d.length; i += 16) {
        if (d[i] < 200) transparentCount++;
      }
      const alreadyHasAlpha = transparentCount > (totalPixels / 4) * 0.1;

      if (alreadyHasAlpha) {
        // Image already has transparency: recolor strokes to solid black with clean anti-aliasing
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3];
          if (a > 15) {
            d[i] = inkR;
            d[i + 1] = inkG;
            d[i + 2] = inkB;
            // Boost stroke alpha for solid ink visibility over printed forms
            d[i + 3] = Math.min(255, Math.round(a * 1.4));
          } else {
            d[i + 3] = 0;
          }
        }
      } else {
        // Scanned/photographed paper with white, off-white, or shaded background
        // Sample border perimeter to determine background paper luminance
        const w = img.width;
        const h = img.height;
        let bgLumSum = 0;
        let sampleCount = 0;

        for (let x = 0; x < w; x += 10) {
          const topIdx = x * 4;
          const botIdx = ((h - 1) * w + x) * 4;
          bgLumSum += d[topIdx] * 0.299 + d[topIdx + 1] * 0.587 + d[topIdx + 2] * 0.114;
          bgLumSum += d[botIdx] * 0.299 + d[botIdx + 1] * 0.587 + d[botIdx + 2] * 0.114;
          sampleCount += 2;
        }
        for (let y = 0; y < h; y += 10) {
          const leftIdx = (y * w) * 4;
          const rightIdx = (y * w + (w - 1)) * 4;
          bgLumSum += d[leftIdx] * 0.299 + d[leftIdx + 1] * 0.587 + d[leftIdx + 2] * 0.114;
          bgLumSum += d[rightIdx] * 0.299 + d[rightIdx + 1] * 0.587 + d[rightIdx + 2] * 0.114;
          sampleCount += 2;
        }

        const avgBgLum = sampleCount > 0 ? bgLumSum / sampleCount : 240;
        // Paper background cutoff: any pixel with luminance higher than threshold is transparent
        const threshold = Math.max(140, avgBgLum - 30);
        const fullDark = Math.max(50, threshold - 55);

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const lum = r * 0.299 + g * 0.587 + b * 0.114;

          if (lum >= threshold) {
            // Paper background -> 100% transparent
            d[i + 3] = 0;
          } else {
            // Ink stroke pixel -> solid ink
            d[i] = inkR;
            d[i + 1] = inkG;
            d[i + 2] = inkB;

            if (lum <= fullDark) {
              d[i + 3] = 255;
            } else {
              // Anti-aliased stroke edge
              const factor = (threshold - lum) / (threshold - fullDark);
              d[i + 3] = Math.min(255, Math.max(160, Math.round(factor * 255)));
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Auto-crop empty transparent borders so the signature is prominent and properly sized
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasInk = false;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = d[(y * canvas.width + x) * 4 + 3];
          if (alpha > 20) {
            hasInk = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (hasInk && maxX > minX && maxY > minY) {
        const pad = 6;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
        const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (croppedCtx) {
          croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          resolve(croppedCanvas.toDataURL('image/png'));
          return;
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load signature image'));
    img.src = imageSource;
  });
}

const FONTS = [
  {name: 'Cursive Elegant', family: "'Brush Script MT', 'Dancing Script', cursive"},
  {name: 'Modern Executive', family: "'Lucida Handwriting', 'Segoe Script', cursive"},
  {name: 'Classic Legal', family: "'Great Vibes', 'Allura', cursive"},
  {name: 'Sharp Script', family: "'Alex Brush', 'Pacifico', cursive"},
];

export default function SignatureModal({open, onClose, onSave, initialName = ''}: Props) {
  const [tab, setTab] = useState<'draw' | 'upload' | 'camera' | 'type' | 'qr'>('draw');
  const [inkColor, setInkColor] = useState('#000000'); // Default official black ink
  const [mounted, setMounted] = useState(false);

  // Draw State
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [isProcessingCamera, setIsProcessingCamera] = useState(false);

  // Type State
  const [typedName, setTypedName] = useState(initialName);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].family);

  // QR State
  const [qrSessionId] = useState(() => 'sig_' + Math.random().toString(36).substring(2, 10));
  const [qrSvg, setQrSvg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stop camera hardware cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle webcam lifecycle: turn on ONLY when on camera tab and open
  useEffect(() => {
    if (tab === 'camera' && open && !cameraPreview) {
      navigator.mediaDevices
        ?.getUserMedia({video: {facingMode: 'environment', width: {ideal: 1280}, height: {ideal: 720}}})
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => {
          alert('Could not access camera. Please check permissions or use Draw/Upload instead.');
          setTab('draw');
        });
    } else {
      stopCamera();
    }
  }, [tab, open, cameraPreview, stopCamera]);

  // Setup Draw Canvas
  useEffect(() => {
    if (tab === 'draw' && open && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 2.5;
      }
    }
  }, [tab, open, inkColor]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Upload File Selection with Auto-Background Removal
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingUpload(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const transparentPng = await processSignatureImage(String(reader.result), inkColor);
        setUploadedPreview(transparentPng);
      } catch (err) {
        console.error('Signature extraction error:', err);
        setUploadedPreview(String(reader.result));
      } finally {
        setIsProcessingUpload(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Capture Signature from Webcam & Auto-remove Paper BG
  const handleCaptureCamera = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const rawSnapshot = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();

    setIsProcessingCamera(true);
    try {
      const transparentPng = await processSignatureImage(rawSnapshot, inkColor);
      setCameraPreview(transparentPng);
    } catch {
      setCameraPreview(rawSnapshot);
    } finally {
      setIsProcessingCamera(false);
    }
  };

  // QR Mobile Polling
  useEffect(() => {
    if (tab === 'qr' && open) {
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}/sign/${qrSessionId}`
          : `https://careerform.ph/sign/${qrSessionId}`;
      generateQRCodeSVG(url).then(setQrSvg);

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sign-session?id=${qrSessionId}`);
          if (res.ok) {
            const json = await res.json();
            if (json.dataUrl) {
              clearInterval(interval);
              // Auto-process mobile upload into transparent PNG
              const cleanPng = await processSignatureImage(json.dataUrl, inkColor);
              onSave(cleanPng);
              onClose();
            }
          }
        } catch {}
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [tab, open, qrSessionId, inkColor, onSave, onClose]);

  // Apply Action
  const handleApply = async () => {
    if (tab === 'draw') {
      const canvas = drawCanvasRef.current;
      if (!canvas || !hasDrawn) return;
      const cleanPng = await processSignatureImage(canvas.toDataURL('image/png'), inkColor);
      onSave(cleanPng);
      onClose();
    } else if (tab === 'upload') {
      if (!uploadedPreview) return;
      onSave(uploadedPreview);
      onClose();
    } else if (tab === 'camera') {
      if (!cameraPreview) return;
      onSave(cameraPreview);
      stopCamera();
      onClose();
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = inkColor;
      ctx.font = `56px ${selectedFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 300, 90);
      const cleanPng = await processSignatureImage(canvas.toDataURL('image/png'), inkColor);
      onSave(cleanPng);
      onClose();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="sig-modal-backdrop"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="sig-modal-container"
        style={{maxWidth: '640px', width: '95%'}}
        onClick={e => e.stopPropagation()}
      >
        <div className="sig-modal-header">
          <div>
            <h3 className="sig-modal-title">E-Signature / Digital Signature</h3>
            <p className="sig-modal-subtitle">
              Official signature for Civil Service Commission (CS Form 212)
            </p>
          </div>
          <button
            type="button"
            className="btn-icon sig-modal-close"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '12px 20px 0',
            borderBottom: '1px solid #1e293b',
            overflowX: 'auto',
          }}
        >
          {[
            {id: 'draw', label: 'Draw', icon: PenTool},
            {id: 'upload', label: 'Upload File', icon: Upload},
            {id: 'camera', label: 'Webcam', icon: Camera},
            {id: 'type', label: 'Type Name', icon: Type},
            {id: 'qr', label: 'Mobile QR', icon: QrCode},
          ].map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`btn-ghost ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (tab === 'camera' && t.id !== 'camera') stopCamera();
                  setTab(t.id as any);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px 8px 0 0',
                  borderBottom: isActive ? '2px solid #06b6d4' : 'none',
                  color: isActive ? '#06b6d4' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="sig-modal-body" style={{padding: '20px'}}>
          {/* TAB 1: DRAW */}
          {tab === 'draw' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '200px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '2px dashed #cbd5e1',
                  overflow: 'hidden',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
              >
                <canvas
                  ref={drawCanvasRef}
                  style={{width: '100%', height: '100%'}}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {!hasDrawn && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: '14px',
                    }}
                  >
                    Draw your signature inside this box
                  </div>
                )}
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <span style={{fontSize: '12px', color: '#94a3b8'}}>Ink Color:</span>
                  {['#000000', '#0052cc', '#0f172a'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setInkColor(c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: c,
                        border: inkColor === c ? '2px solid #06b6d4' : '1px solid #475569',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={clearDrawing}
                  style={{fontSize: '12px', padding: '6px 12px'}}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD (Auto-removes background into transparent PNG) */}
          {tab === 'upload' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleFileSelect}
              />

              {isProcessingUpload ? (
                <div
                  style={{
                    padding: '40px 20px',
                    border: '1.5px solid #334155',
                    borderRadius: '10px',
                    background: '#090d16',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#06b6d4',
                  }}
                >
                  <RefreshCw size={28} className="animate-spin" />
                  <strong style={{fontSize: '14px', color: '#f8fafc'}}>
                    Auto-removing paper background...
                  </strong>
                  <span className="muted" style={{fontSize: '12px'}}>
                    Extracting ink strokes into transparent PNG
                  </span>
                </div>
              ) : !uploadedPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '36px 20px',
                    border: '2px dashed #334155',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#090d16',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      background: 'rgba(6,182,212,0.15)',
                      color: '#06b6d4',
                      borderRadius: '12px',
                    }}
                  >
                    <Upload size={28} />
                  </div>
                  <strong style={{fontSize: '15px', color: '#f8fafc'}}>
                    Click to select signature image
                  </strong>
                  <span className="muted" style={{fontSize: '12px', maxWidth: '340px'}}>
                    Upload a photo or scan of your signature. Paper background is automatically
                    removed into a transparent PNG with solid black ink.
                  </span>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center'}}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '180px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      // subtle transparency checkerboard
                      backgroundImage: `
                        linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
                        linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
                        linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                      `,
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview}
                      alt="Uploaded signature transparent preview"
                      style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#10b981',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} /> Transparent PNG • Solid Ink
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{fontSize: '12px'}}
                    onClick={() => {
                      setUploadedPreview(null);
                      fileInputRef.current?.click();
                    }}
                  >
                    <RotateCcw size={13} /> Choose Another Signature Image
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WEBCAM CAMERA */}
          {tab === 'camera' && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
              {isProcessingCamera ? (
                <div
                  style={{
                    padding: '40px 20px',
                    borderRadius: '10px',
                    background: '#090d16',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#06b6d4',
                  }}
                >
                  <RefreshCw size={28} className="animate-spin" />
                  <strong style={{fontSize: '14px', color: '#f8fafc'}}>
                    Extracting signature from camera...
                  </strong>
                  <span className="muted" style={{fontSize: '12px'}}>
                    Removing paper background and enhancing strokes
                  </span>
                </div>
              ) : !cameraPreview ? (
                <>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '240px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: '#000',
                      border: '2px solid #06b6d4',
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: '20px',
                        border: '1.5px dashed rgba(255,255,255,0.7)',
                        borderRadius: '8px',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(0,0,0,0.6)',
                          color: '#f8fafc',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        Hold signature paper flat in this box
                      </span>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        stopCamera();
                        setTab('draw');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCaptureCamera}
                    >
                      <Camera size={16} /> Capture Signature
                    </button>
                  </div>
                </>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%'}}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '180px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      backgroundImage: `
                        linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
                        linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
                        linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                      `,
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cameraPreview}
                      alt="Captured signature transparent preview"
                      style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#10b981',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} /> Paper Removed • Transparent PNG
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{fontSize: '12px'}}
                    onClick={() => {
                      setCameraPreview(null);
                    }}
                  >
                    <RotateCcw size={13} /> Retake Photo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TYPE */}
          {tab === 'type' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              <input
                type="text"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="Type your official full name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                {FONTS.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setSelectedFont(f.family)}
                    style={{
                      padding: '16px 12px',
                      borderRadius: '8px',
                      border: selectedFont === f.family ? '2px solid #06b6d4' : '1px solid #1e293b',
                      background: '#090d16',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontFamily: f.family,
                        fontSize: '24px',
                        color: '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {typedName || 'Juan Dela Cruz'}
                    </span>
                    <span className="muted" style={{fontSize: '11px', marginTop: '4px', display: 'block'}}>
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: QR */}
          {tab === 'qr' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                padding: '10px',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                dangerouslySetInnerHTML={{__html: qrSvg}}
              />
              <div style={{textAlign: 'center'}}>
                <strong style={{display: 'block', fontSize: '15px', color: '#f8fafc'}}>
                  Scan to Sign on Mobile
                </strong>
                <p className="muted" style={{fontSize: '13px', marginTop: '4px'}}>
                  Draw with your finger on your phone — signature will transfer to desktop automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className="sig-modal-footer"
          style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid #1e293b',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Cancel
          </button>
          {tab !== 'qr' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
              disabled={
                (tab === 'draw' && !hasDrawn) ||
                (tab === 'upload' && !uploadedPreview) ||
                (tab === 'camera' && !cameraPreview) ||
                (tab === 'type' && !typedName.trim())
              }
            >
              <Check size={16} /> Affix Official Signature
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
