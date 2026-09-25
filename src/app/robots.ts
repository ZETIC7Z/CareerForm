import type { MetadataRoute } from 'next';

/**
 * robots.txt for careerform-ph.
 *
 * Everything public is crawlable; accounts, APIs and workspace surfaces are excluded —
 * they are either private per-user views or JSON endpoints with nothing to index. The
 * sitemap pointer is what turns "crawl the pages you find" into "here is the whole map",
 * which is what gets a new site into Google's index quickly.
 *
 * The origin mirrors SITE_URL in src/app/layout.tsx.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://careerform-ph.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/sign/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
