import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getApiKey, isTestMode } from '@/app/utils/docuseal'

export async function GET(request: NextRequest) {
  try {
    // Récupérer le templateId de la requête s'il existe
    const templateId = request.nextUrl.searchParams.get('templateId')
    // Récupérer le paramètre edit s'il existe
    const editMode = request.nextUrl.searchParams.get('edit') === 'true'
    
    // Vérifier que templateId est fourni si on est en mode édition
    if (editMode && !templateId) {
      console.error("Mode édition activé mais aucun templateId fourni dans la requête");
      return NextResponse.json(
        { error: 'ID de template requis pour le mode édition' },
        { status: 400 }
      )
    }
    
    // Obtenir la clé API appropriée (test ou production)
    const apiSecret = getApiKey()
    
    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Clé API DocuSeal non configurée' },
        { status: 500 }
      )
    }
    
    // Configuration de base pour l'intégration
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expire dans 1 heure
      user_email: "etatdeslieuxarthurloyd@gmail.com",
      integration_email: "agencebrest@arthurloydbretagne.fr",
      name: "État des lieux",
      test: isTestMode(),
    }
    
    // Si un templateId est fourni, l'ajouter au payload
    if (templateId) {
      // Indiquer à DocuSeal qu'il doit ouvrir ce template spécifique
      console.log(`Inclure templateId ${templateId} dans le token JWT ${editMode ? '(mode édition)' : ''}`)
      
      if (editMode) {
        // En mode édition, utiliser des paramètres spécifiques pour forcer l'édition d'un template existant
        Object.assign(payload, { 
          template_id: templateId,
          template_auto_load: true,
          mode: "template",
          edit: true,
          force_edit: true
        })
      } else {
        // Mode normal (visualisation ou création)
        Object.assign(payload, { 
          template_id: templateId, 
          template_auto_load: true 
        })
      }
    }
    
    // Générer le token JWT
    const token = jwt.sign(payload, apiSecret)
    
    console.log("Token JWT généré pour DocuSeal Builder", editMode ? "(mode édition)" : "")
    
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Erreur génération token JWT DocuSeal:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du token JWT' },
      { status: 500 }
    )
  }
} 