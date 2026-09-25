import type { MetadataRoute } from 'next';

/**
 * sitemap.xml for careerform-ph.
 *
 * Static marketing/tool routes only — the pages a first-time visitor can reach. The
 * workspace surfaces (/builder, /coverletter, /wes) are listed because their entry
 * screens are public and they are the product; the dashboard and the sign views are
 * private or single-use and stay out. Priority follows how central each page is, not
 * how new.
 *
 * The origin mirrors SITE_URL in src/app/layout.tsx.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://careerform-ph.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1, lastModified },
    { url: `${SITE_URL}/builder`, changeFrequency: 'weekly', priority: 0.9, lastModified },
    { url: `${SITE_URL}/coverletter`, changeFrequency: 'monthly', priority: 0.8, lastModified },
    { url: `${SITE_URL}/wes`, changeFrequency: 'monthly', priority: 0.8, lastModified },
    { url: `${SITE_URL}/jobs`, changeFrequency: 'daily', priority: 0.8, lastModified },
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.4, lastModified },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3, lastModified },
  ];
}
