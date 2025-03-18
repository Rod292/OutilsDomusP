import { NextRequest, NextResponse } from 'next/server';

// Fonction pour gérer les requêtes POST
export async function POST(request: NextRequest) {
  console.log('Route API Gemini appelée');
  try {
    // Récupération de la clé API depuis les variables d'environnement du serveur
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Clé API Gemini non configurée');
      return NextResponse.json(
        { error: "Clé API Gemini non configurée sur le serveur" },
        { status: 500 }
      );
    }

    console.log('Clé API Gemini trouvée:', apiKey.substring(0, 5) + '...');

    // Récupération du corps de la requête
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      console.error('Prompt manquant dans la requête');
      return NextResponse.json(
        { error: "Le prompt est requis" },
        { status: 400 }
      );
    }

    console.log('Prompt reçu:', prompt.substring(0, 50) + '...');

    // Appel à l'API Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    console.log('URL API Gemini:', apiUrl);
    
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      }
    );

    console.log('Statut de la réponse Gemini:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur API Gemini:', errorData);
      return NextResponse.json(
        { error: `Erreur API Gemini: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Données reçues de Gemini:', JSON.stringify(data).substring(0, 100) + '...');
    
    // Vérification de la structure de la réponse
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Format de réponse inattendu:', JSON.stringify(data));
      return NextResponse.json(
        { error: "Format de réponse inattendu de l'API Gemini" },
        { status: 500 }
      );
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    console.log('Réponse AI extraite:', aiResponse.substring(0, 50) + '...');

    // Retour de la réponse
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: "Une erreur s'est produite lors du traitement de la requête" },
      { status: 500 }
    );
  }
} 