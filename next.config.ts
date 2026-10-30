import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [],
  async headers() {
    return [{ source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' }
    ] }];
  }
};
export default nextConfig;
