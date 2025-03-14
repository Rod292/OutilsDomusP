import { NextResponse } from 'next/server'
import { getApiKey } from '@/app/utils/docuseal'

// Forcer le mode dynamique pour cette route API
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }
    
    const templateIdParam = formData.get('templateId') as string || 'new'
    
    const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.com'
    const apiKey = process.env.DOCUSEAL_TEST_MODE === 'true'
      ? process.env.DOCUSEAL_TEST_API_KEY
      : process.env.DOCUSEAL_API_KEY
    
    console.log('Envoi du document à DocuSeal...', {
      templateId: templateIdParam,
      fileName: file.name,
      fileSize: file.size,
      apiMode: process.env.DOCUSEAL_TEST_MODE === 'true' ? 'TEST' : 'PROD'
    })
    
    // Vérifier d'abord si l'API est disponible
    try {
      const checkResponse = await fetch(`${DOCUSEAL_API_URL}/templates`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': apiKey as string,
        }
      })
      
      if (!checkResponse.ok) {
        console.log('API DocuSeal non disponible ou problème d\'authentification:', 
          checkResponse.status, checkResponse.statusText)
      } else {
        console.log('API DocuSeal disponible')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'API DocuSeal:', error)
    }
    
    // Créer un nouveau template à partir du PDF en utilisant l'endpoint correct
    console.log('Tentative de création d\'un template à partir du PDF via /templates/pdf')
    
    // Convertir le fichier en base64
    const fileArrayBuffer = await file.arrayBuffer()
    const fileBase64 = Buffer.from(fileArrayBuffer).toString('base64')
    
    const payload = {
      name: `État des lieux - ${new Date().toLocaleDateString('fr-FR')}`,
      documents: [
        {
          name: file.name,
          file: fileBase64
        }
      ],
      // Configuration par défaut pour le template (options supplémentaires)
      submitters: [
        {
          name: "Première Partie",
          fields: []
        }
      ],
      preferences: {
        auto_fill_submitter_fields: true,
        submitter_fields_editable: true,
        email_form_enabled: true,
        default_language: "fr",
        auto_fill_fields_enabled: true
      }
    }
    
    let response
    
    try {
      // Utiliser l'endpoint /templates/pdf comme recommandé dans la documentation
      response = await fetch(`${DOCUSEAL_API_URL}/templates/pdf`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': apiKey as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        console.log(`Échec avec /templates/pdf (${response.status}), essai avec l'endpoint standard /templates`)
        
        // Fallback à l'endpoint standard si nécessaire
        response = await fetch(`${DOCUSEAL_API_URL}/templates`, {
          method: 'POST',
          headers: {
            'X-Auth-Token': apiKey as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
    } catch (error) {
      console.error('Erreur lors de la tentative d\'upload:', error)
      throw new Error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erreur DocuSeal:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      // Fournir plus de détails sur l'erreur
      if (response.status === 404) {
        throw new Error(`Point d'extrémité non trouvé (404): Vérifiez l'URL de l'API DocuSeal (${DOCUSEAL_API_URL}) et les endpoints disponibles.`)
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`Erreur d'authentification (${response.status}): Vérifiez que votre clé API est valide`)
      } else {
        throw new Error(`Erreur DocuSeal (${response.status}): ${errorText}`)
      }
    }
    
    const data = await response.json()
    console.log('Document téléchargé avec succès:', data)
    
    // Logs détaillés des identifiants pour le débogage
    console.log('Identifiants du template reçus de DocuSeal:', {
      id: data.id,
      slug: data.slug,
      public_id: data.public_id,
      template_id: data.template_id
    })
    
    // Calculer les identifiants à retourner
    const resultTemplateId = data.slug || data.public_id || String(data.id) || templateIdParam
    const internalId = String(data.id) || ''
    
    console.log('Identifiants renvoyés au client:', {
      templateId: resultTemplateId,
      internalId
    })
    
    // Après avoir créé le template, on peut maintenant pré-remplir certains champs
    // ou configurer d'autres aspects du template si nécessaire
    
    return NextResponse.json({
      success: true,
      templateId: resultTemplateId,
      internalId,
      publicId: resultTemplateId
    })
  } catch (error) {
    console.error('Erreur upload DocuSeal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
} 