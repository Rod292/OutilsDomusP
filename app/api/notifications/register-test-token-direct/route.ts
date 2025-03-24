import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Extraire les données de la requête
    const data = await request.json();
    const { email, consultant } = data;

    // Vérifier si l'email est présent
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 }
      );
    }

    // Générer un ID unique pour le token
    const tokenId = uuidv4();

    // Préparer les données du token
    const tokenData = {
      token: `test-token-${tokenId}`,
      platform: data.platform || 'web',
      userAgent: data.userAgent || 'test-device',
      createdAt: new Date().toISOString(),
      userId: email,
      consultant: consultant || null,
      isTestToken: true
    };

    // Enregistrer le token dans Firestore
    await adminDb.collection('notificationTokens').doc(tokenId).set(tokenData);

    console.log(`Token de test créé avec succès pour ${email}`, tokenData);

    return NextResponse.json({
      success: true,
      message: 'Token de test enregistré avec succès',
      tokenId,
      userId: email
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token de test:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors de l\'enregistrement du token de test',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 