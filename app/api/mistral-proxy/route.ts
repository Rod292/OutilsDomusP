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

    console.log('Message reçu:', message);
    console.log('Historique reçu:', history.length, 'messages');

    // Formater les messages pour l'API Mistral
    const messages = [
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

    console.log('Envoi de la requête à Mistral API...');
    
    // Appeler l'API Mistral
    const response = await axios.post(apiUrl, mistralPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log('Réponse reçue de Mistral API');
    
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
    
    // Retourner une réponse d'erreur
    return NextResponse.json(
      { 
        error: 'Erreur lors de la communication avec l\'API Mistral',
        details: error.message,
        status: 'error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
} 