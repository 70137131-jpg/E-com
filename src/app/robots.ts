import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/brand';

/** PRD 17.2 / 17.5 — allow everything except /admin and /api. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/checkout', '/cart'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
