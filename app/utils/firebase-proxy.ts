/**
 * Fonction qui convertit une URL Firebase Storage en URL de proxy
 * pour éviter les problèmes CORS
 * 
 * @param url L'URL Firebase complète
 * @returns L'URL du proxy
 */
export function convertToProxyUrl(url: string): string {
  // Si l'URL est vide ou undefined, retourner une chaîne vide
  if (!url) return '';
  
  try {
    // Vérifier que l'URL est une URL Firebase Storage
    if (!url.includes('firebasestorage.googleapis.com')) {
      return url; // Retourner l'URL d'origine si ce n'est pas une URL Firebase
    }
    
    // Extraire les informations de l'URL
    const regex = /firebasestorage\.googleapis\.com\/v0\/b\/([^\/]+)\/o\/([^?]+)/;
    const match = url.match(regex);
    
    if (!match) {
      console.warn('[Firebase Proxy] Format d\'URL non reconnu:', url);
      return url; // Retourner l'URL d'origine si le format n'est pas reconnu
    }
    
    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    
    // Si le chemin concerne newsletter-templates mais ne contient pas /default/
    // et qu'il ne s'agit pas d'un dossier, essayer avec le dossier default
    let correctedPath = path;
    if (path.startsWith('newsletter-templates/') && 
        !path.includes('/default/')) {
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Cas particulier pour les images project-photo qui sont toujours dans /default/
      if (fileName.startsWith('project-photo-') || pathParts.length === 2) {
        correctedPath = `newsletter-templates/default/${fileName}`;
        console.log(`[Firebase Proxy] Correction du chemin: ${path} -> ${correctedPath}`);
      }
    }
    
    // Obtenir l'URL de base (localhost en dev, URL réelle en prod)
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin  // En front-end, utiliser l'origine de la fenêtre
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; // En back-end, utiliser la variable d'environnement

    // Construire l'URL du proxy avec l'URL de base (URL absolue)
    return `${baseUrl}/api/firebase-proxy?path=${encodeURIComponent(correctedPath)}&bucket=${encodeURIComponent(bucket)}`;
  } catch (error) {
    console.error('[Firebase Proxy] Erreur lors de la conversion de l\'URL:', error);
    return url; // En cas d'erreur, retourner l'URL d'origine
  }
}

/**
 * Fonction qui remplace toutes les URLs Firebase Storage dans un contenu HTML
 * par des URLs de proxy
 * 
 * @param html Le contenu HTML à modifier
 * @returns Le contenu HTML avec les URLs remplacées
 */
export function replaceFirebaseUrlsWithProxy(html: string): string {
  if (!html) return '';
  
  try {
    // Regex pour détecter les URLs Firebase dans les attributs src et href
    const regex = /(src|href)=["'](https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^"']+)["']/g;
    
    // Remplacer les URLs par des URLs de proxy
    return html.replace(regex, (match, attr, url) => {
      const proxyUrl = convertToProxyUrl(url);
      return `${attr}="${proxyUrl}"`;
    });
  } catch (error) {
    console.error('[Firebase Proxy] Erreur lors du remplacement des URLs:', error);
    return html; // En cas d'erreur, retourner le HTML d'origine
  }
} 