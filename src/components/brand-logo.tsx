'use client';

import Image from 'next/image';

/**
 * The one place the CareerForm identity is drawn.
 *
 * Every surface (site header, workspace header, footer, dashboard rail) renders this
 * mark instead of spelling the name out in type — the artwork already contains the
 * wordmark, so a second text version would only duplicate and fight it.
 *
 * The file has a real alpha channel, so it sits on the dark glass chrome untouched.
 * `priority` should only be set for the instance that is above the fold.
 */
export default function BrandMark({
  height = 32,
  className = '',
  priority = false,
  title = 'CareerForm PH',
  style,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Image
      src="/careerform-logo.png"
      alt={title}
      width={1920}
      height={700}
      priority={priority}
      // Only ~2.8x the rendered height is ever needed, so the browser never pulls the
      // full 1920px asset for a 30px mark.
      sizes={`${Math.round(height * 2.8)}px`}
      className={className}
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block', ...style }}
    />
  );
}
