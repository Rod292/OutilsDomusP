#!/bin/bash

echo "🧹 Nettoyage du cache Next.js..."

# Supprimer le cache
rm -rf .next
rm -rf node_modules/.cache
rm -rf .vercel/cache

echo "🚀 Suppression terminée."
echo "⚠️ Veuillez redémarrer votre serveur Next.js avec 'npm run dev'" 