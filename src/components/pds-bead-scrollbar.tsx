'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PdsBeadScrollbarProps {
  targetRef: React.RefObject<HTMLElement | null>;
}

const BEAD_SIZE = 18; // Diameter of the glowing bead

export default function PdsBeadScrollbar({ targetRef }: PdsBeadScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [beadTop, setBeadTop] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = targetRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const currentTrackHeight = track.clientHeight;
    setTrackHeight(currentTrackHeight);

    const maxScroll = el.scrollHeight - el.clientHeight;
    const scrollable = maxScroll > 2;
    setIsScrollable(scrollable);

    if (!scrollable) {
      setBeadTop(0);
      return;
    }

    const ratio = Math.max(0, Math.min(1, el.scrollTop / maxScroll));
    const maxBeadTop = Math.max(0, currentTrackHeight - BEAD_SIZE);
    setBeadTop(ratio * maxBeadTop);
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updatePosition);

    const ro = new ResizeObserver(() => {
      updatePosition();
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    updatePosition();

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updatePosition);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetRef, updatePosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = targetRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    e.preventDefault();
    e.stopPropagation();

    const trackRect = track.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const maxBeadTop = Math.max(0, track.clientHeight - BEAD_SIZE);
    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll <= 0) return;

    const isClickOnBead = clickY >= beadTop - 4 && clickY <= beadTop + BEAD_SIZE + 4;

    if (!isClickOnBead) {
      const newRatio = Math.max(0, Math.min(1, (clickY - BEAD_SIZE / 2) / maxBeadTop));
      el.scrollTop = newRatio * maxScroll;
      setBeadTop(newRatio * maxBeadTop);
    }

    setIsDragging(true);
    dragStartRef.current = {
      startY: e.clientY,
      startScrollTop: el.scrollTop,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current || !targetRef.current || !trackRef.current) return;
      const currentTrack = trackRef.current;
      const currentEl = targetRef.current;
      const curMaxBeadTop = Math.max(1, currentTrack.clientHeight - BEAD_SIZE);
      const curMaxScroll = currentEl.scrollHeight - currentEl.clientHeight;

      const deltaY = moveEvent.clientY - dragStartRef.current.startY;
      const deltaScroll = (deltaY / curMaxBeadTop) * curMaxScroll;

      currentEl.scrollTop = dragStartRef.current.startScrollTop + deltaScroll;
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const beadCenter = beadTop + BEAD_SIZE / 2;

  return (
    <div
      ref={trackRef}
      className={`pds-bead-scrollbar-track ${isDragging ? 'is-dragging' : ''} ${!isScrollable ? 'is-disabled' : ''}`}
      onPointerDown={handlePointerDown}
      role="scrollbar"
      aria-controls="wc-content-scroll"
      aria-orientation="vertical"
      aria-valuenow={Math.round((beadTop / Math.max(1, trackHeight - BEAD_SIZE)) * 100)}
      title="Scroll form"
    >
      {/* Top subtle wire segment */}
      <div
        className="bead-wire-top"
        style={{ height: `${Math.max(0, beadCenter)}px` }}
        aria-hidden="true"
      />

      {/* Bottom illuminated wire segment (matching Image 5) */}
      <div
        className="bead-wire-bottom"
        style={{
          top: `${beadCenter}px`,
          height: `${Math.max(0, trackHeight - beadCenter)}px`,
        }}
        aria-hidden="true"
      />

      {/* Glowing circular bead thumb (outer ring + inner solid dot) */}
      <div
        className={`bead-thumb ${isDragging ? 'dragging' : ''}`}
        style={{ transform: `translate3d(0, ${beadTop}px, 0)` }}
        aria-hidden="true"
      >
        <div className="bead-inner-dot" />
      </div>
    </div>
  );
}
