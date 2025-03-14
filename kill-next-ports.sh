#!/bin/bash

# Liste des ports à libérer (ports couramment utilisés par Next.js en développement)
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010)

echo "🧹 Nettoyage des ports de développement Next.js..."

# Variable pour suivre si des processus ont été trouvés
FOUND_ANY=false

for PORT in "${PORTS[@]}"; do
  # Trouver les PID des processus qui utilisent le port
  PORT_PIDS=$(lsof -i :$PORT -t)
  
  # Vérifier si un processus a été trouvé pour ce port
  if [ -n "$PORT_PIDS" ]; then
    FOUND_ANY=true
    echo "🚫 Processus trouvé sur le port $PORT. Tentative de fermeture..."
    
    # Tuer tous les processus trouvés
    for PID in $PORT_PIDS; do
      echo "   - Fermeture du processus $PID"
      kill -9 $PID
    done
  fi
done

# Attendre un peu pour s'assurer que les ports sont libérés
sleep 1

# Vérifier si des processus ont été trouvés et fermés
if [ "$FOUND_ANY" = true ]; then
  echo "✅ Nettoyage terminé! Tous les ports Next.js ont été libérés."
else
  echo "✅ Aucun processus Next.js n'a été trouvé. Tous les ports sont déjà disponibles."
fi 