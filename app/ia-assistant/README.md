# Assistant IA avec Google Gemini

Ce composant permet d'intégrer un assistant IA propulsé par l'API Google Gemini dans l'application.

## Configuration

Pour utiliser l'assistant IA, vous devez configurer une clé API Gemini :

1. Obtenez une clé API sur [Google AI Studio](https://ai.google.dev/)
2. Ajoutez la clé dans votre fichier `.env.local` :
   ```
   GEMINI_API_KEY=votre_clé_api_ici
   ```

## Fonctionnalités

- Interface de chat interactive
- Support pour les pièces jointes (images, documents)
- Copie facile des réponses
- Mode sombre/clair
- Animations fluides avec Framer Motion

## Utilisation

L'assistant IA est accessible via la route `/ia-assistant`. Il est protégé par authentification, donc seuls les utilisateurs connectés peuvent y accéder.

### Envoi de messages

1. Tapez votre message dans la zone de texte
2. Cliquez sur le bouton d'envoi (ou appuyez sur Entrée)

### Ajout de pièces jointes

1. Cliquez sur l'icône de trombone
2. Sélectionnez un ou plusieurs fichiers
3. Les fichiers sélectionnés apparaîtront sous la zone de texte
4. Vous pouvez supprimer des pièces jointes en cliquant sur la croix

## Dépannage

Si vous rencontrez des problèmes avec l'assistant IA :

1. Vérifiez que la clé API est correctement configurée dans `.env.local`
2. Assurez-vous que le serveur Next.js est redémarré après avoir modifié les variables d'environnement
3. Consultez les logs du serveur pour voir les erreurs potentielles

## Sécurité

La clé API est gérée côté serveur via une route API dédiée (`/api/gemini`), ce qui évite d'exposer la clé dans le code client. 