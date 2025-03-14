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
  return `Je m'appelle Arthur, je suis l'assistant virtuel d'Arthur Loyd Bretagne, spécialisé dans l'immobilier d'entreprise.
Je travaille avec ${consultant} pour aider les clients à trouver des informations sur les biens immobiliers, les services d'Arthur Loyd, et les démarches immobilières.
Si je ne connais pas la réponse à une question, je proposerai de contacter ${consultant} directement.
Je ne dois jamais dire "Bonjour Arthur" car c'est moi qui suis Arthur. Je m'adresse directement à l'utilisateur.
Je dois indiquer clairement que je ne peux pas effectuer de recherches web en temps réel si l'utilisateur me le demande.`;
}

// Fonction pour détecter si le message contient une demande de recherche web
function containsWebSearchRequest(message: string): boolean {
  const searchTerms = [
    'recherche web', 
    'cherche sur internet', 
    'cherche sur le web', 
    'recherche sur internet',
    'fais une recherche',
    'cherche en ligne',
    'trouve sur internet'
  ];
  
  const lowerMessage = message.toLowerCase();
  return searchTerms.some(term => lowerMessage.includes(term));
}

// Fonction pour gérer les requêtes POST
export async function POST(req: NextRequest) {
  try {
    // Récupérer les variables d'environnement
    const apiKey = process.env.MISTRAL_API_KEY;
    const apiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
    
    console.log('Configuration API Mistral:', { 
      apiKeyExists: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 6) : 'Non définie',
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
    
    // Vérifier si le message contient une demande de recherche web
    const isWebSearchRequest = containsWebSearchRequest(message);

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
      model: "mistral-large-latest", // Utiliser le modèle le plus récent
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    };
    
    console.log('Envoi de la requête à Mistral API avec la configuration:', {
      model: mistralPayload.model,
      messagesCount: mistralPayload.messages.length,
      isWebSearchRequest,
      url: apiUrl
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
      choicesLength: response.data.choices?.length,
    });
    
    // Traitement normal de la réponse
    const responseMessage = response.data.choices[0]?.message;
    let assistantMessage = responseMessage?.content || 'Pas de réponse';
    
    // Ajouter une note sur la recherche web si nécessaire
    if (isWebSearchRequest) {
      console.log('Demande de recherche web détectée');
    }
    
    // Retourner la réponse
    return NextResponse.json(
      { 
        message: assistantMessage,
        timestamp: new Date().toISOString(),
        status: 'success',
        webSearchRequested: isWebSearchRequest
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
        data: JSON.stringify(error.response.data),
      });
      
      // Capturer les détails de l'erreur pour le débogage
      errorDetails = JSON.stringify(error.response.data);
      
      if (error.response.status === 401) {
        errorMessage = "Erreur d'authentification avec l'API Mistral. La clé API fournie n'est pas valide ou a expiré.";
      } else if (error.response.status === 422) {
        errorMessage = "Erreur de validation des données envoyées à l'API Mistral. Format de requête incorrect.";
        // Afficher les détails spécifiques de l'erreur 422
        if (error.response.data?.error) {
          errorMessage += ` Détail: ${error.response.data.error}`;
          console.error('Détails de l\'erreur 422:', error.response.data.error);
        }
      } else if (error.response.status === 429) {
        errorMessage = 'Trop de requêtes envoyées à l\'API Mistral. Veuillez réessayer plus tard.';
      } else {
        errorMessage = `Erreur de l'API Mistral: ${error.response.data?.error || error.message}`;
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