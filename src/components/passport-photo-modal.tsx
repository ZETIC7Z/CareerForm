'use client';

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {
  X,
  Upload,
  Camera,
  QrCode,
  Sparkles,
  Scissors,
  Paintbrush,
  RefreshCw,
  Check,
  RotateCcw,
  ChevronLeft,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {generateQRCodeSVG} from '@/lib/qr-code';
import {removePhotoBackground, RemoveBgProgress} from '@/lib/ai-background-removal';
import {
  enhanceImageHD,
  compositeBackgroundColor,
  cropToPassportRatio,
  checkHasTransparency,
} from '@/lib/photo-enhancer';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (photoDataUrl: string) => void;
};

// 2D Color Picker Component for Passport Photo Background
function PhotoBgColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const [hexInput, setHexInput] = useState(color);
  const [hue, setHue] = useState(0);
  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const updateFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const sat = x;
      const val = 1 - y;
      const rgb = hsvToRgb(hue, sat, val);
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      setHexInput(hex);
      onChange(hex);
    },
    [hue, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingSatVal.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSatVal.current) return;
    updateFromCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDraggingSatVal.current = false;
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(e.target.value);
    setHue(h);
    const rgb = hsvToRgb(h, 1, 1);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    setHexInput(hex);
    onChange(hex);
  };

  return (
    <div
      className="picker-modal-box"
      style={{
        padding: '12px',
        background: '#090d16',
        borderRadius: '10px',
        border: '1px solid #1e293b',
      }}
    >
      <div
        ref={satValRef}
        className="picker-sat-val-canvas"
        style={{
          width: '100%',
          height: '100px',
          borderRadius: '8px',
          cursor: 'crosshair',
          position: 'relative',
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0), #000),
            linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
          `,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div style={{marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span style={{fontSize: '11px', color: '#94a3b8', width: '28px'}}>Hue</span>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={handleHueChange}
          style={{
            flex: 1,
            height: '10px',
            borderRadius: '5px',
            appearance: 'none',
            background:
              'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            cursor: 'pointer',
          }}
        />
      </div>
      <div style={{marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span style={{fontSize: '11px', color: '#94a3b8', width: '28px'}}>HEX</span>
        <input
          type="text"
          value={hexInput}
          onChange={e => {
            setHexInput(e.target.value);
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          placeholder="#ffffff"
          style={{
            flex: 1,
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#f8fafc',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        />
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: color,
            border: '1px solid #475569',
          }}
        />
      </div>
    </div>
  );
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
  else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
  else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
  else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export default function PassportPhotoModal({open, onClose, onSave}: Props) {
  const [stage, setStage] = useState<'menu' | 'camera' | 'qr' | 'studio'>('menu');
  const [mounted, setMounted] = useState(false);

  // Raw original image cropped to 4.5 x 3.5 ratio
  const [rawOriginal, setRawOriginal] = useState<string | null>(null);

  // Studio tool states
  const [bgRemovedCutout, setBgRemovedCutout] = useState<string | null>(null);
  const [isBgRemoved, setIsBgRemoved] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);

  // Background color selection for transparent photos
  const [selectedBgColor, setSelectedBgColor] = useState<string | null>(null); // null means transparent
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Active composite preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Async processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);

  // Camera stream management
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR mobile session state
  const [qrSessionId] = useState(() => 'photo_' + Math.random().toString(36).substring(2, 10));
  const [qrSvg, setQrSvg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Webcam init
  useEffect(() => {
    if (stage === 'camera' && open) {
      navigator.mediaDevices
        ?.getUserMedia({video: {facingMode: 'user', width: {ideal: 1280}, height: {ideal: 720}}})
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => {
          alert('Could not access webcam. Please upload an image file instead.');
          setStage('menu');
        });
    } else {
      stopCamera();
    }
  }, [stage, open, stopCamera]);

  // Mobile QR init & polling
  useEffect(() => {
    if (stage === 'qr') {
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}/sign/${qrSessionId}?type=photo`
          : `https://careerform.ph/sign/${qrSessionId}?type=photo`;
      generateQRCodeSVG(url).then(setQrSvg);

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sign-session?id=${qrSessionId}`);
          if (res.ok) {
            const json = await res.json();
            if (json.dataUrl) {
              clearInterval(interval);
              initStudioWithImage(json.dataUrl);
            }
          }
        } catch {}
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [stage, qrSessionId]);

  // Initialize studio with uploaded raw image
  const initStudioWithImage = async (dataUrl: string) => {
    setIsProcessing(true);
    setProcessingMessage('Preparing photo for 4.5cm × 3.5cm standard...');
    try {
      // Standardize to official 4.5cm x 3.5cm CSC ratio
      const cropped = await cropToPassportRatio(dataUrl, 413, 531);
      const hasAlpha = await checkHasTransparency(cropped);

      setRawOriginal(cropped);
      setBgRemovedCutout(null);
      setIsBgRemoved(false);
      setIsEnhanced(false);
      setIsTransparent(hasAlpha);
      setSelectedBgColor(null);
      setPreviewImage(cropped);
      setStage('studio');
    } catch {
      setRawOriginal(dataUrl);
      setPreviewImage(dataUrl);
      setStage('studio');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
      setProgressPercent(null);
    }
  };

  // Re-composite preview when tool states change
  const updateComposite = useCallback(
    async (
      baseCutout: string | null,
      bgRemoved: boolean,
      enhanced: boolean,
      bgColor: string | null
    ) => {
      if (!rawOriginal) return;

      let current = bgRemoved && baseCutout ? baseCutout : rawOriginal;

      // Apply HD enhancement if active
      if (enhanced) {
        try {
          current = await enhanceImageHD(current);
        } catch (err) {
          console.error('Enhance failed:', err);
        }
      }

      // Apply background color fill if image has transparency or background was removed
      if ((bgRemoved || isTransparent) && bgColor && bgColor !== 'transparent') {
        try {
          current = await compositeBackgroundColor(current, bgColor);
        } catch (err) {
          console.error('Color composite failed:', err);
        }
      }

      setPreviewImage(current);
    },
    [rawOriginal, isTransparent]
  );

  // Tool 1: AI Background Removal (Suvink/cut-it-out - @imgly/background-removal)
  const handleRemoveBackground = async () => {
    if (!rawOriginal) return;
    setIsProcessing(true);
    setProcessingMessage('AI Model removing background (Cut-It-Out)...');
    setProgressPercent(10);

    try {
      const cutout = await removePhotoBackground(rawOriginal, (p: RemoveBgProgress) => {
        setProgressPercent(p.percent);
        setProcessingMessage(`AI Model segmenting subject... ${p.percent}%`);
      });

      setBgRemovedCutout(cutout);
      setIsBgRemoved(true);
      setIsTransparent(true);

      // Default to official CSC white background if none chosen yet, or preserve user's choice
      const colorToApply = selectedBgColor || '#ffffff';
      setSelectedBgColor(colorToApply);

      await updateComposite(cutout, true, isEnhanced, colorToApply);
    } catch (err) {
      console.error('Background removal failed:', err);
      alert('AI background removal encountered an issue. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
      setProgressPercent(null);
    }
  };

  // Tool 2: AI HD Image Enhancer & Pixel Restorer
  const handleToggleEnhance = async () => {
    if (!rawOriginal) return;
    const nextState = !isEnhanced;
    setIsEnhanced(nextState);

    setIsProcessing(true);
    setProcessingMessage(
      nextState
        ? 'Restoring pixels, sharpening contours & enhancing HD...'
        : 'Reverting enhancement...'
    );

    try {
      await updateComposite(bgRemovedCutout, isBgRemoved, nextState, selectedBgColor);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Tool 3: Apply Background Color
  const handleSelectBgColor = async (color: string | null) => {
    setSelectedBgColor(color);
    setIsProcessing(true);
    setProcessingMessage('Applying background color...');
    try {
      await updateComposite(bgRemovedCutout, isBgRemoved, isEnhanced, color);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Reset all adjustments to raw original
  const handleResetToOriginal = () => {
    if (!rawOriginal) return;
    setIsBgRemoved(false);
    setBgRemovedCutout(null);
    setIsEnhanced(false);
    setSelectedBgColor(null);
    setShowCustomPicker(false);
    setPreviewImage(rawOriginal);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror horizontally for selfie webcam
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    initStudioWithImage(dataUrl);
  };

  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      initStudioWithImage(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (previewImage || rawOriginal) {
      onSave(previewImage || rawOriginal!);
      onClose();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="sig-modal-backdrop" onClick={onClose}>
      <div
        className="sig-modal-container"
        style={{maxWidth: stage === 'studio' ? '880px' : '560px', width: '95%'}}
        onClick={e => e.stopPropagation()}
      >
        <div className="sig-modal-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {stage !== 'menu' && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  stopCamera();
                  setStage('menu');
                }}
                title="Back to options"
                style={{marginRight: '4px'}}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="sig-modal-title">
                {stage === 'studio'
                  ? 'Official Passport Photo Studio (CS Form 212)'
                  : stage === 'camera'
                  ? 'Take Passport Photo'
                  : stage === 'qr'
                  ? 'Upload Photo from Mobile Phone'
                  : 'Add Passport Photo (Page 4)'}
              </h3>
              <p className="sig-modal-subtitle">
                Civil Service Commission standard: 4.5 cm × 3.5 cm • Philippine Government PDS
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon sig-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sig-modal-body" style={{padding: '20px'}}>
          {/* MENU STAGE */}
          {stage === 'menu' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '14px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleDeviceFileSelect}
              />
              <button
                type="button"
                className="sig-option-card"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '26px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  className="sig-opt-icon"
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    padding: '14px',
                    borderRadius: '12px',
                  }}
                >
                  <Upload size={28} />
                </div>
                <strong style={{fontSize: '15px'}}>Upload from Device</strong>
                <span className="muted" style={{fontSize: '12px', textAlign: 'center'}}>
                  JPG, PNG or WEBP from your computer
                </span>
              </button>

              <button
                type="button"
                className="sig-option-card"
                onClick={() => setStage('camera')}
                style={{
                  padding: '26px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  className="sig-opt-icon"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '14px',
                    borderRadius: '12px',
                  }}
                >
                  <Camera size={28} />
                </div>
                <strong style={{fontSize: '15px'}}>Take with Camera</strong>
                <span className="muted" style={{fontSize: '12px', textAlign: 'center'}}>
                  Capture photo directly using your webcam
                </span>
              </button>

              <button
                type="button"
                className="sig-option-card"
                onClick={() => setStage('qr')}
                style={{
                  padding: '26px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  className="sig-opt-icon"
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    padding: '14px',
                    borderRadius: '12px',
                  }}
                >
                  <QrCode size={28} />
                </div>
                <strong style={{fontSize: '15px'}}>Upload via Phone QR</strong>
                <span className="muted" style={{fontSize: '12px', textAlign: 'center'}}>
                  Scan with iPhone or Android to upload selfie
                </span>
              </button>
            </div>
          )}

          {/* CAMERA STAGE */}
          {stage === 'camera' && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
              <div
                style={{
                  position: 'relative',
                  width: '320px',
                  height: '411px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#000',
                  border: '2px solid #06b6d4',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)'}}
                />
                {/* 4.5cm x 3.5cm Silhouette Framing Guide */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '18px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.6)',
                    borderRadius: '8px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '150px',
                      height: '190px',
                      border: '1.5px solid rgba(6, 182, 212, 0.7)',
                      borderRadius: '50% 50% 40% 40%',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
              <p className="muted" style={{fontSize: '13px'}}>
                Position head and shoulders inside the frame
              </p>
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="button" className="btn btn-ghost" onClick={() => setStage('menu')}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCaptureSnapshot}>
                  <Camera size={16} /> Take Photo
                </button>
              </div>
            </div>
          )}

          {/* QR STAGE */}
          {stage === 'qr' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
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
                  Scan with your Mobile Phone
                </strong>
                <p className="muted" style={{fontSize: '13px', marginTop: '4px'}}>
                  Take a selfie or select a photo on your phone — it will appear here automatically.
                </p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setStage('menu')}>
                Back
              </button>
            </div>
          )}

          {/* STUDIO STAGE (Raw Image Displayed by Default + 3 Dedicated Manual Tools) */}
          {stage === 'studio' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Photo Preview Box (3.5cm x 4.5cm) */}
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'}}>
                <div
                  style={{
                    position: 'relative',
                    width: '260px',
                    height: '334px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #334155',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    // Checkerboard background for transparent preview
                    backgroundImage: `
                      linear-gradient(45deg, #1e293b 25%, transparent 25%),
                      linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #1e293b 75%),
                      linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                    `,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#090d16',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImage || rawOriginal || ''}
                    alt="Passport photo preview"
                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                  />

                  {/* Processing Overlay with Progress Bar */}
                  {isProcessing && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(9, 13, 22, 0.85)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        gap: '10px',
                        color: '#38bdf8',
                        textAlign: 'center',
                        zIndex: 10,
                      }}
                    >
                      <RefreshCw size={24} className="animate-spin" />
                      <span style={{fontSize: '12px', fontWeight: 600, color: '#f8fafc'}}>
                        {processingMessage || 'Processing...'}
                      </span>
                      {progressPercent !== null && (
                        <div
                          style={{
                            width: '80%',
                            height: '6px',
                            background: '#1e293b',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginTop: '4px',
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPercent}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                              transition: 'width 0.2s ease',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Official CSC Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    4.5 cm × 3.5 cm (CSC Standard)
                  </div>

                  {/* Active Tool Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'flex-end',
                    }}
                  >
                    {isBgRemoved && (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.9)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        BG Removed
                      </span>
                    )}
                    {isEnhanced && (
                      <span
                        style={{
                          background: 'rgba(6, 182, 212, 0.9)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        HD Enhanced
                      </span>
                    )}
                  </div>
                </div>

                <div style={{display: 'flex', gap: '8px', width: '260px'}}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{flex: 1, fontSize: '11px', padding: '6px 10px'}}
                    onClick={handleResetToOriginal}
                    title="Reset all adjustments back to raw uploaded image"
                  >
                    <RotateCcw size={13} /> Reset Original
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{flex: 1, fontSize: '11px', padding: '6px 10px'}}
                    onClick={() => {
                      setRawOriginal(null);
                      setPreviewImage(null);
                      setStage('menu');
                    }}
                  >
                    Change Photo
                  </button>
                </div>
              </div>

              {/* Right Column: 3 Dedicated Manual Tools */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Raw photo loaded. Choose any tool below to adjust:</span>
                </div>

                {/* TOOL 1: Remove Photo Background */}
                <div
                  style={{
                    background: '#0f172a',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: isBgRemoved ? '1px solid #10b981' : '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isBgRemoved
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(6, 182, 212, 0.15)',
                          color: isBgRemoved ? '#10b981' : '#06b6d4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Scissors size={18} />
                      </div>
                      <div>
                        <strong style={{fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px'}}>
                          Tool 1: Remove Photo Background (AI)
                          {isBgRemoved && (
                            <span style={{color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px'}}>
                              <Check size={12} /> Active
                            </span>
                          )}
                        </strong>
                        <span className="muted" style={{fontSize: '11px'}}>
                          Uses Cut-It-Out AI model to isolate the subject into transparent PNG
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn ${isBgRemoved ? 'btn-ghost' : 'btn-primary'}`}
                      style={{fontSize: '12px', padding: '6px 14px'}}
                      disabled={isProcessing}
                      onClick={handleRemoveBackground}
                    >
                      {isBgRemoved ? (
                        <>
                          <RotateCcw size={13} /> Re-run AI Cut
                        </>
                      ) : (
                        <>
                          <Scissors size={13} /> Remove Background
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TOOL 2: Enhance Image (HD Restoration) */}
                <div
                  style={{
                    background: '#0f172a',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: isEnhanced ? '1px solid #06b6d4' : '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isEnhanced
                            ? 'rgba(6, 182, 212, 0.25)'
                            : 'rgba(168, 85, 247, 0.15)',
                          color: isEnhanced ? '#06b6d4' : '#a855f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <strong style={{fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px'}}>
                          Tool 2: Enhance Image (AI HD Restoration)
                          {isEnhanced && (
                            <span style={{color: '#06b6d4', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px'}}>
                              <Check size={12} /> HD Active
                            </span>
                          )}
                        </strong>
                        <span className="muted" style={{fontSize: '11px'}}>
                          Fixes blur, sharpens facial details, contours, and restores pixels to HD
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn ${isEnhanced ? 'btn-ghost' : 'btn-primary'}`}
                      style={{fontSize: '12px', padding: '6px 14px'}}
                      disabled={isProcessing}
                      onClick={handleToggleEnhance}
                    >
                      {isEnhanced ? (
                        <>
                          <RotateCcw size={13} /> Revert Normal
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> Enhance to HD
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TOOL 3: Add Background Color (For Transparent Images or After BG Removal) */}
                <div
                  style={{
                    background: '#0f172a',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#eab308',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Paintbrush size={18} />
                      </div>
                      <div>
                        <strong style={{fontSize: '13px', color: '#f8fafc'}}>
                          Tool 3: Add Background Color
                        </strong>
                        <span className="muted" style={{fontSize: '11px'}}>
                          Fills transparent areas with official CSC solid white, sky blue, or custom color
                        </span>
                      </div>
                    </div>

                    {!(isBgRemoved || isTransparent) && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#f59e0b',
                          background: 'rgba(245, 158, 11, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={12} /> Use Tool 1 first for non-transparent photo
                      </span>
                    )}
                  </div>

                  {/* Swatches & Color Picker */}
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                    {[
                      {label: 'CSC White', hex: '#ffffff', recommended: true},
                      {label: 'Sky Blue', hex: '#0052cc'},
                      {label: 'Soft Cream', hex: '#fef3c7'},
                      {label: 'Light Gray', hex: '#e2e8f0'},
                      {label: 'Transparent', hex: 'transparent'},
                    ].map(s => {
                      const isSelected =
                        s.hex === 'transparent'
                          ? selectedBgColor === null || selectedBgColor === 'transparent'
                          : selectedBgColor?.toLowerCase() === s.hex.toLowerCase();

                      return (
                        <button
                          key={s.hex}
                          type="button"
                          onClick={() => {
                            setShowCustomPicker(false);
                            handleSelectBgColor(s.hex === 'transparent' ? null : s.hex);
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: isSelected ? '2px solid #06b6d4' : '1px solid #334155',
                            background: isSelected ? '#1e293b' : '#090d16',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              background: s.hex === 'transparent' ? '#334155' : s.hex,
                              border: '1px solid #64748b',
                              display: 'inline-block',
                            }}
                          />
                          {s.label}
                          {s.recommended && (
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                fontSize: '9px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontWeight: 600,
                              }}
                            >
                              CSC Standard
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setShowCustomPicker(!showCustomPicker)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: showCustomPicker ? '2px solid #06b6d4' : '1px solid #334155',
                        background: '#090d16',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      Custom Color...
                    </button>
                  </div>

                  {showCustomPicker && (
                    <div style={{marginTop: '6px'}}>
                      <PhotoBgColorPicker
                        color={customBgColor}
                        onChange={hex => {
                          setCustomBgColor(hex);
                          handleSelectBgColor(hex);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* CSC Compliance Notice */}
                <div
                  style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <ShieldCheck size={18} color="#06b6d4" style={{flexShrink: 0}} />
                  <p style={{margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4}}>
                    <strong style={{color: '#f8fafc'}}>CSC Form 212 Requirement:</strong> Official
                    passport-size photo (4.5 cm × 3.5 cm) must show a front view with natural expression
                    against a plain, solid white background taken within the last 6 months.
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{display: 'flex', gap: '10px', marginTop: '6px'}}>
                  <button type="button" className="btn btn-ghost" style={{flex: 1}} onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{flex: 2, padding: '10px 16px', fontSize: '13px'}}
                    onClick={handleApply}
                    disabled={isProcessing}
                  >
                    <Check size={16} /> Affix to Page 4 Photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
