'use client';

import React from 'react';

/**
 * Aurora background — port of SynCap's "Aurora BG" (CodePen zwaZJv).
 *
 * The pen is deceptively small: it paints two point lights and nothing else. Each light is a
 * literal 1px dot whose enormous `box-shadow` spread becomes a soft orb, dragged around the
 * viewport by the `move1` / `move2` position keyframes while `hue` cycles its hue over time.
 * Colours (#f00 / #0ff), timing (5s/10s and 10s/20s), opacity (0.18) and the `#000` field
 * match the pen exactly; the only addition is a vignette so page copy stays legible on it.
 *
 * Runs entirely in CSS (no canvas, no rAF) and is inert to input, so it can sit fixed behind
 * the whole page without fighting the form preview for frames.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora-bg" data-aurora="zwaZJv" aria-hidden="true">
      <span className="aurora-orb aurora-orb-a" />
      <span className="aurora-orb aurora-orb-b" />
      <span className="aurora-veil" />
    </div>
  );
}
