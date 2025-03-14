import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }
  
  try {
    // Ajouter un timestamp pour éviter le cache
    const urlWithTimestamp = `${url}&t=${Date.now()}`;
    
    // Effectuer la requête vers l'URL d'origine
    const response = await fetch(urlWithTimestamp, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    // Récupérer le contenu de l'image
    const buffer = await response.arrayBuffer();
    
    // Configurer les en-têtes de réponse
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    
    // Retourner l'image avec les bons en-têtes
    return new NextResponse(buffer, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
} 