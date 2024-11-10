/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/chart',
        permanent: true
      }
    ]
  }
}

module.exports = nextConfig
