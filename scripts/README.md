# Scripts utilitaires

Ce dossier contient des scripts utilitaires pour l'application.

## Script de migration des templates

Le script `migrate-templates.js` permet de migrer les templates de la collection `newsletter_templates` vers la collection `newsletterTemplates`.

### Prérequis

- Node.js installé
- Les dépendances du projet installées (`npm install`)
- Accès à Firebase (compte administrateur)

### Configuration

Avant d'exécuter le script, assurez-vous d'avoir configuré l'accès à Firebase de l'une des manières suivantes :

1. **Avec un fichier de clé de service** :
   - Placez votre fichier de clé de service Firebase à la racine du projet sous le nom `firebase-service-account.json`
   - OU définissez la variable d'environnement `FIREBASE_SERVICE_ACCOUNT_PATH` avec le chemin vers votre fichier de clé

2. **Avec des variables d'environnement** :
   - Définissez les variables suivantes :
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`

### Exécution

Pour exécuter le script :

```bash
# Depuis la racine du projet
node scripts/migrate-templates.js
```

### Comportement

Le script va :
1. Se connecter à Firebase
2. Lire tous les templates de la collection `newsletter_templates`
3. Lire tous les templates de la collection `newsletterTemplates`
4. Migrer les templates de `newsletter_templates` vers `newsletterTemplates` en évitant les doublons
5. Afficher un résumé de la migration

**Important** : Le script ne supprime pas les templates de l'ancienne collection. Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez supprimer manuellement l'ancienne collection depuis la console Firebase.

### Sécurité

Ce script doit être exécuté par un administrateur, car il nécessite des droits d'accès en lecture et écriture sur les collections Firestore. 