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

    // Définir le type avec un champ optionnel specialAccess
    interface TokenData {
      token: string;
      platform: string;
      userAgent: string;
      createdAt: string;
      userId: string;
      consultant: string | null;
      isTestToken: boolean;
      specialAccess?: string[];
      urlConsultant?: string;
    }

    // Préparer les données du token
    const tokenData: TokenData = {
      token: `test-token-${tokenId}`,
      platform: data.platform || 'web',
      userAgent: data.userAgent || 'test-device',
      createdAt: new Date().toISOString(),
      userId: email,
      consultant: consultant || null,
      isTestToken: true
    };

    // Ajouter un champ spécial pour photos.pers@gmail.com
    if (email.toLowerCase() === 'photos.pers@gmail.com') {
      tokenData.specialAccess = ['nathalie', 'npers'];
      console.log('Ajout d\'un accès spécial aux notifications de Nathalie pour photos.pers@gmail.com');
    }

    // Enregistrer le token dans Firestore
    await adminDb.collection('notificationTokens').doc(tokenId).set(tokenData);

    console.log(`Token de test créé avec succès pour ${email}`, tokenData);

    // Si c'est photos.pers@gmail.com, créer aussi un token spécifique pour Nathalie
    if (email.toLowerCase() === 'photos.pers@gmail.com' && !consultant) {
      const nathTokenId = uuidv4();
      const nathTokenData: TokenData = {
        token: `test-token-${nathTokenId}`,
        platform: data.platform || 'web',
        userAgent: data.userAgent || 'test-device',
        createdAt: new Date().toISOString(),
        userId: email,
        consultant: 'nathalie',
        urlConsultant: 'nathalie',
        isTestToken: true,
        specialAccess: ['nathalie', 'npers']
      };
      
      await adminDb.collection('notificationTokens').doc(nathTokenId).set(nathTokenData);
      console.log(`Token supplémentaire créé pour ${email} avec accès à nathalie`, nathTokenData);
    }

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