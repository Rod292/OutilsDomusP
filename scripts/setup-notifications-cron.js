/**
 * Script pour configurer un job CRON pour les notifications quotidiennes
 * 
 * Ce script fournit des instructions pour configurer un job CRON
 * qui appellera l'API de notifications quotidiennes chaque matin de semaine
 */

const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://etatdeslieux.vercel.app/';
const apiKey = process.env.NOTIFICATIONS_API_KEY || 'EAL_NotificationsSecretKey_2025';
const endpointUrl = `${appUrl}api/notifications/daily-reminders?apiKey=${apiKey}`;

console.log('\n=== Configuration des notifications quotidiennes ===\n');
console.log('Pour configurer les notifications quotidiennes, vous devez créer un job CRON');
console.log('qui appellera l\'API suivante chaque matin à 8h (par exemple) en semaine :\n');
console.log(`URL: ${endpointUrl}`);
console.log('\nVoici comment configurer ce job CRON selon différentes options :\n');

// Option 1: Vercel Cron
console.log('OPTION 1: Utiliser Vercel Cron (recommandé si vous déployez sur Vercel)');
console.log('1. Ouvrez votre projet sur le tableau de bord Vercel');
console.log('2. Allez dans "Settings" > "Cron Jobs"');
console.log('3. Créez un nouveau job avec les paramètres suivants :');
console.log('   - Nom: "Daily task notifications"');
console.log('   - Expression CRON: "0 8 * * 1-5" (8h du matin, du lundi au vendredi)');
console.log('   - Endpoint: "/api/notifications/daily-reminders"');
console.log('   - HTTP Method: "POST"');
console.log('   - URL Query: "apiKey=EAL_NotificationsSecretKey_2025"\n');

// Option 2: cron-job.org
console.log('OPTION 2: Utiliser cron-job.org (service externe gratuit)');
console.log('1. Créez un compte sur https://cron-job.org');
console.log('2. Cliquez sur "Create cronjob"');
console.log('3. Entrez les détails suivants :');
console.log(`   - URL: ${endpointUrl}`);
console.log('   - Méthode: POST');
console.log('   - Exécution: "Custom schedule"');
console.log('   - Configuration personnalisée : 0 8 * * 1-5 (8h du matin, du lundi au vendredi)');
console.log('4. Activez et sauvegardez le job\n');

// Option 3: Systèmes Linux/macOS
console.log('OPTION 3: Utiliser un serveur Linux/macOS avec crontab');
console.log('1. Ouvrez le crontab avec : crontab -e');
console.log('2. Ajoutez la ligne suivante :');
console.log(`   0 8 * * 1-5 curl -X POST "${endpointUrl}"\n`);

// Option 4: Serveur Windows
console.log('OPTION 4: Utiliser un serveur Windows avec Task Scheduler');
console.log('1. Créez un fichier batch (.bat) avec le contenu :');
console.log(`   curl -X POST "${endpointUrl}"`);
console.log('2. Ouvrez le Planificateur de tâches et créez une nouvelle tâche');
console.log('3. Configurez-la pour qu\'elle s\'exécute tous les jours de semaine à 8h00');
console.log('4. Définissez l\'action pour exécuter le fichier batch créé\n');

console.log('=== Notes importantes ===');
console.log('- Assurez-vous que NOTIFICATIONS_API_KEY dans .env.local correspond à "EAL_NotificationsSecretKey_2025"');
console.log('- Pensez à adapter l\'heure (8h00) selon vos préférences');
console.log('- Pour tester, vous pouvez appeler l\'URL manuellement avec un client HTTP comme Postman');
console.log('\nVos notifications quotidiennes seront envoyées à tous les utilisateurs ayant des tâches dues le jour même'); 