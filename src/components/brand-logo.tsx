'use client';

import { useSyncExternalStore } from 'react';
import Image from 'next/image';

/**
 * The one place the CareerForm identity is drawn.
 *
 * Every surface (site header, workspace header, footer, dashboard rail) renders this
 * mark instead of spelling the name out in type — the artwork already contains the
 * wordmark, so a second text version would only duplicate and fight it.
 *
 * Two artworks, but only one of them is ever on the page. `/careerform-logo.png`
 * (navy/gold lettering) is drawn for the near-black dark theme; `/careerform-logo-light.png`
 * (gold/blue on transparent) is the light-theme twin, cropped from the same 1920x450 source
 * to the same ink box, so both share the exact 1879x361 geometry and render at the same size
 * and position. Which `<Image>` is mounted follows the live theme, so a page never carries a
 * second, invisible logo: previously both were always mounted and the browser still fetched
 * and decoded the mark that CSS then hid — a second `<img>`, a wasted request, and a
 * duplicate `alt` on every surface that draws the mark.
 *
 * The theme is not React state — it lives on `<html data-theme>`, written by the inline
 * script in layout.tsx before the first paint and flipped by ThemeToggle. It is therefore
 * read as an external store: `useSyncExternalStore` answers with the dark artwork for the
 * server render and for the hydration pass (which must match the server), then re-renders
 * with the real theme moments later. A visitor sitting in light mode can see the dark
 * wordmark for that instant — it is navy/gold on white and reads fine — and the light
 * artwork is normally already in the browser cache from their last visit.
 *
 * `priority` should only be set for the instance that is above the fold. It maps to
 * `loading="eager"` / `fetchPriority="high"` rather than Next 16's deprecated `priority`
 * (which emits a `<link rel="preload">`) because the preloaded URL would be whichever
 * artwork the server rendered, i.e. the wrong one for half of all visitors.
 */
const MARKS = {
  dark: '/careerform-logo.png',
  light: '/careerform-logo-light.png',
} as const;

type Theme = keyof typeof MARKS;

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
  const numeric = typeof height === 'number' ? height : 56;
  return (
    <span className={`brand-mark-wrap ${className}`.trim()} data-title={title}>
      <Image
        src={MARKS[theme]}
        alt={title}
        width={1879}
        height={361}
        // The mark is only ever drawn a couple of hundred pixels wide, so the browser is
        // told that up front and never pulls the full 1880px asset for it.
        sizes={`${Math.round(numeric * 5.2)}px`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        className="brand-mark"
        // `aspectRatio` is pinned (rather than left to the attributes' `auto 1879 / 361`)
        // because the artwork is replaced on a theme toggle: a src change on an already
        // laid-out srcset image can leave Chrome reporting a bogus intrinsic ratio, which
        // collapsed `width: auto` down to about half the mark's width. The ratio is the
        // same for both artworks, so stating it here keeps every size correct.
        style={{ height, width: 'auto', aspectRatio: '1879 / 361', objectFit: 'contain', ...style } as React.CSSProperties}
      />
    </span>
  );
}
