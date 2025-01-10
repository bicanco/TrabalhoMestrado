/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/projection',
        permanent: true
      }
    ]
  }
}

module.exports = nextConfig
