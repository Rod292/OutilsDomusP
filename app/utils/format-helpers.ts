// Fonction utilitaire pour formater les dates
export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Non spécifiée';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateStr;
  }
}

// Fonction utilitaire pour obtenir le label du type de bien
export function getTypeBienLabel(type?: string | string[]): string {
  const types: Record<string, string> = {
    'appartement': 'Appartement',
    'maison': 'Maison',
    'studio': 'Studio',
    'local-commercial': 'Local commercial',
    'bureau': 'Bureau',
    'local-activite': 'Local d\'activité',
    'autre': 'Autre'
  };
  
  if (!type) return 'Non spécifié';
  
  // Si c'est un tableau, on formate tous les types séparés par des virgules
  if (Array.isArray(type)) {
    if (type.length === 0) return 'Non spécifié';
    return type.map(t => types[t] || t).join(' / ');
  }
  
  // Si c'est une chaîne simple, on retourne le label correspondant
  return types[type] || 'Non spécifié';
}

// Fonction utilitaire pour obtenir la couleur correspondant à l'état
export function getEtatColor(etat: string | undefined | null | number | object): string {
  if (!etat) return '#4B5563'; // Gris texte par défaut
  
  // Vérifier le type d'etat pour éviter les erreurs
  if (typeof etat !== 'string') {
    console.warn(`getEtatColor a reçu un type non-string: ${typeof etat}`, etat);
    // Si c'est un objet ou autre chose, essayons de le convertir en chaîne
    try {
      etat = String(etat);
    } catch (e) {
      return '#4B5563'; // Gris par défaut en cas d'erreur
    }
  }
  
  switch (etat.toLowerCase()) {
    case 'neuf':
    case 'bon':
    case 'tres bon':
    case 'très bon':
      return '#22c55e'; // Vert
    case 'moyen':
    case 'usage':
    case 'usagé':
      return '#f59e0b'; // Orange
    case 'mauvais':
    case 'a remplacer':
    case 'à remplacer':
      return '#ef4444'; // Rouge
    default:
      return '#4B5563'; // Gris texte
  }
}

// Fonction utilitaire pour obtenir le libellé de l'état
export function getEtatLabel(etat: string | undefined | null | number | object): string {
  if (!etat) return 'Non renseigné';
  
  // Vérifier le type d'etat pour éviter les erreurs
  if (typeof etat !== 'string') {
    console.warn(`getEtatLabel a reçu un type non-string: ${typeof etat}`, etat);
    // Si c'est un objet ou autre chose, essayons de le convertir en chaîne
    try {
      etat = String(etat);
    } catch (e) {
      return 'Non renseigné';
    }
  }
  
  return etat.charAt(0).toUpperCase() + etat.slice(1);
} 