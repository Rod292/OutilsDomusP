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

// Instructions pour Arthur le chat
const SYSTEM_PROMPT = `Tu es Arthur, l'assistant virtuel d'Arthur Loyd Bretagne, une agence immobilière spécialisée dans l'immobilier d'entreprise.
Tu es courtois, professionnel et tu réponds de manière concise et précise aux questions des utilisateurs.
Tu peux aider les utilisateurs à trouver des informations sur les biens immobiliers, les services d'Arthur Loyd, et les démarches immobilières.
Si tu ne connais pas la réponse à une question, tu dois l'admettre honnêtement et proposer de mettre l'utilisateur en contact avec un conseiller.`;

// Fonction pour gérer les requêtes POST
export async function POST(req: NextRequest) {
  try {
    // Récupérer les variables d'environnement
    const apiKey = process.env.MISTRAL_API_KEY;
    const apiUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
    
    // Vérifier si la clé API est disponible
    if (!apiKey) {
      console.error('Clé API Mistral non définie');
      return NextResponse.json(
        { error: 'Configuration API manquante' },
        { status: 500 }
      );
    }

    // Récupérer les données de la requête
    const data = await req.json();
    const { message, history = [] } = data;

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
    const mistralPayload = {
      model: "mistral-tiny",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    };
    
    // Appeler l'API Mistral
    const response = await axios.post(apiUrl, mistralPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
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
    
    // Gérer les erreurs spécifiques
    if (error.response) {
      // Erreur de réponse de l'API
      statusCode = error.response.status;
      
      if (error.response.status === 401) {
        errorMessage = "Erreur d'authentification avec l'API Mistral. Veuillez vérifier votre clé API.";
      } else if (error.response.status === 429) {
        errorMessage = 'Trop de requêtes envoyées à l\'API Mistral. Veuillez réessayer plus tard.';
      } else {
        errorMessage = `Erreur de l'API Mistral: ${error.response.data?.message || error.message}`;
      }
    } else if (error.request) {
      // Pas de réponse reçue
      errorMessage = 'Aucune réponse reçue de l\'API Mistral. Veuillez vérifier votre connexion.';
    }
    
    // Retourner une réponse d'erreur
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
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