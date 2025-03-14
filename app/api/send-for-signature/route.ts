import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { PDFDocument } from 'pdf-lib'

// Configuration de l'API DocuSeal
const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_BASE_URL || 'http://localhost:3030'
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || 'votre_clé_api_docuseal'

// Chemins d'API corrects selon la documentation officielle
const API_PATHS = {
  TEMPLATES: '/templates',
  DOCUMENTS: (templateId: string) => `/templates/${templateId}/documents`,
  SUBMISSIONS: '/submissions'
};

export async function POST(request: NextRequest) {
  try {
    const { pdfData, signers } = await request.json()
    
    if (!pdfData) {
      return NextResponse.json({ error: 'Données PDF manquantes' }, { status: 400 })
    }
    
    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json({ error: 'Aucun signataire défini' }, { status: 400 })
    }
    
    // Convertir les données Base64 en buffer
    const pdfBuffer = Buffer.from(pdfData.replace(/^data:application\/pdf;base64,/, ''), 'base64')
    
    console.log("⚡ Communication avec DocuSeal API...");
    
    // 1. Créer un template
    console.log(`⚡ Création d'un template sur ${DOCUSEAL_BASE_URL}${API_PATHS.TEMPLATES}`);
    const templateResponse = await axios.post(
      `${DOCUSEAL_BASE_URL}${API_PATHS.TEMPLATES}`,
      {
        name: `État des lieux - ${new Date().toISOString().split('T')[0]}`,
        fields: [
          ...signers.map((signer, index) => ({
            type: 'signature',
            name: `signature_${signer.role}`,
            role: signer.role,
            x: 100,
            y: 700 - (index * 100),
            page: -1,
            required: true
          }))
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': DOCUSEAL_API_KEY
        }
      }
    );
    
    const templateId = templateResponse.data.id;
    console.log(`✅ Template créé avec succès, ID: ${templateId}`);
    
    // 2. Télécharger le document PDF
    console.log(`⚡ Téléchargement du document sur ${DOCUSEAL_BASE_URL}${API_PATHS.DOCUMENTS(templateId)}`);
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'etat-des-lieux.pdf');
    
    await axios.post(
      `${DOCUSEAL_BASE_URL}${API_PATHS.DOCUMENTS(templateId)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Auth-Token': DOCUSEAL_API_KEY
        }
      }
    );
    
    console.log(`✅ Document téléchargé avec succès`);
    
    // 3. Créer la soumission pour signature
    console.log(`⚡ Création de la demande de signature sur ${DOCUSEAL_BASE_URL}${API_PATHS.SUBMISSIONS}`);
    const submissionResponse = await axios.post(
      `${DOCUSEAL_BASE_URL}${API_PATHS.SUBMISSIONS}`,
      {
        template_id: templateId,
        submitters: signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          role: signer.role,
          fields: {}
        }))
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': DOCUSEAL_API_KEY
        }
      }
    );
    
    const submissionId = submissionResponse.data.id;
    console.log(`✅ Demande de signature créée avec succès, ID: ${submissionId}`);
    
    // URL d'édition du template
    const docusealEditUrl = `${DOCUSEAL_BASE_URL}/templates/${templateId}/edit`;
    
    return NextResponse.json({
      success: true,
      submissionId: submissionId,
      templateId: templateId,
      docusealEditUrl: docusealEditUrl,
      message: 'Document envoyé pour signature'
    });
    
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi pour signature:', error);
    
    // Afficher plus de détails sur l'erreur pour faciliter le débogage
    if (error.response) {
      console.error('Détails de l\'erreur:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'envoi du document pour signature', 
        message: error.message,
        details: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : undefined
      },
      { status: 500 }
    );
  }
} 