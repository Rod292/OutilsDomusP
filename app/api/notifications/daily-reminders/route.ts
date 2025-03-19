import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { formatInTimeZone } from 'date-fns-tz';
import { isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';

// Initialiser Firebase Admin si ce n'est pas déjà fait
let adminApp: admin.app.App;

try {
  adminApp = admin.app();
} catch {
  // Charger les credentials du service account Firebase Admin
  let serviceAccount;
  
  try {
    // Vérifier si les credentials sont disponibles comme JSON
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      console.log("Credentials Firebase Admin chargées avec succès");
    } else {
      // Configuration de secours utilisant les variables d'environnement individuelles
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '3bfd946945e4b04c31083b3f8bdd95d729845597',
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '104053556823662383817',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
          process.env.FIREBASE_CLIENT_EMAIL || ''
        )}`
      };
      console.log("Utilisation des variables d'environnement pour les credentials Firebase Admin");
    }
    
    console.log(`Initialisation de Firebase Admin avec le projet: ${serviceAccount.project_id}`);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
    throw error;
  }
}

const adminDb = getFirestore(adminApp);

// Définir une interface pour les tâches
interface Task {
  id: string;
  assignedTo: string[];
  [key: string]: any;
}

// Endpoint pour envoyer des notifications quotidiennes
export async function POST(request: Request) {
  try {
    // Vérifier le secret d'API pour protéger cette route
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    
    if (apiKey !== process.env.NOTIFICATIONS_API_KEY) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Obtenir la date du jour (en France)
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    // Ne pas envoyer de notifications le week-end
    if (isWeekend(today)) {
      return NextResponse.json(
        { message: 'Aujourd\'hui est un weekend, pas de notifications envoyées' },
        { status: 200 }
      );
    }

    // Récupérer les tâches à échéance aujourd'hui
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(todayStart))
      .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
      .where('status', 'in', ['à faire', 'en cours', 'todo', 'in-progress'])
      .get();

    if (tasksSnapshot.empty) {
      return NextResponse.json(
        { message: 'Aucune tâche à échéance aujourd\'hui' },
        { status: 200 }
      );
    }

    // Organiser les tâches par utilisateur assigné
    const tasksByUser: Record<string, any[]> = {};
    
    tasksSnapshot.forEach(doc => {
      const task = { id: doc.id, ...doc.data() } as Task;
      
      // Pour chaque utilisateur assigné à la tâche
      if (Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach((userId: string) => {
          if (!tasksByUser[userId]) {
            tasksByUser[userId] = [];
          }
          tasksByUser[userId].push(task);
        });
      }
    });

    // Envoyer les notifications pour chaque utilisateur
    const notifications: any[] = [];
    
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      // Récupérer les tokens de l'utilisateur
      const tokensSnapshot = await adminDb
        .collection('notification_tokens')
        .where('userId', '==', userId)
        .get();
      
      if (tokensSnapshot.empty) {
        console.log(`Aucun token trouvé pour l'utilisateur ${userId}`);
        continue;
      }
      
      // Collecter tous les tokens
      const tokens: string[] = [];
      tokensSnapshot.forEach(doc => {
        const token = doc.data().token;
        if (token) tokens.push(token);
      });
      
      if (tokens.length === 0) {
        console.log(`Aucun token valide trouvé pour l'utilisateur ${userId}`);
        continue;
      }
      
      // Formater la date en français
      const dateFormatted = formatInTimeZone(
        today,
        'Europe/Paris',
        'eeee d MMMM',
        { locale: fr }
      );
      
      // Construire le message
      const title = `📅 Vos tâches du jour`;
      const body = `Vous avez ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} pour aujourd'hui (${dateFormatted})`;
      
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type: 'daily_reminder',
          count: String(tasks.length),
          date: today.toISOString(),
          clickAction: '/notion-plan',
        },
        tokens,
      };
      
      // Envoyer la notification
      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        
        console.log(`Notification envoyée à l'utilisateur ${userId}: ${response.successCount} succès, ${response.failureCount} échecs`);
        
        // Enregistrer la notification
        const notificationRef = await adminDb.collection('notifications').add({
          userId,
          title,
          body,
          type: 'daily_reminder',
          read: false,
          tasksCount: tasks.length,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        notifications.push({
          id: notificationRef.id,
          userId,
          sent: response.successCount,
          failed: response.failureCount,
        });
      } catch (error) {
        console.error(`Erreur lors de l'envoi de notification à l'utilisateur ${userId}:`, error);
      }
    }
    
    // Retourner le résultat
    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi des notifications quotidiennes:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
} 