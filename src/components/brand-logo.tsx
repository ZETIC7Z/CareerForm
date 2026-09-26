'use client';

import { useSyncExternalStore } from 'react';

/**
 * The one place the CareerForm identity is drawn.
 *
 * Every surface (site header, workspace header, footer, dashboard rail) renders this
 * mark instead of spelling the name out in type — the artwork already contains the
 * wordmark, so a second text version would only duplicate and fight it.
 *
 * The artwork is the designer's own SVG, served as a static file and drawn with a plain
 * `<img>`: the flag emblem, the lettering and the two decorative pieces are all vector or
 * generously-sized raster inside that one file, so the browser scales it to whatever size
 * the slot needs and it stays sharp on any display — there is no raster of the lockup to go
 * soft, and nothing to re-export when the header changes height. Deliberately not
 * `next/image`: the optimizer has nothing to do with an SVG (Next only passes one through
 * with `unoptimized`/`dangerouslyAllowSVG` set) and it would be a pointless extra hop.
 *
 * Two files, but only one of them is ever on the page. `/careerform-logo.svg` is the export
 * as delivered — white lettering for the near-black theme. `/careerform-logo-light.svg` is
 * generated from it by `scripts/make-brand-assets.mjs`: the same lockup in the light
 * theme's ink, with the two black shadow copies the export layers behind the lettering
 * dropped, because on a pale page those read as a drop shadow the mark should not have.
 * Both share one trimmed viewBox, so the swap never moves or resizes the mark.
 *
 * The theme is not React state — it lives on `<html data-theme>`, written by the inline
 * script in layout.tsx before the first paint and flipped by ThemeToggle. It is therefore
 * read as an external store: `useSyncExternalStore` answers with the dark artwork for the
 * server render and for the hydration pass (which must match the server), then re-renders
 * with the real theme moments later. A visitor sitting in light mode can see the dark
 * wordmark for that instant — the emblem and the lettering are both legible either way —
 * and the light artwork is normally already in the browser cache from their last visit.
 *
 * No shadow is added anywhere: the mark is drawn exactly as it was exported. The glow the
 * CSS used to apply on top of the artwork is gone on purpose.
 */
const MARKS = {
  dark: '/careerform-logo.svg',
  light: '/careerform-logo-light.svg',
} as const;

type Theme = keyof typeof MARKS;

/**
 * The trimmed frame the two files share (`viewBox="7 2 1412 304"`). Stating it here keeps
 * the intrinsic size — and therefore the layout — known before either file has loaded; no
 * artwork is ever drawn into a zero-height box and then pushed the header around.
 */
const MARK_WIDTH = 1412;
const MARK_HEIGHT = 304;

// One observer for every mark on the page (a route can draw three of them), created on the
// first subscription and dropped again when the last one goes away.
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribeToTheme(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  observer ??= new MutationObserver(() => listeners.forEach(notify => notify()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

// The site's default (and what layout.tsx server-renders on <html>) is dark, so the
// hydration pass must agree with it.
const serverTheme = (): Theme => 'dark';

export default function BrandMark({
  height = 'clamp(30px, 3.6vw, 56px)',
  className = '',
  priority = false,
  title = 'CareerForm PH',
  style,
}: {
  height?: number | string;
  className?: string;
  priority?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, serverTheme);
  return (
    <span className={`brand-mark-wrap ${className}`.trim()} data-title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG has nothing to optimize */}
      <img
        src={MARKS[theme]}
        alt={title}
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className="brand-mark"
        // The ratio is pinned as well as declared, because the artwork is replaced on a
        // theme toggle: a src change on an already laid-out image can leave Chrome
        // reporting a bogus intrinsic ratio, which collapsed `width: auto` down to about
        // half the mark's width. Both files share the frame, so stating it keeps every
        // size correct.
        style={{
          height,
          width: 'auto',
          aspectRatio: `${MARK_WIDTH} / ${MARK_HEIGHT}`,
          objectFit: 'contain',
          ...style,
        }}
      />
    </span>
  );
}
