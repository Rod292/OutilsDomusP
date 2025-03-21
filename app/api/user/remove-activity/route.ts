import { NextRequest, NextResponse } from 'next/server';
import { removeUserActivity } from '../../../services/activeUsersService';
import { db } from '../../../lib/firebase';

export async function POST(request: NextRequest) {
  // Vérifier que Firebase est initialisé
  if (!db) {
    console.error('[API] Firebase non initialisé dans /api/user/remove-activity');
    return NextResponse.json({ success: false, error: 'Firebase not initialized' }, { status: 500 });
  }
  
  // Traiter à la fois JSON et FormData
  let email: string | null = null;
  
  try {
    // Vérifier d'abord si c'est du JSON
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email || null;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Traiter comme FormData
      const formData = await request.formData();
      email = formData.get('email') as string || null;
    }
    
    console.log('[API] Demande de suppression d\'activité pour:', email);
    
    // Vérifier que l'email est présent
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }
    
    // Supprimer l'utilisateur de la liste des utilisateurs actifs
    await removeUserActivity(email);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Erreur lors de la suppression de l\'activité utilisateur:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// Pour les requêtes OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 