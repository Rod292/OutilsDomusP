#!/bin/bash

# Afficher un message d'information
echo "🔍 Recherche des processus utilisant le port 3000..."

# Trouver le PID du processus qui utilise le port 3000 (compatible macOS)
PORT_PID=$(lsof -i :3000 -t)

# Vérifier si un processus a été trouvé
if [ -n "$PORT_PID" ]; then
  echo "🚫 Processus trouvé sur le port 3000 (PID: $PORT_PID). Tentative de fermeture..."
  
  # Tuer le processus
  kill -9 $PORT_PID
  
  # Attendre un peu pour s'assurer que le port est libéré
  sleep 2
  
  echo "✅ Port 3000 libéré avec succès!"
else
  echo "✅ Le port 3000 est déjà disponible."
fi

# Définir explicitement le port
export PORT=3000

# Démarrer Next.js avec le port spécifié
echo "🚀 Démarrage de Next.js sur le port 3000..."
npx next dev -p 3000 