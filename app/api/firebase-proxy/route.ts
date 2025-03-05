import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy pour les images Firebase Storage
 * Cette API permet de contourner les problèmes CORS en récupérant les images
 * depuis le serveur Next.js au lieu de les charger directement depuis le navigateur
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de l'URL
    const path = request.nextUrl.searchParams.get('path') || '';
    const bucket = request.nextUrl.searchParams.get('bucket') || 'etat-des-lieux-arthur-loyd.firebasestorage.app';
    const url = request.nextUrl.searchParams.get('url') || '';
    
    // Si une URL complète est fournie, l'utiliser directement
    if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[Firebase Proxy] Erreur lors de la récupération de l'URL: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: `Image non trouvée à l'URL fournie: ${url}` },
          { status: 404 }
        );
      }
      
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // Sinon, utiliser le chemin et le bucket
    if (!path) {
      return NextResponse.json(
        { error: 'Le paramètre path ou url est requis' },
        { status: 400 }
      );
    }

    // Normaliser le chemin (supprimer les doubles slashes et les slashes en début/fin)
    const normalizedPath = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    
    // Liste des chemins à essayer
    const pathsToTry = [normalizedPath];
    
    // Si le chemin contient newsletter-templates mais pas /default/
    if (normalizedPath.startsWith('newsletter-templates/') && !normalizedPath.includes('/default/')) {
      const pathParts = normalizedPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Pour les images project-photo, essayer toujours le chemin avec /default/
      if (fileName.startsWith('project-photo-') || pathParts.length === 2) {
        const defaultPath = `newsletter-templates/default/${fileName}`;
        
        // Mettre le chemin default en première position pour les images project-photo
        if (fileName.startsWith('project-photo-')) {
          pathsToTry.unshift(defaultPath);
        } else {
          pathsToTry.push(defaultPath);
        }
        
        console.log(`[Firebase Proxy] Ajout du chemin avec default: ${defaultPath}`);
      }
    }
    
    // Essayer de récupérer l'image pour chaque chemin possible
    for (const currentPath of pathsToTry) {
      // Construire l'URL Firebase complète
      const fullUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(currentPath)}?alt=media`;
      
      console.log(`[Firebase Proxy] Tentative de récupération de l'image: ${fullUrl}`);
      
      try {
        // Récupérer l'image depuis Firebase Storage
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          console.log(`[Firebase Proxy] Erreur lors de la récupération de l'image à ${currentPath}: ${response.status} ${response.statusText}`);
          continue; // Essayer le chemin suivant
        }
        
        // Récupérer les données binaires de l'image
        const imageBuffer = await response.arrayBuffer();
        
        // Déterminer le type MIME à partir de l'URL ou des en-têtes de réponse
        const contentType = response.headers.get('content-type') || 'image/png';
        
        console.log(`[Firebase Proxy] Image récupérée avec succès à ${currentPath}, type: ${contentType}`);
        
        // Renvoyer l'image avec les en-têtes appropriés
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (error) {
        console.error(`[Firebase Proxy] Erreur lors de la récupération à ${currentPath}:`, error);
        // Continuer avec le chemin suivant
      }
    }
    
    // Si on arrive ici, aucune image n'a été trouvée
    return NextResponse.json(
      { error: "Image non trouvée pour tous les chemins essayés" },
      { status: 404 }
    );
  } catch (error) {
    console.error('[Firebase Proxy] Erreur générale:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'image" },
      { status: 500 }
    );
  }
} 