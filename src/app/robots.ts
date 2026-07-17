import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://erp.gradia.solutions').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private / per-tenant / transient pages out of the index.
      disallow: [
        '/dashboard', '/admin', '/api', '/onboarding', '/locked',
        '/pay', '/invite', '/employee', '/reset-password', '/forgot-password',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
