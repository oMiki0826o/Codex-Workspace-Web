import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Codex Local',
    short_name: 'Codex',
    description: 'Private Codex workspace on your VPN',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [{ src: '/icons/codex-local.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  };
}
