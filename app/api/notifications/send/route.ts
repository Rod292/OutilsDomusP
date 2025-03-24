/**
 * @route POST /api/notifications/send
 * @description Endpoint pour envoyer une notification à un utilisateur spécifique
 * @body {
 *   userId: string, // ID de l'utilisateur au format "email_consultant"
 *   title: string, // Titre de la notification
 *   body: string, // Corps de la notification
 *   type: "task_assigned" | "task_reminder" | "system", // Type de notification
 *   taskId?: string // ID de la tâche (optionnel)
 * }
 * @headers {
 *   Authorization?: string // Clé API pour l'authentification (requise en production)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/app/firebase-admin';
import { NOTIFICATION_CONFIG } from '../config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Collections
const TOKEN_COLLECTION = 'notificationTokens';
const NOTIFICATION_COLLECTION = 'notifications';
const PREFERENCES_COLLECTION = 'notificationPreferences';

// Vérifier si l'admin est correctement initialisé
const getAdminFirestore = () => {
  try {
    return admin.firestore();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
    return null;
  }
};

// CORRECTION: Ajouter cette fonction pour nettoyer les données avant de les envoyer à Firestore
function sanitizeFirestoreData(data: any): any {
  // Si null ou undefined, retourner null (Firestore accepte null mais pas undefined)
  if (data === undefined || data === null) {
    return null;
  }
  
  // Si c'est un objet (mais pas un tableau), nettoyer chaque propriété
  if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
    const result: any = {};
    
    // Parcourir toutes les propriétés de l'objet
    Object.keys(data).forEach(key => {
      // Récursivité pour nettoyer les sous-objets
      const value = sanitizeFirestoreData(data[key]);
      
      // Ne pas inclure les propriétés undefined
      if (value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }
  
  // Si c'est un tableau, nettoyer chaque élément
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item));
  }
  
  // Retourner la valeur telle quelle pour les types primitifs
  return data;
}

// Fonction pour vérifier les préférences de notifications d'un utilisateur
async function checkNotificationPreferences(
  db: FirebaseFirestore.Firestore,
  userId: string,
  type: string
): Promise<boolean> {
  try {
    // Extraire l'email de l'utilisateur et le consultant depuis l'ID
    const [userEmail, consultantName] = userId.split('_');
    if (!userEmail || !consultantName) {
      console.log(`Format d'ID utilisateur incorrect: ${userId}`);
      return true; // Par défaut, autoriser l'envoi
    }
    
    // Mapper le nom du consultant à son email réel
    const CONSULTANTS = [
      { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
      { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
      { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
      { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
      { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
      { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
      { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
      { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
      { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
      { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
    ];
    
    const consultant = CONSULTANTS.find(c => c.name.toLowerCase() === consultantName.toLowerCase());
    const consultantEmail = consultant ? consultant.email : `${consultantName.toLowerCase()}@arthurloydbretagne.fr`;
    
    // Rechercher les préférences avec l'API admin
    const prefsQuery = db.collection(PREFERENCES_COLLECTION)
      .where('userId', '==', userEmail)
      .where('consultantEmail', '==', consultantEmail);
    
    const prefsSnapshot = await prefsQuery.get();
    
    // Si aucune préférence n'est trouvée, autoriser par défaut
    if (prefsSnapshot.empty) {
      console.log(`Aucune préférence trouvée pour ${userId}, autorisation par défaut`);
      return true;
    }
    
    // Vérifier le type de notification
    const prefs = prefsSnapshot.docs[0].data();
    
    // Vérifier le type correspondant
    switch (type) {
      case 'task_assigned':
        return prefs.taskAssigned !== false;
      case 'communication_assigned':
        return prefs.communicationAssigned !== false;
      case 'task_reminder':
        return prefs.taskReminders !== false;
      default:
        return true; // Types non gérés sont autorisés par défaut
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des préférences:', error);
    return true; // En cas d'erreur, autoriser par défaut
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, type, taskId, communicationIndex } = await request.json();
    
    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    
    // Initialiser Firebase Admin
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin non initialisé' }, { status: 500 });
    }
    
    // Extraire l'email et le consultant depuis userId
    const [userEmail, consultantName] = userId.includes('_') ? userId.split('_') : [userId, null];
    console.log(`Envoi de notification pour email: ${userEmail}, consultant: ${consultantName || 'non spécifié'}`);
    
    // Vérifier les préférences de notification
    const notificationEnabled = await checkNotificationPreferences(db, userId, type);
    if (!notificationEnabled) {
      console.log(`Notifications désactivées pour ${userId} (type: ${type})`);
      return NextResponse.json({ 
        success: false,
        error: 'Notifications désactivées',
        total: 0
      });
    }
    
    // Ensemble pour stocker les tokens uniques
    const tokensToNotify = new Set<string>();
    let appleDeviceCount = 0;
    let nonAppleDeviceCount = 0;
    
    // 1. Chercher d'abord les tokens spécifiques (email_consultant)
    if (consultantName) {
      console.log(`Recherche de tokens spécifiques pour ${userId}`);
      const specificQuery = await db.collection(TOKEN_COLLECTION)
        .where('userId', '==', userId)
        .get();
      
      if (!specificQuery.empty) {
        console.log(`${specificQuery.size} token(s) spécifique(s) trouvé(s)`);
        specificQuery.forEach(doc => {
          const data = doc.data();
          if (data.token) {
            tokensToNotify.add(data.token);
            if (data.platform?.toLowerCase().includes('ios') || 
                data.userAgent?.toLowerCase().includes('iphone') ||
                data.userAgent?.toLowerCase().includes('ipad')) {
              appleDeviceCount++;
            } else {
              nonAppleDeviceCount++;
            }
          }
        });
      }
    }
    
    // 2. Chercher ensuite les tokens par email
    console.log(`Recherche de tokens par email: ${userEmail}`);
    const emailQuery = await db.collection(TOKEN_COLLECTION)
      .where('email', '==', userEmail)
      .get();
    
    if (!emailQuery.empty) {
      console.log(`${emailQuery.size} token(s) trouvé(s) par email`);
      emailQuery.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokensToNotify.add(data.token);
          if (data.platform?.toLowerCase().includes('ios') || 
              data.userAgent?.toLowerCase().includes('iphone') ||
              data.userAgent?.toLowerCase().includes('ipad')) {
            appleDeviceCount++;
          } else {
            nonAppleDeviceCount++;
          }
        }
      });
    }
    
    // Si aucun token n'a été trouvé
    if (tokensToNotify.size === 0) {
      console.log(`Aucun token trouvé pour ${userId}`);
      return NextResponse.json({
        success: false,
        error: 'Aucun token trouvé',
        useLocalMode: true,
        total: 0
      });
    }
    
    // Préparer le message FCM
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type,
        taskId: taskId || '',
        communicationIndex: communicationIndex?.toString() || '',
        userId,
        timestamp: Date.now().toString(),
      }
    };
    
    // Envoyer la notification via FCM
    console.log(`Envoi de ${tokensToNotify.size} notification(s)...`);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: Array.from(tokensToNotify),
      notification: message.notification,
      data: message.data
    });
    
    console.log('Résultat de l\'envoi:', {
      success: response.successCount,
      failure: response.failureCount,
      appleDevices: appleDeviceCount,
      nonAppleDevices: nonAppleDeviceCount
    });
    
    // Sauvegarder la notification dans Firestore
    await db.collection(NOTIFICATION_COLLECTION).add({
      userId,
      title,
      body,
      type,
      taskId,
      communicationIndex,
      timestamp: new Date(),
      read: false,
      success: response.successCount > 0
    });
    
    return NextResponse.json({
      success: response.successCount > 0,
      total: tokensToNotify.size,
      results: {
        success: response.successCount,
        failure: response.failureCount,
        appleDevices: appleDeviceCount,
        nonAppleDevices: nonAppleDeviceCount
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Endpoint pour récupérer les notifications d'un utilisateur
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      );
    }

    // Récupérer les notifications de l'utilisateur
    const notificationsSnapshot = await admin.firestore().collection(NOTIFICATION_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const notifications: any[] = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
} 