/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output is for Docker/Dokploy self-hosting only; Vercel inlines env at build time
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
};
module.exports = nextConfig;
