import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://erp.gradia.solutions').replace(/\/$/, '');

// Only public, index-worthy pages. Everything under /dashboard, /admin, /api,
// and transient auth pages are excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/login', priority: 0.7, freq: 'monthly' },
    { path: '/signup', priority: 0.8, freq: 'monthly' },
    { path: '/privacy', priority: 0.4, freq: 'yearly' },
    { path: '/terms', priority: 0.4, freq: 'yearly' },
  ];
  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
