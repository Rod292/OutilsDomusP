import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Fonction pour gérer les requêtes OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Fonction pour générer le prompt système avec le consultant
function generateSystemPrompt(consultant: string = 'votre conseiller') {
  return `Je suis Arthur, l'assistant virtuel d'Arthur Loyd Bretagne, spécialisé dans l'immobilier d'entreprise.
Je travaille avec ${consultant} pour vous aider à trouver des informations sur les biens immobiliers, les services d'Arthur Loyd, et les démarches immobilières.
Si je ne connais pas la réponse à une question, je vous proposerai de contacter ${consultant} directement.`;
}

// Fonction pour gérer les requêtes POST
export async function POST(req: NextRequest) {
  try {
    // Récupérer les variables d'environnement
    const apiKey = process.env.MISTRAL_API_KEY;
    const apiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
    const agentId = process.env.MISTRAL_AGENT_ID;
    
    console.log('Configuration API Mistral:', { 
      apiKeyExists: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 6) : 'Non définie',
      agentIdExists: !!agentId,
      agentIdPrefix: agentId ? agentId.substring(0, 10) : 'Non défini'
    });
    
    // Vérifier si la clé API est disponible
    if (!apiKey || apiKey.trim() === '') {
      console.error('Clé API Mistral non définie ou vide');
      return NextResponse.json(
        { 
          error: 'Configuration API manquante', 
          message: 'Vous devez configurer une clé API Mistral valide dans le fichier .env.local.'
        },
        { status: 500 }
      );
    }

    // Récupérer les données de la requête
    const data = await req.json();
    const { message, history = [], consultant = 'votre conseiller' } = data;

    // Générer le prompt système avec le consultant
    const SYSTEM_PROMPT = generateSystemPrompt(consultant);

    // Formater les messages pour l'API Mistral
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Préparer la requête pour l'API Mistral
    const mistralPayload: any = {
      model: "mistral-tiny",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    };
    
    // Ajouter l'agent ID si disponible - mais seulement pour les modèles qui le supportent
    // L'agent ID n'est pas supporté par tous les modèles Mistral
    // Pour l'instant, nous ne l'utilisons pas pour éviter l'erreur 422
    /*
    if (agentId && agentId.trim() !== '') {
      mistralPayload.agent_id = agentId;
    }
    */
    
    console.log('Envoi de la requête à Mistral API avec la configuration:', {
      model: mistralPayload.model,
      messagesCount: mistralPayload.messages.length,
      hasAgentId: !!mistralPayload.agent_id,
      url: apiUrl,
      payload: JSON.stringify(mistralPayload).substring(0, 200) + '...' // Afficher une partie du payload pour debug
    });
    
    // Appeler l'API Mistral
    const response = await axios.post(apiUrl, mistralPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('Réponse reçue de Mistral API:', {
      status: response.status,
      hasChoices: !!response.data.choices,
      choicesLength: response.data.choices?.length
    });
    
    // Extraire la réponse
    const assistantMessage = response.data.choices[0]?.message?.content || 'Pas de réponse';
    
    // Retourner la réponse
    return NextResponse.json(
      { 
        message: assistantMessage,
        timestamp: new Date().toISOString(),
        status: 'success'
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error: any) {
    console.error('Erreur lors de l\'appel à l\'API Mistral:', error);
    
    let errorMessage = 'Erreur lors de la communication avec l\'API';
    let statusCode = 500;
    let errorDetails = null;
    
    // Gérer les erreurs spécifiques
    if (error.response) {
      // Erreur de réponse de l'API
      statusCode = error.response.status;
      
      console.error('Détails de l\'erreur API:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      
      // Capturer les détails de l'erreur pour le débogage
      errorDetails = JSON.stringify(error.response.data);
      
      if (error.response.status === 401) {
        errorMessage = "Erreur d'authentification avec l'API Mistral. La clé API fournie n'est pas valide ou a expiré.";
      } else if (error.response.status === 422) {
        errorMessage = "Erreur de validation des données envoyées à l'API Mistral. Format de requête incorrect.";
        // Afficher les détails spécifiques de l'erreur 422
        if (error.response.data?.message?.detail) {
          console.error('Détails de l\'erreur 422:', error.response.data.message.detail);
        }
      } else if (error.response.status === 429) {
        errorMessage = 'Trop de requêtes envoyées à l\'API Mistral. Veuillez réessayer plus tard.';
      } else {
        errorMessage = `Erreur de l'API Mistral: ${error.response.data?.message || error.message}`;
      }
    } else if (error.request) {
      // Pas de réponse reçue
      console.error('Aucune réponse reçue:', error.request);
      errorMessage = 'Aucune réponse reçue de l\'API Mistral. Veuillez vérifier votre connexion.';
    }
    
    // Retourner une réponse d'erreur
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails || error.message,
        status: 'error'
      },
      { 
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
} 