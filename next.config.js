/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: [
      'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      'public.blob.vercel-storage.com'
    ],
  },
  eslint: {
    // Ne pas exécuter ESLint lors du build en production
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ne pas faire de vérification de type lors du build en production
    ignoreBuildErrors: true,
  },
  // Ajouter cette configuration pour éviter les erreurs avec firebase-admin côté client
  webpack: (config, { isServer }) => {
    // Si c'est un build côté client, on ajoute des remplacements pour les modules Node.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        dns: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
      };
    }
    return config;
  },
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
}

module.exports = nextConfig 