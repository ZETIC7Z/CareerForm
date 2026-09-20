export interface PatchNote {
  id: string;
  date: string;
  version: string;
  isLatest?: boolean;
  title: string;
  changes: string[];
}

/**
 * Site Patch Notes & Update History.
 * Always kept in reverse chronological order (newest patch at the very top).
 */
export const PATCH_NOTES: PatchNote[] = [
  {
    id: 'patch-2026-09-20-3',
    date: 'Sep 20, 2026',
    version: 'v1.2.6',
    isLatest: true,
    title: 'Signature Transparency & Grid Precision',
    changes: [
      'Removed white background block — transparent PNG signatures now preserve 100% alpha transparency on the official form',
      'Auto-resized and centered signature inside cell bounds so ink stays bold and never crosses borders',
      'Restored Vocational / Trade Course horizontal grid line across the entire education section',
      'Added live Site Updates & Patch Notes box to track all releases and improvements',
    ],
  },
  {
    id: 'patch-2026-09-20-2',
    date: 'Sep 20, 2026',
    version: 'v1.2.5',
    title: 'Fullscreen Preview & Export Controls',
    changes: [
      'Added smooth dragging and panning at all zoom levels in Fullscreen Preview',
      'Integrated direct Download PDF & Excel buttons on the preview toolbar',
      'Single-line date auto-fitting down to 4.0pt to prevent awkward text wrapping',
      'Standardized regular Helvetica 5.5pt font across education table levels',
    ],
  },
  {
    id: 'patch-2026-09-20-1',
    date: 'Sep 20, 2026',
    version: 'v1.2.0',
    title: 'Mobile Optimization & Theme Stability',
    changes: [
      'Fully responsive UI layout for mobile, tablet, and desktop viewports',
      'Eliminated theme flicker on page refresh with persistent dark mode',
      'Automatic work experience reverse-chronological sorting',
      'Zero-flicker offscreen canvas rendering pipeline for official PDF mirror',
    ],
  },
];
