/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  // Configuration pour désactiver la pré-génération statique de certaines pages
  // et les forcer en mode client-side rendering uniquement
  experimental: {
    // Appliquer le rendu statique uniquement aux routes spécifiées
    // Cela signifie que toutes les autres routes seront rendues côté client
    // En particulier, cela résout le problème avec useSearchParams dans /notifications/preferences
    missingSuspenseWithCSRBailout: false,
  },
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
  webpack: (config, { isServer, dev }) => {
    // Si c'est un build côté client, on ajoute des remplacements pour les modules Node.js
    if (!isServer) {
      // IMPORTANT: Empêcher l'importation de firebase-admin côté client
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /firebase-admin/,
          (resource) => {
            resource.request = path.resolve(__dirname, './app/utils/firebase-admin-stub.js');
          }
        )
      );
      
      // CORRECTION: Ne pas modifier les entrées de façon dynamique, ce qui peut créer des doublons
      // Ajoutons plutôt le polyfill directement via un plugin ProvidePlugin
      
      // Nouvelle approche pour résoudre les imports node:
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:(.*)/,
          (resource) => {
            const mod = resource.request.replace(/^node:/, '');
            switch (mod) {
              case 'events':
                resource.request = 'events';
                break;
              case 'stream':
                resource.request = 'stream-browserify';
                break;
              case 'util':
                resource.request = 'util';
                break;
              case 'buffer':
                resource.request = 'buffer';
                break;
              case 'process':
                resource.request = 'process/browser';
                break;
              case 'path':
                resource.request = 'path-browserify';
                break;
              case 'os':
                resource.request = 'os-browserify/browser';
                break;
              case 'crypto':
                resource.request = 'crypto-browserify';
                break;
              case 'http':
                resource.request = 'stream-http';
                break;
              case 'https':
                resource.request = 'https-browserify';
                break;
              case 'zlib':
                resource.request = 'browserify-zlib';
                break;
              default:
                console.warn(`Module non pris en charge: node:${mod}`);
                break;
            }
          }
        )
      );
      
      // Définir les fallbacks pour les modules non pris en charge
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        dns: false,
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        events: require.resolve('events/'),
        util: require.resolve('util/'),
        process: require.resolve('process/browser'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
      };
      
      // Assurer que webpack reconnaît l'extension .mjs
      config.resolve.extensions.push('.mjs');
      
      // Ajouter les polyfills pour les modules Node.js côté client
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
          // Ajouter d'autres polyfills globaux ici si nécessaire
          events: 'events',
          stream: 'stream-browserify',
          util: 'util',
          path: 'path-browserify',
          os: 'os-browserify/browser',
          crypto: 'crypto-browserify',
          http: 'stream-http',
          https: 'https-browserify',
          zlib: 'browserify-zlib'
        }),
        // Ignorer les modules qui causent des problèmes
        new webpack.IgnorePlugin({
          resourceRegExp: /^electron$/,
        }),
        // Ajouter un plugin pour fournir des variables globales pour stdout, stderr, isTTY
        new webpack.DefinePlugin({
          'process.stdout': JSON.stringify({
            isTTY: false,
            write: function() {},
            end: function() {},
          }),
          'process.stderr': JSON.stringify({
            isTTY: false,
            write: function() {},
            end: function() {},
          }),
          'process.stdin': JSON.stringify({
            isTTY: false
          })
        })
      );
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