import { NextRequest, NextResponse } from 'next/server';
import admin from '@/app/firebase-admin';

// Force la route à être dynamique pour éviter l'erreur de compilation statique
export const dynamic = 'force-dynamic';

const db = admin.firestore();

// Fonction pour supprimer tous les documents de la collection 'notifications'
async function deleteAllNotifications() {
  console.log('Début de la suppression des documents de la collection notifications...');
  
  try {
    // Récupérer tous les documents
    const snapshot = await db.collection('notifications').get();
    
    if (snapshot.empty) {
      console.log('La collection notifications est déjà vide.');
      return 0;
    }
    
    // Supprimer chaque document
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    // Exécuter le batch
    await batch.commit();
    
    console.log(`✅ ${count} documents supprimés de la collection notifications.`);
    return count;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des notifications:', error);
    throw error;
  }
}

// Fonction pour supprimer les doublons dans la collection 'teamMembers'
async function removeDuplicateTeamMembers() {
  console.log('Début de la suppression des doublons dans la collection teamMembers...');
  
  try {
    // Récupérer tous les membres
    const snapshot = await db.collection('teamMembers').get();
    
    if (snapshot.empty) {
      console.log('La collection teamMembers est vide.');
      return 0;
    }
    
    // Créer un Map pour stocker les membres uniques par email
    const uniqueMembers = new Map<string, { id: string; data: any }>();
    const duplicates: Array<{ id: string; email: string }> = [];
    
    // Identifier les doublons
    snapshot.forEach(doc => {
      const member = doc.data();
      const email = member.email?.toLowerCase();
      
      if (!email) {
        console.log(`⚠️ Membre sans email trouvé: ${doc.id}`);
        return;
      }
      
      if (!uniqueMembers.has(email)) {
        // Premier document pour cet email - le considérer comme unique
        uniqueMembers.set(email, {
          id: doc.id,
          data: member
        });
      } else {
        // Document en double pour cet email - l'ajouter à la liste des doublons
        duplicates.push({
          id: doc.id,
          email: email
        });
      }
    });
    
    console.log(`Total des membres: ${snapshot.size}`);
    console.log(`Membres uniques: ${uniqueMembers.size}`);
    console.log(`Doublons identifiés: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('Aucun doublon trouvé dans la collection teamMembers.');
      return 0;
    }
    
    // Supprimer les doublons
    const batch = db.batch();
    
    duplicates.forEach(dup => {
      const docRef = db.collection('teamMembers').doc(dup.id);
      batch.delete(docRef);
      console.log(`Marqué pour suppression: ${dup.id} (${dup.email})`);
    });
    
    // Exécuter le batch
    await batch.commit();
    
    console.log(`✅ ${duplicates.length} doublons supprimés de la collection teamMembers.`);
    return duplicates.length;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des doublons:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le paramètre de requête
    const searchParams = new URL(request.url).searchParams;
    const action = searchParams.get('action') || 'all';
    
    let results = {
      notificationsDeleted: 0,
      duplicatesRemoved: 0
    };
    
    // Exécuter l'action demandée
    if (action === 'notifications' || action === 'all') {
      results.notificationsDeleted = await deleteAllNotifications();
    }
    
    if (action === 'team' || action === 'all') {
      results.duplicatesRemoved = await removeDuplicateTeamMembers();
    }
    
    // Retourner les résultats
    return NextResponse.json({
      success: true,
      message: 'Opération de nettoyage terminée avec succès',
      results
    });
  } catch (error: any) {
    console.error('❌ Erreur lors du nettoyage de la base de données:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Une erreur est survenue lors du nettoyage de la base de données'
      },
      { status: 500 }
    );
  }
} 