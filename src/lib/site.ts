/**
 * The absolute origin every canonical, sitemap and structured-data URL is built from.
 * Override it with NEXT_PUBLIC_SITE_URL (a custom domain later, say) and every tag in
 * the app follows — metadata in `app/layout.tsx` and the JSON-LD graph both read it here.
 */
export const SITE_ORIGIN=(process.env.NEXT_PUBLIC_SITE_URL||'https://careerform-ph.vercel.app').replace(/\/$/,'');

/**
 * Revision of the bundled official form assets (`public/csc-2026.pdf`, `csc-2026.xlsx`).
 * Bump this whenever those files change: the template endpoints are served with a
 * one-year immutable cache, so without a new value returning visitors would keep the
 * stale document (the old 8 x 14 in folio page instead of the official A4 one).
 */
export const TEMPLATE_REVISION='2026-a4';

/** Site-wide identity + owner profile, sourced from the ZETICUZ portfolio. */
export const SITE={
  name:'CareerForm PH',
  tagline:'The Personal Data Sheet, rebuilt for 2026.',
  owner:'Sam Pangilinan',
  handle:'ZETICUZ',
  role:'AI-First Full-Stack Engineer',
  email:'samxerz.zeticuz@gmail.com',
  portfolio:'https://www.zeticuz.xyz/',
  streaming:'https://www.zeticuz.online/',
  bio:['AI-First Full-Stack Engineer building scalable web apps, streaming platforms, and immersive digital experiences.'],
  /** Ordered list of public channels. The developer's source repository is intentionally
   *  not linked from the site any more, so no code-host entry belongs here. */
  socials:[
    {label:'YouTube',href:'https://www.youtube.com/@ZETICUZ'},
    {label:'Instagram',href:'https://www.instagram.com/zeticuz_'},
    {label:'Facebook',href:'https://www.facebook.com/samxerz.pangilinan/'},
    {label:'Email',href:'mailto:samxerz.zeticuz@gmail.com'},
  ],
} as const;
