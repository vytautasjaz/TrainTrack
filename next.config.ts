import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/avatars/:filename',
        destination: '/api/avatars/:filename',
      },
      {
        source: '/uploads/race-covers/:filename',
        destination: '/api/race-covers/:filename',
      },
      {
        source: '/uploads/event-covers/:filename',
        destination: '/api/event-covers/:filename',
      },
    ]
  },
}

export default nextConfig
