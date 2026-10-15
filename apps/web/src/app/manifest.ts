import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ASH LETRATO POS',
    short_name: 'LETRATO POS',
    description: 'Point of sale for ASH LETRATO, INC. — digital printing services',
    // Opens straight into the register — one tap on the icon starts selling.
    start_url: '/pos',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#450A0A',
    theme_color: '#450A0A',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
