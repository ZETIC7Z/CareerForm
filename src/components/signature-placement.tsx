'use client';

import {useState, useRef, useEffect} from 'react';
import {Move, Check, Edit2, RotateCcw, Trash2, ShieldCheck, PenTool} from 'lucide-react';
import SignatureModal from './signature-modal';

type Props = {
  signatureUrl?: string;
  signDate?: string;
  onChange: (signatureUrl?: string, signDate?: string) => void;
  applicantName?: string;
};

export default function SignaturePlacement({
  signatureUrl,
  signDate,
  onChange,
  applicantName = '',
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dateEnabled, setDateEnabled] = useState(Boolean(signDate ?? true));
  const [currentDate, setCurrentDate] = useState(
    signDate ||
      new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date())
  );

  useEffect(() => {
    if (signDate !== undefined) {
      setDateEnabled(Boolean(signDate));
      if (signDate) setCurrentDate(signDate);
    }
  }, [signDate]);
  const [size, setSize] = useState({width: 320, height: 90});
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({x: 0, y: 0});
  const [position, setPosition] = useState({x: 0, y: 0});
  const [isFocused, setIsFocused] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).classList.contains('sig-handle')) return;
    setIsDragging(true);
    setDragStart({x: e.clientX - position.x, y: e.clientY - position.y});
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(-100, Math.min(100, e.clientX - dragStart.x)),
      y: Math.max(-40, Math.min(40, e.clientY - dragStart.y)),
    });
  };

  const handlePointerUpDrag = () => {
    setIsDragging(false);
  };

  // Resize handle
  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const onMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;
      setSize({
        width: Math.max(180, Math.min(440, startW + dx)),
        height: Math.max(55, Math.min(130, startH + dy * 0.7)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsResizing(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const toggleDate = () => {
    const next = !dateEnabled;
    setDateEnabled(next);
    onChange(signatureUrl, next ? currentDate : undefined);
  };

  const handleApplySignature = (newSignature: string, date?: string) => {
    if (date) setCurrentDate(date);
    onChange(newSignature, dateEnabled ? (date || currentDate) : undefined);
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
  };

  return (
    <div className="sig-placement-wrapper">
      {!signatureUrl ? (
        <div className="sig-placeholder-box">
          <div className="sig-placeholder-content">
            <div className="sig-placeholder-icon"><PenTool size={28} /></div>
            <h4>E-Signature / Digital Signature</h4>
            <p className="muted">Affix your official e-signature for the Civil Service Commission PDS 2026.</p>
            <button
              type="button"
              className="btn btn-primary sig-affix-btn"
              onClick={() => setModalOpen(true)}
            >
              <PenTool size={16} /> Affix Signature
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`sig-interactive-box ${isFocused ? 'is-selected' : ''}`}
          style={{
            width: `${size.width}px`,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          }}
          onClick={() => setIsFocused(true)}
        >
          {/* Floating Tool Strip (Matching Image 1: media_1789349236891.png) */}
          <div className="sig-floating-toolbar" role="toolbar" aria-label="Signature tools">
            <button
              type="button"
              className="sig-tool-btn"
              title="Drag to reposition"
              onPointerDown={handlePointerDownDrag}
              onPointerMove={handlePointerMoveDrag}
              onPointerUp={handlePointerUpDrag}
            >
              <Move size={15} />
            </button>
            <span className="sig-tool-divider" />
            <button
              type="button"
              className="sig-tool-btn sig-tool-text"
              onClick={() => setIsFocused(false)}
              title="Confirm placement"
            >
              <Check size={14} /> OK
            </button>
            <button
              type="button"
              className="sig-tool-btn sig-tool-stamp"
              onClick={toggleDate}
              title="Toggle date stamp"
            >
              Stamp <i className="sig-stamp-dot" />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={dateEnabled}
              className={`sig-pill-toggle ${dateEnabled ? 'active' : ''}`}
              onClick={toggleDate}
              title={dateEnabled ? 'Date stamp included' : 'Click to include date'}
            >
              <span className="sig-toggle-handle" />
            </button>
            <button
              type="button"
              className="sig-tool-btn"
              onClick={() => setModalOpen(true)}
              title="Edit / Replace signature"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              type="button"
              className="sig-tool-btn"
              onClick={() => setPosition({x: 0, y: 0})}
              title="Reset position"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="sig-tool-btn danger"
              onClick={handleRemove}
              title="Remove signature"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Interactive Bounding Frame with Resize Handles */}
          <div className="sig-selection-frame">
            {/* 4 Corner Resize Handles */}
            <span className="sig-handle top-left" />
            <span className="sig-handle top-right" />
            <span className="sig-handle bottom-left" />
            <span
              className="sig-handle bottom-right resize-active"
              onPointerDown={handleResizeStart}
              title="Drag to resize"
            />

            {/* Signature Image */}
            <div className="sig-image-container" style={{height: `${size.height}px`}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureUrl}
                alt="Affixed official signature"
                className="sig-placed-image"
                draggable={false}
              />
            </div>

            {/* Verification Stamp at Bottom-Left (Matching Image 1) */}
            {dateEnabled && (
              <div className="sig-verification-stamp" aria-label={`Signed on ${currentDate}`}>
                <ShieldCheck size={13} className="sig-check-icon" />
                <span>Signed · {currentDate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature Studio Modal */}
      {modalOpen && (
        <SignatureModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleApplySignature}
          initialName={applicantName}
        />
      )}
    </div>
  );
}
