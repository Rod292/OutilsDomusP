import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Fonction pour générer une réponse simulée
function generateSimulatedResponse(message: string): string {
  // Liste de réponses prédéfinies pour simuler un assistant immobilier
  const responses = [
    "En tant qu'assistant immobilier Arthur Loyd, je peux vous aider à trouver des informations sur le marché immobilier commercial et d'entreprise.",
    "Je suis spécialisé dans l'immobilier d'entreprise et commercial. Comment puis-je vous aider aujourd'hui?",
    "Arthur Loyd est un réseau national spécialisé dans l'immobilier d'entreprise et commercial. Nous proposons des bureaux, locaux d'activités, entrepôts et commerces à la vente ou à la location.",
    "Je peux vous renseigner sur les tendances du marché immobilier professionnel dans votre région.",
    "Pour un état des lieux détaillé, je vous recommande d'utiliser notre outil dédié qui permet de documenter précisément l'état d'un bien immobilier.",
    "Les baux commerciaux sont régis par des règles spécifiques. Je peux vous donner des informations générales, mais pour des conseils juridiques précis, consultez un avocat spécialisé.",
    "La localisation est un facteur clé dans l'immobilier commercial. Avez-vous une zone géographique particulière en tête?",
    "Je peux vous aider à comprendre les différents types de baux commerciaux: bail 3-6-9, bail dérogatoire, etc.",
    "Pour valoriser un bien commercial, plusieurs facteurs entrent en compte: emplacement, surface, état, accessibilité, visibilité...",
    "N'hésitez pas à me poser des questions sur l'immobilier d'entreprise, je suis là pour vous aider!"
  ];

  // Réponses spécifiques basées sur des mots-clés
  if (message.toLowerCase().includes("bonjour") || message.toLowerCase().includes("salut")) {
    return "Bonjour ! Je suis Arthur, votre assistant immobilier. Comment puis-je vous aider aujourd'hui ?";
  }
  
  if (message.toLowerCase().includes("merci")) {
    return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions concernant l'immobilier d'entreprise.";
  }
  
  if (message.toLowerCase().includes("bail") || message.toLowerCase().includes("contrat")) {
    return "Les baux commerciaux sont généralement conclus pour une durée de 9 ans, avec possibilité pour le locataire de résilier à la fin de chaque période triennale. Le bail dérogatoire, quant à lui, peut être conclu pour une durée maximale de 3 ans. Souhaitez-vous des informations plus précises sur un type de bail particulier ?";
  }
  
  if (message.toLowerCase().includes("prix") || message.toLowerCase().includes("tarif") || message.toLowerCase().includes("coût")) {
    return "Les prix dans l'immobilier d'entreprise varient considérablement selon la localisation, le type de bien, sa surface et son état. Dans les zones prime des grandes métropoles, les bureaux peuvent se louer entre 200 et 900€/m²/an. Avez-vous une zone géographique spécifique en tête ?";
  }
  
  if (message.toLowerCase().includes("état des lieux")) {
    return "L'état des lieux est un document essentiel qui décrit l'état d'un bien immobilier au début et à la fin d'une location. Chez Arthur Loyd, nous proposons un outil dédié pour réaliser des états des lieux détaillés et professionnels. Vous pouvez y accéder depuis notre plateforme.";
  }
  
  if (message.toLowerCase().includes("investissement") || message.toLowerCase().includes("investir")) {
    return "L'investissement dans l'immobilier d'entreprise peut offrir des rendements intéressants, généralement entre 4% et 8% selon le type d'actif et sa localisation. Les murs commerciaux, bureaux et locaux d'activité sont les principales catégories d'investissement. Souhaitez-vous des informations sur un type d'investissement particulier ?";
  }

  if (message.toLowerCase().includes("ça va") || message.toLowerCase().includes("ca va")) {
    return "Je vais très bien, merci de vous en inquiéter ! Je suis prêt à répondre à toutes vos questions concernant l'immobilier d'entreprise. Comment puis-je vous aider aujourd'hui ?";
  }

  // Si aucun mot-clé spécifique n'est détecté, retourner une réponse aléatoire
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userMessage = body.message;
    
    console.log('Proxy API - Message reçu:', userMessage);
    
    // Générer une réponse simulée
    const simulatedResponse = generateSimulatedResponse(userMessage);
    
    // Retourner la réponse simulée
    return NextResponse.json({
      message: simulatedResponse,
      timestamp: new Date().toISOString(),
      status: 'success'
    });
    
    /* Commenté car l'API externe ne fonctionne pas correctement
    // Récupérer les variables d'environnement
    const apiKey = process.env.NEXT_PUBLIC_LECHAT_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_LECHAT_API_URL || 'https://api.lechat.io/v1';
    const agentId = process.env.NEXT_PUBLIC_LECHAT_AGENT_ID;
    
    console.log('Proxy API - Variables d\'environnement:', { 
      apiKeyExists: !!apiKey, 
      apiUrl, 
      agentIdExists: !!agentId 
    });
    
    if (!apiKey) {
      console.error('Proxy API - Erreur: Clé API manquante');
      return NextResponse.json(
        { error: 'API key is missing' },
        { status: 500 }
      );
    }
    
    // Préparer les données pour l'API
    const payload = {
      message: body.message,
      apiKey: apiKey,
      agentId: agentId,
      history: body.history || []
    };
    
    console.log('Proxy API - Envoi de la requête à:', `${apiUrl}/chat`);
    
    // Appel à l'API externe
    const response = await axios.post(`${apiUrl}/chat`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 15000 // 15 secondes de timeout
    });
    
    console.log('Proxy API - Réponse reçue:', response.status);
    
    // Retourner la réponse
    return NextResponse.json(response.data);
    */
  } catch (error: any) {
    console.error('Proxy API - Erreur lors de l\'appel à l\'API:', error);
    
    // Réponse simulée en cas d'erreur
    return NextResponse.json(
      { 
        message: "Je suis désolé, je rencontre actuellement des difficultés techniques. Votre message a bien été reçu, mais je ne peux pas y répondre de manière optimale pour le moment. L'équipe technique travaille à résoudre ce problème. Merci de votre compréhension.",
        timestamp: new Date().toISOString(),
        status: 'success'
      },
      { status: 200 }
    );
  }
} 