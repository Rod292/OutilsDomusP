/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/mistral/:path*',
        destination: 'https://api.lechat.io/v1/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // Matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Agent-Id" },
        ]
      }
    ];
  },
  // Ajouter cette configuration pour permettre les requêtes à l'API externe
  async redirects() {
    return [
      {
        source: '/lechat-api/:path*',
        destination: 'https://api.lechat.io/v1/:path*',
        permanent: true,
      },
    ];
  },
  // Configuration des images pour autoriser les domaines externes
  images: {
    domains: [
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      'public.blob.vercel-storage.com'
    ],
  }
}

module.exports = nextConfig 