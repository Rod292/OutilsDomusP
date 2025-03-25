import { NextResponse } from 'next/server';

// Route API simple pour vérifier que le serveur est en ligne
export async function GET(request: Request) {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'La route API de test est accessible',
    timestamp: new Date().toISOString() 
  });
}

// Support pour les requêtes HEAD (utilisées par le health check)
export async function HEAD(request: Request) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Support pour les requêtes POST pour simuler l'envoi de notifications
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test d\'API réussi',
      received: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du traitement de la requête'
    }, { status: 400 });
  }
} 