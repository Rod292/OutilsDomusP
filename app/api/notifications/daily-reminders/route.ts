import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { formatInTimeZone } from 'date-fns-tz';
import { isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';

// Utiliser Firebase Admin depuis l'import centralisé
import adminApp from '@/app/firebase-admin';
const adminDb = adminApp.firestore();

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
        const response = await adminApp.messaging().sendEachForMulticast(message);
        
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