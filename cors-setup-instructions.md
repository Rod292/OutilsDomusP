# Configuration CORS pour Firebase Storage

Ce guide vous aidera à résoudre l'erreur CORS rencontrée lors du téléchargement de photos vers Firebase Storage.

## Problème

L'erreur suivante apparaît dans la console du navigateur :
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.appspot.com/o?name=images%2Fpieces%2F1%2Fphoto_1740740019240_8ucm37.jpg' from origin 'http://localhost:3000' has been blocked by CORS policy
```

Cette erreur se produit car Firebase Storage n'est pas configuré pour accepter les requêtes depuis `localhost:3000`.

## Solution

### 1. Installation de l'outil Google Cloud SDK

1. Téléchargez et installez [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Après l'installation, ouvrez un terminal et exécutez :
   ```
   gcloud init
   ```
3. Suivez les instructions pour vous connecter à votre compte Google

### 2. Configuration de CORS pour Firebase Storage

1. Un fichier `cors.json` a été créé dans votre projet avec la configuration appropriée
2. Ouvrez un terminal et naviguez jusqu'au répertoire du projet
3. Exécutez la commande suivante (remplacez `NOM-DU-BUCKET` par le nom de votre bucket Firebase Storage) :
   ```
   gsutil cors set cors.json gs://etat-des-lieux-arthur-loyd.firebasestorage.app
   ```

Le nom du bucket se trouve généralement dans la console Firebase, sous Storage. Il correspond souvent à `[PROJECT-ID].appspot.com`.

### 3. Vérification de la configuration

Pour vérifier que les règles CORS ont été correctement appliquées :
```
gsutil cors get gs://etat-des-lieux-arthur-loyd.appspot.com
```

## Alternative via la Console Firebase

Si vous préférez utiliser l'interface graphique :

1. Accédez à la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur "Storage"
4. Cliquez sur l'onglet "Rules"
5. Ajoutez la configuration CORS (cette option peut être limitée dans l'interface)

## Support

Si vous rencontrez toujours des problèmes après avoir configuré CORS :

1. Vérifiez que vous utilisez la bonne version de Firebase dans votre application
2. Assurez-vous que les règles de sécurité de Storage autorisent les écritures
3. Vérifiez que l'authentification Firebase fonctionne correctement
