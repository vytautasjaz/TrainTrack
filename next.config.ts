import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/avatars/:filename',
        destination: '/api/avatars/:filename',
      },
    ]
  },
}

export default nextConfig
