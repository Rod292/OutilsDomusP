import { NextRequest, NextResponse } from 'next/server'
import { docusealFetch, getApiKey } from '@/app/utils/docuseal'

// Forcer le mode dynamique pour cette route API
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Récupérer l'ID public de la requête
    const publicId = request.nextUrl.searchParams.get('publicId')
    
    if (!publicId) {
      return NextResponse.json(
        { error: 'ID public requis' },
        { status: 400 }
      )
    }
    
    // Appeler l'API DocuSeal pour obtenir les informations du template
    // Note: DocuSeal n'a peut-être pas d'API publique pour convertir directement 
    // un ID public en ID numérique, donc cette implémentation est une estimation
    // et pourrait nécessiter des ajustements selon l'API réelle de DocuSeal
    try {
      // Essayer d'abord de récupérer tous les templates
      const templates = await docusealFetch('/templates')
      
      // Chercher le template avec l'ID public correspondant
      const matchingTemplate = templates.find((template: any) => 
        template.public_id === publicId || template.slug === publicId
      )
      
      if (matchingTemplate) {
        return NextResponse.json({
          numericId: matchingTemplate.id.toString(),
          success: true
        })
      }
      
      // Si on ne trouve pas, on retourne une erreur
      return NextResponse.json(
        { error: `Template avec ID public ${publicId} non trouvé` },
        { status: 404 }
      )
    } catch (error) {
      console.error('Erreur lors de la récupération des templates:', error)
      
      // Plan B: Essayer une approche différente si la première échoue
      // Cette partie dépend de l'API de DocuSeal et peut nécessiter une adaptation
      return NextResponse.json(
        { error: 'Impossible de convertir l\'ID public en ID numérique' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'ID numérique' },
      { status: 500 }
    )
  }
} 