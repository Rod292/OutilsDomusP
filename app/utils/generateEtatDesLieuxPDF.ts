import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { formatDate, getTypeBienLabel, getEtatLabel, getEtatColor } from './format-helpers';

// Nous gardons un logo simple par défaut au cas où le chargement échouerait
const FALLBACK_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Option par défaut pour l'image du logo - on active maintenant le chargement du logo externe
const LOGO_URL = '/assets/Logo Arthur Loyd.png';

// Nous ne vérifions plus le logo par défaut, mais nous allons vérifier l'existence du logo externe
console.log("Configuration du logo depuis:", LOGO_URL);

// Initialisation de PDFMake avec les polices - solution robuste
try {
  console.log("Initialisation de PDFMake...");
  
  // Vérifier si pdfMake est bien chargé
  if (!pdfMake) {
    console.error("pdfMake n'est pas correctement chargé");
  }
  
  // Solution simplifiée: définir directement les polices par défaut
  // @ts-ignore - Ignorer les erreurs de typage pour l'initialisation
  pdfFonts.pdfMake = pdfFonts.pdfMake || {};
  // @ts-ignore
  pdfFonts.pdfMake.vfs = pdfFonts.pdfMake.vfs || {};
  // @ts-ignore
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
  
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
  
  console.log("Initialisation de PDFMake terminée");
} catch (error) {
  console.error('Erreur lors de l\'initialisation de pdfMake:', error);
}

// Fonction pour valider une image avant de l'utiliser dans le PDF
async function validateImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl) {
    return false;
  }
  
  // Si c'est déjà une URL data, on considère qu'elle est valide
  if (imageUrl.startsWith('data:')) {
    return true;
  }
  
  // Détecter si c'est une URL Firebase Storage
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    console.log(`Validation d'URL Firebase Storage: ${imageUrl}`);
    // Pour Firebase Storage, on ne peut pas faire de HEAD request à cause de CORS
    // On considère l'URL valide et on laissera le chargement de l'image gérer les erreurs
    return true;
  }

  try {
    // Si nous sommes dans un environnement Node.js, on ne peut pas valider
    if (typeof window === 'undefined') {
      return true;
    }

    // Utiliser l'URL complète avec le domaine actuel pour les chemins relatifs
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
    
    // Récupérer l'image
    const response = await fetch(fullUrl, { method: 'HEAD' });
    if (!response.ok) {
      console.warn(`Image invalide ou inaccessible: ${fullUrl}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la validation de l'image:", error);
    return false;
  }
}

// Fonction améliorée pour charger une image à partir d'une URL et la convertir en base64
async function loadImageAsBase64(url: string): Promise<string> {
  // Si c'est déjà une URL data, on la retourne directement
  if (url && url.startsWith('data:')) {
    return url;
  }
  
  // Si nous sommes dans un environnement Node.js, utiliser d'autres méthodes
  if (typeof window === 'undefined') {
    console.warn('LoadImageAsBase64 ne fonctionne que dans un navigateur');
    return FALLBACK_LOGO; // Utiliser le logo de secours
  }
  
  try {
    // Détecter si c'est une URL Firebase Storage
    const isFirebaseStorageUrl = url.includes('firebasestorage.googleapis.com');
    
    // Pour les URL Firebase Storage, on utilise une approche différente
    if (isFirebaseStorageUrl) {
      console.log(`URL Firebase Storage détectée: ${url}`);
      
      try {
        // Utiliser une image pour précharger l'URL et vérifier si elle est accessible
        return new Promise((resolve) => {
          const img = new Image();
          
          img.onload = () => {
            console.log(`Image Firebase chargée avec succès: ${url}`);
            // L'image est chargée, on peut l'utiliser dans le canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              console.warn("Impossible de créer le contexte du canvas");
              resolve(FALLBACK_LOGO);
              return;
            }
            
            // Dessiner l'image sur le canvas
            ctx.drawImage(img, 0, 0);
            
            // Convertir en base64
            try {
              const dataUrl = canvas.toDataURL('image/jpeg');
              resolve(dataUrl);
            } catch (e) {
              console.warn("Erreur lors de la conversion en base64:", e);
              resolve(FALLBACK_LOGO);
            }
          };
          
          img.onerror = () => {
            console.warn(`Erreur de chargement de l'image Firebase: ${url}`);
            resolve(FALLBACK_LOGO);
          };
          
          // Ajouter un timestamp pour éviter le cache
          const urlWithTimestamp = `${url}&t=${Date.now()}`;
          img.crossOrigin = "anonymous"; // Important pour éviter les erreurs CORS
          img.src = urlWithTimestamp;
          
          // Timeout de sécurité
          setTimeout(() => {
            if (!img.complete) {
              console.warn(`Timeout lors du chargement de l'image Firebase: ${url}`);
              resolve(FALLBACK_LOGO);
            }
          }, 5000);
        });
      } catch (error) {
        console.error("Erreur lors du traitement de l'image Firebase:", error);
        return FALLBACK_LOGO;
      }
    }
    
    // Pour les autres URL, continuer avec l'approche standard
    // Vérifier d'abord si l'image est valide
    const isValid = await validateImage(url);
    if (!isValid) {
      console.warn(`Image invalide: ${url}, utilisation du logo de secours`);
      return FALLBACK_LOGO;
    }
    
    // Utiliser l'URL complète avec le domaine actuel pour les chemins relatifs
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    console.log(`Chargement de l'image depuis: ${fullUrl}`);
    
    // Récupérer l'image
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.warn(`Impossible de charger l'image (status: ${response.status}), utilisation du logo de secours`);
      return FALLBACK_LOGO; // Utiliser le logo de secours
    }
    
    // Convertir en blob puis en base64
    const blob = await response.blob();
    
    // Vérifier que le blob est valide (taille minimale)
    if (blob.size < 100) {
      console.warn(`Image trop petite ou corrompue: ${url}, utilisation du logo de secours`);
      return FALLBACK_LOGO;
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Vérifier que le résultat est valide
        const result = reader.result as string;
        if (!result || result.length < 100) {
          console.warn(`Résultat de conversion invalide pour l'image: ${url}`);
          resolve(FALLBACK_LOGO);
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => {
        console.warn("Erreur lors de la lecture de l'image, utilisation du logo de secours");
        resolve(FALLBACK_LOGO); // Utiliser le logo de secours en cas d'erreur
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erreur lors du chargement de l'image:", error);
    // Retourner une image par défaut en cas d'erreur
    return FALLBACK_LOGO;
  }
}

// Interface pour le compteur
interface Compteur {
  presence?: boolean;
  numero?: string;
  releve?: string;
  localisation?: string;
  puissance?: string;
  observations?: string;
  photos?: Array<string | File>;
}

// Options pour la génération du PDF
export interface PDFOptions {
  filename?: string;
  openInNewTab?: boolean;
}

// Constantes pour les couleurs et le style
const COLORS = {
  primary: '#DC0032', // Rouge Arthur Loyd
  secondary: '#333333', // Gris foncé
  light: '#F8F8F8', // Gris très clair
  border: '#DDDDDD', // Gris pour les bordures
  success: '#22c55e', // Vert
  warning: '#f59e0b', // Orange
  info: '#3b82f6', // Bleu
  text: '#4B5563', // Gris texte
};

// Fonction principale pour générer le PDF à partir des données
export async function generateEtatDesLieuxPDF(formData: any, options: PDFOptions = {}) {
  try {
    console.log("====== DÉBUT DE LA GÉNÉRATION DU PDF ======");
    console.log("Préparation du PDF...");
    
    // Vérifions d'abord que pdfMake est correctement initialisé
    if (!pdfMake) {
      console.error("ERREUR CRITIQUE: pdfMake n'est pas disponible!");
      throw new Error("pdfMake n'est pas disponible");
    }
    
    console.log("pdfMake est disponible:", !!pdfMake);
    console.log("pdfMake.vfs est disponible:", !!pdfMake.vfs);
    
    // Chargement du logo depuis l'URL
    console.log("Chargement du logo depuis l'URL:", LOGO_URL);
    const logoBase64 = await loadImageAsBase64(LOGO_URL);
    console.log("Logo chargé avec succès.");
    
    // Variable globale temporaire pour que safeImage puisse y accéder
    (global as any).logoBase64 = logoBase64;
    
    // Prétraiter les données pour s'assurer que la structure est correcte
    console.log("Prétraitement des données du formulaire...");
    const preprocessedData = preprocessFormData(formData);
    
    // Traiter d'abord les images dans les données du formulaire pour éviter les problèmes lors de la génération
    console.log("Traitement des images...");
    const processedData = await processImages(preprocessedData);
    console.log("Images traitées avec succès");
    
    console.log("Préparation de la définition du document...");
    try {
      // Préparer le document
      const docDefinition = prepareDocDefinition(processedData, logoBase64);
      console.log("Définition du document préparée avec succès");
      
      // Pour déboguer - inspecter l'objet docDefinition pour les images
      const hasImages = JSON.stringify(docDefinition).includes('image:');
      console.log("Le document contient des images:", hasImages);
      
      console.log("Création du document PDF...");
      try {
        // Créer le document PDF avec gestion d'erreur explicite
        const pdfDocGenerator = pdfMake.createPdf(docDefinition as any);
        console.log("Document PDF créé avec succès");
        
        // Gérer les options (téléchargement, ouverture dans un nouvel onglet)
        if (options.openInNewTab) {
          console.log("Ouverture du PDF dans un nouvel onglet...");
          // Ouvrir le PDF sans callback d'erreur (non supporté par l'API)
          try {
            pdfDocGenerator.open();
            console.log("PDF ouvert avec succès");
          } catch (openError) {
            console.error("Erreur lors de l'ouverture du PDF:", openError);
            throw openError;
          }
        } else {
          const filename = options.filename || `etat-des-lieux-${processedData.typeEtatDesLieux}-${new Date().toISOString().split('T')[0]}.pdf`;
          console.log(`Téléchargement du PDF avec le nom: ${filename}...`);
          // Télécharger le PDF sans callback d'erreur (non supporté par l'API)
          try {
            pdfDocGenerator.download(filename);
            console.log("PDF téléchargé avec succès");
          } catch (downloadError) {
            console.error("Erreur lors du téléchargement du PDF:", downloadError);
            throw downloadError;
          }
        }
        
        console.log("====== FIN DE LA GÉNÉRATION DU PDF - SUCCÈS ======");
        return true;
      } catch (pdfCreateError) {
        console.error("ERREUR lors de la création du PDF:", pdfCreateError);
        throw pdfCreateError;
      }
    } catch (docDefError) {
      console.error("ERREUR lors de la préparation de la définition du document:", docDefError);
      throw docDefError;
    }
  } catch (error) {
    console.error('====== ERREUR FATALE lors de la génération du PDF ======', error);
    console.error('Message d\'erreur:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Non disponible');
    alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Fonction pour prétraiter les données du formulaire et s'assurer que la structure est correcte
export function preprocessFormData(formData: any): any {
  console.log("Prétraitement des données du formulaire...");
  
  // Copie profonde pour ne pas modifier les données originales
  const processedData = JSON.parse(JSON.stringify(formData));
  
  // Vérifier si les pièces existent et sont un tableau
  if (!processedData.pieces || !Array.isArray(processedData.pieces)) {
    console.warn("Attention: Les pièces sont manquantes ou ne sont pas un tableau", processedData.pieces);
    processedData.pieces = [];
    return processedData;
  }
  
  console.log(`Nombre de pièces à traiter: ${processedData.pieces.length}`);
  
  // Éléments standard à vérifier dans chaque pièce
  const standardElements = [
    "murs", "plafond", "sol", "plinthes", "fenetres", "portes", "electricite", 
    "chauffage", "radiateurs"
  ];
  
  // Normaliser le format des états pour chaque pièce
  processedData.pieces.forEach((piece: any, index: number) => {
    // S'assurer que la structure de la pièce est correcte
    if (!piece.etat || typeof piece.etat !== 'object') {
      console.warn(`Attention: L'objet etat est manquant ou invalide dans la pièce ${index}`, piece);
      piece.etat = {};
    }
    
    console.log(`Traitement de la pièce ${index + 1}: ${piece.nom || 'Sans nom'}`);
    console.log(`Structure de l'objet etat:`, Object.keys(piece.etat));
    
    try {
      // Utilisation de notre fonction sécurisée
      const values = safeObjectValues(piece.etat);
      console.log(`safeObjectValues fonctionne pour cette pièce, ${values.length} valeurs trouvées`);
    } catch (error) {
      console.error(`Erreur inattendue lors de l'utilisation de safeObjectValues:`, error);
    }

    standardElements.forEach(elementKey => {
      // Extraire l'état depuis les différentes sources possibles
      console.log(`Vérification de l'élément ${elementKey}...`);
      
      // Si l'état est déjà un objet, on essaie d'en extraire la valeur textuelle
      if (piece.etat[elementKey] && typeof piece.etat[elementKey] === 'object') {
        console.log(`L'état de ${elementKey} est un objet:`, piece.etat[elementKey]);
        
        // Chercher la valeur dans différentes propriétés possibles
        const etatValue = 
          piece.etat[elementKey].etat || 
          piece.etat[elementKey].label || 
          piece.etat[elementKey].value || 
          piece.etat[elementKey].text ||
          JSON.stringify(piece.etat[elementKey]);
        
        // Remplacer l'objet par sa valeur textuelle
        piece.etat[elementKey] = etatValue;
        console.log(`État de ${elementKey} normalisé en: ${etatValue}`);
      }
      
      // Faire de même pour les commentaires
      const commentKey = `${elementKey}Commentaire`;
      if (piece.etat[commentKey] && typeof piece.etat[commentKey] === 'object') {
        const commentValue = 
          piece.etat[commentKey].commentaire || 
          piece.etat[commentKey].comment || 
          piece.etat[commentKey].observations ||
          piece.etat[commentKey].text ||
          piece.etat[commentKey].value ||
          JSON.stringify(piece.etat[commentKey]);
        
        piece.etat[commentKey] = commentValue;
        console.log(`Commentaire de ${elementKey} normalisé en: ${commentValue}`);
      }
      
      // Vérifier si le commentaire existe ailleurs et le récupérer
      if (!piece.etat[commentKey] && piece[elementKey] && piece[elementKey].observations) {
        piece.etat[commentKey] = piece[elementKey].observations;
        console.log(`Commentaire récupéré depuis piece[${elementKey}].observations: ${piece.etat[commentKey]}`);
      }
      
      // Vérifier dans les commentaires généraux si applicable
      if (!piece.etat[commentKey] && piece.commentaires && piece.commentaires[elementKey]) {
        piece.etat[commentKey] = piece.commentaires[elementKey];
        console.log(`Commentaire récupéré depuis piece.commentaires[${elementKey}]: ${piece.etat[commentKey]}`);
      }
    });
    
    console.log(`Pièce ${index + 1} traitée, états finaux:`, Object.keys(piece.etat).join(', '));
  });
  
  console.log("Prétraitement terminé");
  return processedData;
}

// Fonction pour préparer la définition du document (mise à jour)
function prepareDocDefinition(processedData: any, logoBase64: string = '') {
  // Styles pour le document
  const styles = {
    header: {
      fontSize: 20,
      bold: true,
      color: COLORS.primary,
      margin: [0, 10, 0, 15]
    },
    subheader: {
      fontSize: 14,
      bold: true,
      color: COLORS.primary,
      margin: [0, 15, 0, 5]
    },
    sectionTitle: {
      fontSize: 12,
      bold: true,
      color: COLORS.secondary,
      margin: [0, 10, 0, 5]
    },
    table: {
      margin: [0, 5, 0, 15]
    },
    tableHeader: {
      bold: true,
      fontSize: 10,
      color: 'white',
      fillColor: COLORS.primary,
      alignment: 'center'
    },
    tableRow: {
      fontSize: 9,
      margin: [0, 3, 0, 3]
    },
    tableCellLabel: {
      fontSize: 9,
      bold: true,
      color: COLORS.secondary
    },
    infoBox: {
      margin: [0, 5, 0, 10],
      fillColor: COLORS.light,
      padding: 10
    }
  };
  
  // Définition du document
  return {
    pageSize: 'A4',
    pageMargins: [40, 80, 40, 60],
    
    // Styles du document
    styles: styles,
    
    // Définition des arrière-plans de page avec des éléments graphiques
    background: function(currentPage: number) {
      return [
        // Bande de couleur en haut de chaque page
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 595.28, // Largeur A4 en points
              h: 15,
              color: COLORS.primary
            }
          ]
        },
        // Accent visuel en bas de page
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 830,
              w: 595.28, // Largeur A4 en points
              h: 2,
              color: COLORS.primary
            }
          ]
        }
      ];
    },
    
    // Entête du document
    header: (currentPage: number, pageCount: number) => {
      return {
        margin: [40, 20, 40, 40],
        columns: [
          // Utiliser l'image du logo si disponible, sinon un texte de remplacement
          logoBase64 ? {
            image: logoBase64,
            width: 60,
            alignment: 'left'
          } : {
            text: 'Arthur Loyd',
            fontSize: 14,
            bold: true,
            color: COLORS.primary,
            alignment: 'left'
          },
          {
            text: `Page ${currentPage} sur ${pageCount}`,
            alignment: 'right',
            fontSize: 8,
            color: COLORS.secondary,
            margin: [0, 10, 0, 0]
          }
        ]
      };
    },
    
    // Pied de page
    footer: (currentPage: number) => {
      // Obtenir la date actuelle au format JJ/MM/AAAA
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      return {
        margin: [40, 10, 40, 10],
        columns: [
          {
            text: `© Arthur Loyd Bretagne - Document généré le ${formattedDate}`,
            fontSize: 8,
            color: COLORS.secondary,
            alignment: 'left'
          },
          {
            columns: [
              {
                text: 'PARAPHES',
                fontSize: 8, 
                color: COLORS.secondary,
                alignment: 'right',
                width: 'auto',
                margin: [0, 0, 5, 0]
              },
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: -3,
                    w: 20,
                    h: 15,
                    lineWidth: 0.5,
                    lineColor: COLORS.secondary
                  }
                ],
                width: 20
              }
            ],
            alignment: 'right'
          }
        ]
      };
    },
    
    // Contenu du document
    content: [
      // Page de garde avec mise en page élégante
      {
        stack: [
          {
            text: 'ÉTAT DES LIEUX',
            style: 'header',
            alignment: 'center',
            margin: [0, 100, 0, 20],
            fontSize: 28
          },
          {
            text: processedData.typeEtatDesLieux === 'entree' ? 'ENTRÉE' : 'SORTIE',
            style: 'header',
            alignment: 'center',
            fontSize: 24
          },
          {
            canvas: [
              {
                type: 'line',
                x1: 150,
                y1: 5,
                x2: 400,
                y2: 5,
                lineWidth: 2,
                lineColor: COLORS.primary
              }
            ],
            margin: [0, 10, 0, 20]
          },
          {
            columns: [
              {
                width: '*',
                text: ''
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'Bien immobilier:',
                    fontSize: 12,
                    bold: true,
                    margin: [0, 0, 0, 5]
                  },
                  {
                    text: `${getTypeBienLabel(processedData.typeBien)}`,
                    fontSize: 12,
                    margin: [0, 0, 0, 15],
                    italics: true
                  },
                  {
                    text: 'Adresse:',
                    fontSize: 12,
                    bold: true,
                    margin: [0, 0, 0, 5]
                  },
                  {
                    text: `${processedData.adresseBien || ''}, ${processedData.codePostalBien || ''} ${processedData.villeBien || ''}`,
                    fontSize: 12,
                    margin: [0, 0, 0, 15],
                    italics: true
                  },
                  {
                    text: 'Date:',
                    fontSize: 12,
                    bold: true,
                    margin: [0, 0, 0, 5]
                  },
                  {
                    text: `${formatDate(processedData.dateEtatDesLieux)}`,
                    fontSize: 12,
                    margin: [0, 0, 0, 15],
                    italics: true
                  }
                ],
                alignment: 'left'
              },
              {
                width: '*',
                text: ''
              }
            ]
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 40,
                y: 0,
                w: 480,
                h: 100,
                r: 5,
                lineWidth: 1,
                lineColor: COLORS.border,
                fillColor: COLORS.light
              }
            ],
            margin: [0, 40, 0, 5]
          },
          {
            text: 'Parties concernées:',
            fontSize: 12,
            bold: true,
            margin: [50, -95, 0, 10],
            color: COLORS.secondary
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'Propriétaire:',
                    fontSize: 10,
                    bold: true,
                    margin: [50, 0, 0, 3],
                    color: COLORS.primary
                  },
                  {
                    text: `${processedData.bailleur?.prenom || ''} ${processedData.bailleur?.nom || ''}`,
                    fontSize: 10,
                    margin: [50, 0, 0, 1]
                  },
                  {
                    text: `${processedData.bailleur?.adresse || ''}, ${processedData.bailleur?.codePostal || ''} ${processedData.bailleur?.ville || ''}`,
                    fontSize: 9,
                    margin: [50, 0, 0, 0],
                    color: COLORS.text
                  }
                ]
              },
              {
                width: '*',
                stack: [
                  {
                    text: 'Locataire:',
                    fontSize: 10,
                    bold: true,
                    margin: [0, 0, 0, 3],
                    color: COLORS.primary
                  },
                  {
                    text: `${processedData.locataire?.prenom || ''} ${processedData.locataire?.nom || ''}`,
                    fontSize: 10,
                    margin: [0, 0, 0, 1]
                  },
                  {
                    text: `${processedData.locataire?.adresse || ''}, ${processedData.locataire?.codePostal || ''} ${processedData.locataire?.ville || ''}`,
                    fontSize: 9,
                    margin: [0, 0, 0, 0],
                    color: COLORS.text
                  }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          }
        ],
        pageBreak: 'after'
      },
      
      // Sommaire
      {
        stack: [
          {
            text: 'SOMMAIRE',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            ol: [
              { 
                text: [
                  'INFORMATIONS SUR LE CONTRAT',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '3', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              },
              { 
                text: [
                  'ÉLÉMENTS REMIS AU LOCATAIRE',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '4', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              },
              { 
                text: [
                  'RELEVÉS DES COMPTEURS',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '5', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              },
              { 
                text: [
                  'PIÈCES ET ÉQUIPEMENTS',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '6', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              },
              { 
                text: [
                  'OBSERVATIONS GÉNÉRALES',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '12', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              },
              { 
                text: [
                  'SIGNATURES',
                  { text: ' .................................................. ', color: COLORS.border },
                  { text: '15', alignment: 'right' }
                ],
                margin: [0, 5, 0, 5]
              }
            ]
          }
        ],
        pageBreak: 'after'
      },
      
      // Informations sur le contrat
      {
        stack: [
          {
            text: '1. INFORMATIONS SUR LE CONTRAT',
            style: 'header',
            margin: [0, 10, 0, 15]
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 515,
                h: 2,
                color: COLORS.primary
              }
            ],
            margin: [0, 0, 0, 10]
          },
          createContratSection(processedData.contrat),
        ],
        pageBreak: 'after'
      },
      
      // Éléments remis au locataire
      {
        stack: [
          {
            text: '2. ÉLÉMENTS REMIS AU LOCATAIRE',
            style: 'header',
            margin: [0, 10, 0, 15]
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 515,
                h: 2,
                color: COLORS.primary
              }
            ],
            margin: [0, 0, 0, 10]
          },
          createElementsRemisSection(processedData.elements),
        ],
        pageBreak: 'after'
      },
      
      // Relevés des compteurs
      {
        stack: [
          {
            text: '3. RELEVÉS DES COMPTEURS',
            style: 'header',
            margin: [0, 10, 0, 15]
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 515,
                h: 5,
                r: 2,
                lineColor: COLORS.primary,
                fillColor: COLORS.primary
              }
            ],
            margin: [0, -5, 0, 10]
          }
        ]
      },
      
      // Compteur d'électricité
      ...(processedData.compteurs?.electricite?.presence ? [
        createCompteurSection('ÉLECTRICITÉ', processedData.compteurs.electricite)
      ] : []),
      
      // Compteur d'eau
      ...(processedData.compteurs?.eau?.presence ? [
        createCompteurSection('EAU', processedData.compteurs.eau)
      ] : []),
      
      // Compteur de gaz
      ...(processedData.compteurs?.gaz?.presence ? [
        createCompteurSection('GAZ', processedData.compteurs.gaz)
      ] : []),
      
      // Saut de page avant la section Pièces
      { text: '', pageBreak: 'after' },
      
      // Pièces et équipements
      {
        stack: [
          {
            text: '4. PIÈCES ET ÉQUIPEMENTS',
            style: 'header',
            margin: [0, 10, 0, 15]
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 515,
                h: 5,
                r: 2,
                lineColor: COLORS.primary,
                fillColor: COLORS.primary
              }
            ],
            margin: [0, -5, 0, 10]
          }
        ]
      },
      
      // Informations sur les pièces
      ...generateRoomTables(processedData.pieces || []),
      
      // Page pour les signatures
      {
        stack: [
          { text: '', pageBreak: 'before' },
          {
            text: 'SIGNATURES',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            text: [
              'Le présent état des lieux a été établi contradictoirement entre les parties qui le reconnaissent exact.',
              '\nFait à ', { text: processedData.villeBien || '___________________', italics: true }, 
              ', le ', { text: formatDate(processedData.dateEtatDesLieux) || '___________________', italics: true }
            ],
            margin: [0, 0, 0, 40]
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'LE BAILLEUR (ou son mandataire)',
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                  },
                  {
                    text: [
                      `${processedData.bailleur?.prenom || ''} ${processedData.bailleur?.nom || ''}`,
                      '\n',
                      `${processedData.bailleur?.adresse || ''}`,
                      '\n',
                      `${processedData.bailleur?.codePostal || ''} ${processedData.bailleur?.ville || ''}`,
                      '\n',
                      `Tél: ${processedData.bailleur?.telephone || ''}`,
                      '\n',
                      `Email: ${processedData.bailleur?.email || ''}`
                    ],
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                  },
                  {
                    canvas: [
                      {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: 220,
                        h: 100,
                        r: 5,
                        lineWidth: 1,
                        lineColor: COLORS.border
                      }
                    ]
                  },
                  {
                    text: 'Signature précédée de la mention',
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 5, 0, 0]
                  },
                  {
                    text: '"Lu et approuvé"',
                    fontSize: 8,
                    alignment: 'center',
                    italics: true
                  }
                ]
              },
              {
                width: 20,
                text: ''
              },
              {
                width: '*',
                stack: [
                  {
                    text: 'LE LOCATAIRE',
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                  },
                  {
                    text: [
                      `${processedData.locataire?.prenom || ''} ${processedData.locataire?.nom || ''}`,
                      '\n',
                      `Tél: ${processedData.locataire?.telephone || ''}`,
                      '\n',
                      `Email: ${processedData.locataire?.email || ''}`
                    ],
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                  },
                  {
                    canvas: [
                      {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: 220,
                        h: 100,
                        r: 5,
                        lineWidth: 1,
                        lineColor: COLORS.border
                      }
                    ]
                  },
                  {
                    text: 'Signature précédée de la mention',
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 5, 0, 0]
                  },
                  {
                    text: '"Lu et approuvé"',
                    fontSize: 8,
                    alignment: 'center',
                    italics: true
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    
    defaultStyle: {
      fontSize: 10,
      color: COLORS.text
    }
  };
}

// Fonction pour créer une section de compteur
function createCompteurSection(titre: string, compteur: Compteur) {
  const section: any = {
    stack: [
      {
        text: titre,
        style: 'subheader',
        margin: [0, 10, 0, 15]
      },
      {
        table: {
          widths: ['30%', '70%'],
          headerRows: 1,
          body: [
            [
              { text: 'INFORMATION', style: 'tableHeader' },
              { text: 'DÉTAIL', style: 'tableHeader' }
            ],
            [
              { text: 'Numéro du compteur', style: 'tableCellLabel' },
              { text: compteur.numero || 'Non renseigné' }
            ],
            [
              { text: 'Relevé', style: 'tableCellLabel' },
              { text: compteur.releve || 'Non renseigné' }
            ],
            [
              { text: 'Localisation', style: 'tableCellLabel' },
              { text: compteur.localisation || 'Non renseignée' }
            ]
          ]
        },
        layout: {
          fillColor: function(rowIndex: number) {
            return (rowIndex % 2 === 0 && rowIndex !== 0) ? COLORS.light : null;
          },
          hLineWidth: function(i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function(i: number, node: any) {
            return i === 0 || i === node.table.widths.length ? 1 : 0.5;
          },
          hLineColor: function(i: number) {
            return COLORS.border;
          },
          vLineColor: function(i: number) {
            return COLORS.border;
          }
        }
      }
    ],
    margin: [0, 0, 0, 20]
  };
  
  // Ajouter les photos si présentes
  if (compteur.photos && compteur.photos.length > 0) {
    section.stack.push({
      text: 'Photos',
      style: 'sectionTitle',
      margin: [0, 10, 0, 5]
    });
    
    // Créer une grille de photos avec 2 photos par ligne
    const photoRows: any[] = [];
    let currentRow: any[] = [];
    
    for (let i = 0; i < compteur.photos.length; i++) {
      currentRow.push(safeImage(compteur.photos[i]));
      
      // Après 2 photos ou à la fin, ajouter la ligne
      if (currentRow.length === 2 || i === compteur.photos.length - 1) {
        // Si la dernière ligne n'a qu'une photo, ajouter un espace vide pour l'alignement
        if (currentRow.length === 1) {
          currentRow.push({ text: '', width: 200 });
        }
        
        photoRows.push({
          columns: currentRow,
          columnGap: 10,
          margin: [0, 5, 0, 5]
        });
        
        currentRow = [];
      }
    }
    
    section.stack.push({
      stack: photoRows
    });
  }
  
  // Ajouter les observations si présentes
  if (compteur.observations) {
    section.stack.push({
      stack: [
        {
          text: 'Observations',
          style: 'sectionTitle',
          margin: [0, 10, 0, 5]
        },
        {
          text: compteur.observations,
          italics: true,
          margin: [0, 0, 0, 10]
        }
      ],
      style: 'infoBox'
    });
  }
  
  return section;
}

// Fonction pour générer les tableaux pour chaque pièce
function generateRoomTables(pieces: any[] = []) {
  if (!pieces || pieces.length === 0) {
    return [{
      text: 'Aucune pièce renseignée',
      style: 'subheader',
      margin: [0, 10, 0, 10]
    }];
  }
  
  console.log(`Génération des tableaux pour ${pieces.length} pièces`);
  
  // Tableaux pour chaque pièce
  const tables: any[] = [];
  
  // Créer un tableau par pièce
  pieces.forEach((piece: any, index: number) => {
    console.log(`Traitement de la pièce ${index + 1}:`, piece);
    
    // Ajouter un saut de page entre chaque pièce sauf la première
    if (index > 0) {
      tables.push({ text: '', pageBreak: 'before' });
    }
    
    // Titre de la pièce
    tables.push({
      text: `4.${index + 1} ${piece.nom || `Pièce ${index + 1}`}`,
      style: 'h2',
      margin: [0, 10, 0, 5]
    });
    
    // Sous-ligne de couleur
    tables.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#336699' }],
      margin: [0, 0, 0, 10]
    });
    
    // Vérifier que l'état existe
    if (!piece.etat) {
      piece.etat = {};
    }
    
    // Créer le tableau d'état des éléments avec nature et état combinés
    const tableBody = [
      // En-tête du tableau
      [
        { text: 'ÉLÉMENT', style: 'tableHeader' },
        { text: 'NATURE/TYPE', style: 'tableHeader' },
        { text: 'ÉTAT', style: 'tableHeader' },
        { text: 'COMMENTAIRE', style: 'tableHeader' }
      ]
    ];
    
    // Éléments standard à vérifier
    const elements = [
      { key: 'sols', label: 'Sol' },
      { key: 'murs', label: 'Murs' },
      { key: 'plafonds', label: 'Plafond' },
      { key: 'plinthes', label: 'Plinthes' },
      { key: 'fenetres', label: 'Fenêtres' },
      { key: 'portes', label: 'Portes' },
      { key: 'chauffage', label: 'Chauffage' },
      { key: 'prises', label: 'Prises électriques' },
      { key: 'interrupteurs', label: 'Interrupteurs' }
    ];
    
    // Ajouter chaque élément au tableau
    elements.forEach(({ key, label }) => {
      let natureValue = 'Non renseigné';
      let etatValue = 'Non renseigné';
      let commentaireValue = '-';
      
      try {
        // Si l'élément existe et a une nature
        if (piece[key] && piece[key].nature) {
          natureValue = piece[key].nature;
        }
        
        // Si l'élément existe et a un état
        if (piece[key] && piece[key].etat) {
          etatValue = getEtatLabel(piece[key].etat);
        }
        
        // Si l'élément a un commentaire
        if (piece[key] && piece[key].observations) {
          commentaireValue = piece[key].observations;
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération des informations pour ${key}:`, error);
      }
      
      // Utilisation de any pour contourner les limitations de typage
      const cellWithColor: any = { 
        text: etatValue, 
        style: 'tableRow', 
        color: getEtatColor(piece[key]?.etat || 'non_renseigne')
      };
      
      tableBody.push([
        { text: label, style: 'tableCellLabel' },
        { text: natureValue, style: 'tableRow' },
        cellWithColor,
        { text: commentaireValue, style: 'tableRow' }
      ]);
    });
    
    // Ajouter les équipements supplémentaires s'ils existent
    if (piece.equipements && Array.isArray(piece.equipements) && piece.equipements.length > 0) {
      console.log(`Ajout de ${piece.equipements.length} équipements supplémentaires au tableau`);
      
      piece.equipements.forEach((equipement: any) => {
        if (equipement && equipement.nom) {
          const etatValue = equipement.etat || 'Non renseigné';
          const observationsValue = equipement.observations || '-';
          
          // Utilisation de any pour contourner les limitations de typage
          const cellWithColor: any = { 
            text: etatValue, 
            style: 'tableRow', 
            color: getEtatColor(equipement.etat || 'non_renseigne')
          };
          
          tableBody.push([
            { text: equipement.nom, style: 'tableCellLabel' },
            { text: 'Non renseigné', style: 'tableRow' },
            cellWithColor,
            { text: observationsValue, style: 'tableRow' }
          ]);
        }
      });
    }
    
    tables.push({
      table: {
        widths: ['15%', '25%', '20%', '40%'],
        headerRows: 1,
        body: tableBody
      },
      layout: {
        fillColor: function(rowIndex: number) {
          return (rowIndex % 2 === 0 && rowIndex !== 0) ? COLORS.light : null;
        },
        hLineWidth: function(i: number, node: any) {
          return i === 0 || i === node.table.body.length ? 1 : 0.5;
        },
        vLineWidth: function(i: number, node: any) {
          return i === 0 || i === node.table.widths.length ? 1 : 0.5;
        },
        hLineColor: function(i: number) {
          return COLORS.border;
        },
        vLineColor: function(i: number) {
          return COLORS.border;
        }
      },
      margin: [0, 0, 0, 20]
    });
    
    // Commentaire général sur la pièce si présent
    if (piece.commentaire) {
      tables.push({
        stack: [
          {
            text: 'Commentaire général',
            style: 'sectionTitle',
            margin: [0, 5, 0, 5]
          },
          {
            text: piece.commentaire,
            italics: true
          }
        ],
        style: 'infoBox'
      });
    }
    
    // Photos de la pièce si présentes
    if (piece.photos && piece.photos.length > 0) {
      tables.push({
        text: 'Photos',
        style: 'sectionTitle',
        margin: [0, 10, 0, 5]
      });
      
      // Créer une grille de photos avec 2 photos par ligne
      const photoRows: any[] = [];
      let currentRow: any[] = [];
      
      for (let i = 0; i < piece.photos.length; i++) {
        currentRow.push(safeImage(piece.photos[i]));
        
        // Après 2 photos ou à la fin, ajouter la ligne
        if (currentRow.length === 2 || i === piece.photos.length - 1) {
          // Si la dernière ligne n'a qu'une photo, ajouter un espace vide pour l'alignement
          if (currentRow.length === 1) {
            currentRow.push({ text: '', width: 170, margin: [5, 10, 5, 10] });
          }
          
          photoRows.push({
            columns: currentRow,
            columnGap: 10,
            margin: [0, 5, 0, 5]
          });
          
          currentRow = [];
        }
      }
      
      tables.push({
        stack: photoRows,
        margin: [0, 0, 0, 20]
      });
    }
  });
  
  return tables;
}

// Fonction simplifiée pour traiter les images - évite les erreurs de PDF
async function processImages(formData: any) {
  console.log("Traitement des images...");
  
  // Récupérer le logo chargé ou utiliser le logo de secours
  const currentLogo = (global as any).logoBase64 || FALLBACK_LOGO;
  
  // Copie profonde pour éviter de modifier l'original
  const processedData = JSON.parse(JSON.stringify(formData));
  
  // Fonction pour traiter les tableaux de photos
  const processPhotoArray = async (photos: any[]) => {
    const result = [];
    
    if (!Array.isArray(photos)) {
      console.warn("Photos n'est pas un tableau, retournant un tableau vide");
      return [];
    }
    
    // Pour chaque photo, essayer de la traiter
    console.log(`Traitement de ${photos.length} photos`);
    console.log("Types des photos:", photos.map(p => typeof p));
    console.log("Valeurs des photos:", photos.map(p => {
      if (typeof p === 'string') {
        return p.substring(0, 30) + '...';
      } else if (typeof p === 'object' && p !== null) {
        return Object.keys(p);
      } else {
        return String(p);
      }
    }));
    
    // Si aucune photo n'est présente, retourner un tableau vide
    if (photos.length === 0) {
      console.warn("Aucune photo dans le tableau, retournant un tableau vide");
      return [];
    }
    
    // Créer un Set pour stocker les photos déjà ajoutées et éviter les doublons
    const addedPhotos = new Set();
    
    for (let i = 0; i < photos.length; i++) {
      try {
        const photo = photos[i];
        if (!photo) {
          console.warn(`Photo ${i} est vide, ignorée`);
          continue;
        }
        
        // Cas 1: Photo est une chaîne base64
        if (typeof photo === 'string' && photo.startsWith('data:')) {
          // Vérification moins stricte pour les images base64
          if (photo.includes(';base64,')) {
            // Vérifier si cette photo a déjà été ajoutée (éviter les doublons)
            const photoSignature = photo.substring(0, 100) + photo.length;
            if (!addedPhotos.has(photoSignature)) {
              addedPhotos.add(photoSignature);
              result.push(photo);
              console.log(`Photo ${i} (base64) ajoutée avec succès`);
            } else {
              console.warn(`Photo ${i} ignorée car c'est un doublon`);
            }
          } else {
            console.warn(`Photo ${i} est une image base64 invalide, ignorée`);
          }
        }
        // Cas 2: Photo est une URL Firebase Storage
        else if (typeof photo === 'string' && photo.includes('firebasestorage.googleapis.com')) {
          console.log(`Photo ${i} est une URL Firebase Storage: ${photo.substring(0, 50)}...`);
          
          // Pour les URL Firebase Storage, on utilise une approche spéciale
          try {
            // Essayer de charger l'image via loadImageAsBase64
            const base64Data = await loadImageAsBase64(photo);
            
            // Vérifier si c'est une image valide (pas le logo de secours)
            if (base64Data !== FALLBACK_LOGO) {
              const photoSignature = base64Data.substring(0, 100) + base64Data.length;
              if (!addedPhotos.has(photoSignature)) {
                addedPhotos.add(photoSignature);
                result.push(base64Data);
                console.log(`Photo Firebase ${i} ajoutée avec succès`);
              } else {
                console.warn(`Photo Firebase ${i} ignorée car c'est un doublon`);
              }
            } else {
              console.warn(`Photo Firebase ${i} n'a pas pu être chargée, utilisation du logo de secours`);
              // Ajouter le logo de secours uniquement si nous n'avons pas d'autres images
              if (result.length === 0) {
                result.push(FALLBACK_LOGO);
              }
            }
          } catch (firebaseError) {
            console.error(`Erreur lors du chargement de l'URL Firebase ${photo.substring(0, 50)}...`, firebaseError);
            // Ajouter le logo de secours uniquement si nous n'avons pas d'autres images
            if (result.length === 0) {
              result.push(FALLBACK_LOGO);
            }
          }
        }
        // Cas 3: Photo est un objet avec une URL ou une propriété downloadUrl
        else if (typeof photo === 'object' && photo !== null) {
          console.log(`Photo ${i} est un objet:`, Object.keys(photo));
          // Essayer de trouver une URL valide dans l'objet
          const possibleUrlProps = ['url', 'src', 'downloadUrl', 'source', 'path', 'preview'];
          let foundUrl = null;
          
          for (const prop of possibleUrlProps) {
            if (photo[prop] && typeof photo[prop] === 'string') {
              foundUrl = photo[prop];
              console.log(`URL trouvée dans la propriété ${prop}: ${photo[prop].substring(0, 30)}...`);
              break;
            }
          }
          
          if (foundUrl) {
            try {
              // Si c'est déjà une base64, l'utiliser directement
              if (foundUrl.startsWith('data:')) {
                const photoSignature = foundUrl.substring(0, 100) + foundUrl.length;
                if (!addedPhotos.has(photoSignature)) {
                  addedPhotos.add(photoSignature);
                  result.push(foundUrl);
                  console.log(`Photo ${i} (objet avec base64) ajoutée avec succès`);
                } else {
                  console.warn(`Photo ${i} (objet avec base64) ignorée car c'est un doublon`);
                }
              } 
              // Si c'est une URL Firebase Storage, utiliser l'approche spéciale
              else if (foundUrl.includes('firebasestorage.googleapis.com')) {
                try {
                  console.log(`Tentative de chargement de l'URL Firebase: ${foundUrl.substring(0, 50)}...`);
                  const base64Data = await loadImageAsBase64(foundUrl);
                  
                  // Vérifier si c'est une image valide (pas le logo de secours)
                  if (base64Data !== FALLBACK_LOGO) {
                    const photoSignature = base64Data.substring(0, 100) + base64Data.length;
                    if (!addedPhotos.has(photoSignature)) {
                      addedPhotos.add(photoSignature);
                      result.push(base64Data);
                      console.log(`Photo Firebase ${i} (objet) ajoutée avec succès`);
                    } else {
                      console.warn(`Photo Firebase ${i} (objet) ignorée car c'est un doublon`);
                    }
                  } else {
                    console.warn(`Photo Firebase ${i} (objet) n'a pas pu être chargée, utilisation du logo de secours`);
                    // Ajouter le logo de secours uniquement si nous n'avons pas d'autres images
                    if (result.length === 0) {
                      result.push(FALLBACK_LOGO);
                    }
                  }
                } catch (firebaseError) {
                  console.error(`Erreur lors du chargement de l'URL Firebase (objet) ${foundUrl.substring(0, 50)}...`, firebaseError);
                  // Ajouter le logo de secours uniquement si nous n'avons pas d'autres images
                  if (result.length === 0) {
                    result.push(FALLBACK_LOGO);
                  }
                }
              }
              // Sinon, essayer de charger l'URL comme une image normale
              else if (foundUrl.startsWith('http') || foundUrl.startsWith('blob:')) {
                try {
                  console.log(`Tentative de chargement de l'URL: ${foundUrl}`);
                  const base64Data = await loadImageAsBase64(foundUrl);
                  const photoSignature = base64Data.substring(0, 100) + base64Data.length;
                  if (!addedPhotos.has(photoSignature)) {
                    addedPhotos.add(photoSignature);
                    result.push(base64Data);
                    console.log(`Photo ${i} (URL chargée) ajoutée avec succès`);
                  } else {
                    console.warn(`Photo ${i} (URL chargée) ignorée car c'est un doublon`);
                  }
                } catch (urlError) {
                  console.error(`Erreur lors du chargement de l'URL ${foundUrl}:`, urlError);
                  // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
                }
              } else {
                console.warn(`URL non reconnue pour la photo ${i}: ${foundUrl}`);
                // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
              }
            } catch (objError) {
              console.error(`Erreur lors du traitement de l'objet photo ${i}:`, objError);
              // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
            }
          } else {
            console.warn(`Photo ${i} est un objet sans URL valide, ignorée`);
            // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
          }
        }
        // Cas 4: Autres types (non reconnus)
        else {
          console.warn(`Photo ${i} n'est pas reconnue (type: ${typeof photo}), ignorée`);
          // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la photo ${i}:`, error);
        // Ne pas ajouter de logo de remplacement, simplement ignorer cette photo
      }
    }
    
    console.log(`Traitement terminé, ${result.length} photos valides sur ${photos.length}`);
    return result;
  };
  
  // Traiter toutes les photos des compteurs
  if (processedData.compteurs) {
    for (const compteurKey in processedData.compteurs) {
      const compteur = processedData.compteurs[compteurKey];
      if (compteur && compteur.photos && Array.isArray(compteur.photos)) {
        compteur.photos = await processPhotoArray(compteur.photos);
      }
    }
  }
  
  // Traiter toutes les photos des pièces
  if (processedData.pieces && Array.isArray(processedData.pieces)) {
    for (let i = 0; i < processedData.pieces.length; i++) {
      if (processedData.pieces[i] && processedData.pieces[i].photos && Array.isArray(processedData.pieces[i].photos)) {
        processedData.pieces[i].photos = await processPhotoArray(processedData.pieces[i].photos);
      }
    }
  }
  
  console.log("Traitement des images terminé");
  return processedData;
}

// Fonction pour convertir un fichier en base64
async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      reject(new Error("Fichier invalide"));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || result.length < 100) {
        reject(new Error("Résultat de conversion invalide"));
      } else {
        resolve(result);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Fonction pour tester la validité d'une image en base64
function isValidBase64Image(base64String: string): boolean {
  if (!base64String || typeof base64String !== 'string') {
    return false;
  }
  
  // Vérifier si c'est une chaîne base64 avec un en-tête d'image valide
  if (!base64String.startsWith('data:image/') && !base64String.startsWith('data:application/octet-stream')) {
    return false;
  }
  
  // Vérifier si la chaîne contient la partie base64
  if (!base64String.includes(';base64,')) {
    return false;
  }
  
  // Extraire la partie base64
  const base64Data = base64String.split(';base64,')[1];
  
  // Vérifier que la partie base64 existe et n'est pas trop courte
  if (!base64Data || base64Data.length < 10) {
    return false;
  }
  
  // Vérifier que la chaîne base64 contient uniquement des caractères valides
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(base64Data)) {
    return false;
  }
  
  return true;
}

// Fonction pour garantir qu'une image est sûre pour PDFMake
function safeImage(imageSource: any) {
  try {
    console.log("Type d'image reçu:", typeof imageSource);
    
    // Récupérer le logo chargé ou utiliser le logo de secours
    const currentLogo = (global as any).logoBase64 || FALLBACK_LOGO;
    
    // Si l'image est vide ou non définie, retourner null pour ne pas afficher d'image
    if (!imageSource) {
      console.warn("Image source vide, aucune image ne sera affichée");
      return null;
    }
    
    // Si c'est une chaîne commençant par data: (base64)
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:')) {
        // L'image est une chaîne base64 valide, on peut l'utiliser
        return {
          image: imageSource,
          width: 170, // Réduction de la largeur de 180 à 170
          margin: [5, 10, 5, 10],
          fit: [170, 130] // Réduction des dimensions maximales
        };
      } else if (imageSource.startsWith('http')) {
        // L'image est une URL, mais pdfmake ne peut pas utiliser directement les URLs
        // Nous devons utiliser le logo de remplacement pour l'instant
        console.warn("URL d'image externe détectée, mais non supportée directement. Utilisation du logo de remplacement:", imageSource);
        return {
          image: currentLogo,
          width: 170,
          margin: [5, 10, 5, 10],
          fit: [170, 130]
        };
      }
    }
    
    // Si c'est un objet avec une URL de téléchargement (structure Firebase Storage)
    if (typeof imageSource === 'object' && imageSource !== null) {
      console.log("Traitement d'un objet image:", Object.keys(imageSource).join(", "));
      
      // Vérifier toutes les possibilités d'accès à l'URL
      if (imageSource.downloadUrl) {
        console.log("URL de téléchargement trouvée dans l'objet:", imageSource.downloadUrl);
        return {
          image: currentLogo, // On utilise le logo car pdfmake ne peut pas utiliser les URLs directement
          width: 170,
          margin: [5, 10, 5, 10],
          fit: [170, 130]
        };
      } else if (imageSource.url) {
        console.log("URL trouvée dans l'objet:", imageSource.url);
        return {
          image: currentLogo, // On utilise le logo car pdfmake ne peut pas utiliser les URLs directement
          width: 170,
          margin: [5, 10, 5, 10],
          fit: [170, 130]
        };
      } else if (imageSource.preview && typeof imageSource.preview === 'string' && imageSource.preview.startsWith('data:')) {
        // Si nous avons un aperçu base64, utilisons-le
        console.log("Aperçu base64 trouvé dans l'objet");
        return {
          image: imageSource.preview,
          width: 170,
          margin: [5, 10, 5, 10],
          fit: [170, 130]
        };
      }
    }
    
    // Dans tous les autres cas, retourner null pour ne pas afficher d'image
    console.warn("Type d'image non reconnu, aucune image ne sera affichée:", 
                typeof imageSource === 'string' ? imageSource : typeof imageSource);
    return null;
  } catch (error) {
    console.error("Erreur lors du traitement de l'image:", error);
    return null;
  }
}

// Fonction utilitaire pour appeler Object.values en toute sécurité
function safeObjectValues(obj: any): any[] {
  if (!obj || typeof obj !== 'object') {
    console.warn('Tentative d\'utiliser Object.values sur une non-objet:', obj);
    return [];
  }
  
  try {
    return Object.values(obj);
  } catch (error) {
    console.error('Erreur lors de l\'utilisation de Object.values:', error);
    
    // Alternative manuelle si Object.values échoue
    const values: any[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        values.push(obj[key]);
      }
    }
    return values;
  }
}

// Fonction pour créer la section contrat
function createContratSection(contrat: any) {
  if (!contrat) return { text: "Aucune information sur le contrat disponible", style: 'text' };
  
  return {
    stack: [
      {
        style: 'table',
        table: {
          widths: ['40%', '60%'],
          headerRows: 0,
          body: [
            [
              { text: 'Date de signature', style: 'tableCellLabel' },
              { text: formatDate(contrat.dateSignature) || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Date d\'entrée', style: 'tableCellLabel' },
              { text: formatDate(contrat.dateEntree) || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Date de sortie', style: 'tableCellLabel' },
              { text: formatDate(contrat.dateSortie) || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Durée du contrat', style: 'tableCellLabel' },
              { text: contrat.dureeContrat || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Montant du loyer', style: 'tableCellLabel' },
              { text: contrat.montantLoyer || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Montant des charges', style: 'tableCellLabel' },
              { text: contrat.montantCharges || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Montant du dépôt de garantie', style: 'tableCellLabel' },
              { text: contrat.montantDepotGarantie || 'Non spécifié', style: 'tableRow' }
            ],
            [
              { text: 'Type d\'activité', style: 'tableCellLabel' },
              { text: contrat.typeActivite || 'Non spécifié', style: 'tableRow' }
            ]
          ]
        },
        layout: {
          fillColor: function(rowIndex: number) {
            return (rowIndex % 2 === 0) ? '#F9F9F9' : null;
          }
        }
      }
    ]
  };
}

// Fonction pour créer la section éléments remis
function createElementsRemisSection(elements: any) {
  if (!elements) return { text: "Aucune information sur les éléments remis disponible", style: 'text' };
  
  const stack: any[] = [];
  
  // Section clés
  if (elements.cles) {
    stack.push({ text: 'Clés', style: 'subheader', margin: [0, 10, 0, 5] });
    stack.push({
      style: 'table',
      table: {
        widths: ['40%', '60%'],
        headerRows: 0,
        body: [
          [
            { text: 'Nombre de clés', style: 'tableCellLabel' },
            { text: elements.cles.nombre || '0', style: 'tableRow' }
          ],
          [
            { text: 'Détail', style: 'tableCellLabel' },
            { text: elements.cles.detail || 'Non spécifié', style: 'tableRow' }
          ]
        ]
      },
      layout: {
        fillColor: function(rowIndex: number) {
          return (rowIndex % 2 === 0) ? '#F9F9F9' : null;
        }
      }
    });
  }
  
  // Section badges
  if (elements.badges) {
    stack.push({ text: 'Badges/cartes d\'accès', style: 'subheader', margin: [0, 15, 0, 5] });
    stack.push({
      style: 'table',
      table: {
        widths: ['40%', '60%'],
        headerRows: 0,
        body: [
          [
            { text: 'Nombre de badges', style: 'tableCellLabel' },
            { text: elements.badges.nombre || '0', style: 'tableRow' }
          ],
          [
            { text: 'Détail', style: 'tableCellLabel' },
            { text: elements.badges.detail || 'Non spécifié', style: 'tableRow' }
          ]
        ]
      },
      layout: {
        fillColor: function(rowIndex: number) {
          return (rowIndex % 2 === 0) ? '#F9F9F9' : null;
        }
      }
    });
  }
  
  // Section télécommandes
  if (elements.telecommandes) {
    stack.push({ text: 'Télécommandes', style: 'subheader', margin: [0, 15, 0, 5] });
    stack.push({
      style: 'table',
      table: {
        widths: ['40%', '60%'],
        headerRows: 0,
        body: [
          [
            { text: 'Nombre de télécommandes', style: 'tableCellLabel' },
            { text: elements.telecommandes.nombre || '0', style: 'tableRow' }
          ],
          [
            { text: 'Détail', style: 'tableCellLabel' },
            { text: elements.telecommandes.detail || 'Non spécifié', style: 'tableRow' }
          ]
        ]
      },
      layout: {
        fillColor: function(rowIndex: number) {
          return (rowIndex % 2 === 0) ? '#F9F9F9' : null;
        }
      }
    });
  }
  
  // Section documents
  if (elements.documents) {
    stack.push({ text: 'Documents remis', style: 'subheader', margin: [0, 15, 0, 5] });
    stack.push({
      style: 'table',
      table: {
        widths: ['70%', '30%'],
        headerRows: 0,
        body: [
          [
            { text: 'Diagnostics techniques', style: 'tableCellLabel' },
            { text: elements.documents.diagnostics ? 'Oui' : 'Non', style: 'tableRow' }
          ],
          [
            { text: 'Plans des locaux', style: 'tableCellLabel' },
            { text: elements.documents.planLocaux ? 'Oui' : 'Non', style: 'tableRow' }
          ],
          [
            { text: 'Règlement d\'immeuble', style: 'tableCellLabel' },
            { text: elements.documents.reglementImmeuble ? 'Oui' : 'Non', style: 'tableRow' }
          ],
          [
            { text: 'Notice de maintenance', style: 'tableCellLabel' },
            { text: elements.documents.noticeMaintenance ? 'Oui' : 'Non', style: 'tableRow' }
          ]
        ]
      },
      layout: {
        fillColor: function(rowIndex: number) {
          return (rowIndex % 2 === 0) ? '#F9F9F9' : null;
        }
      }
    });
  }
  
  // Autres éléments
  if (elements.autresElements) {
    stack.push({ text: 'Autres éléments', style: 'subheader', margin: [0, 15, 0, 5] });
    stack.push({ text: elements.autresElements, style: 'text', margin: [0, 5, 0, 0] });
  }
  
  return { stack };
}

// Fonction pour créer une table de photos
function createPhotosTable(photos: any[], title: string = "Photos") {
  const tables = [];
  
  // Vérifier si le tableau de photos est vide
  if (!photos || photos.length === 0) {
    console.log(`Aucune photo à afficher pour: ${title}`);
    return [{
      text: "Aucune photo disponible",
      style: "photosInfo",
      margin: [0, 5, 0, 15]
    }];
  }
  
  // Ajouter le titre
  tables.push({
    text: title,
    style: "photosTitle",
    margin: [0, 10, 0, 5]
  });
  
  // Déterminer le nombre de photos par ligne en fonction du nombre total de photos
  // Si peu de photos (<= 4), afficher 2 par ligne pour les rendre plus grandes
  // Sinon afficher 3 par ligne
  const photosPerRow = photos.length <= 4 ? 2 : 3;
  console.log(`Affichage des photos: ${photos.length} photos, ${photosPerRow} par ligne`);
  
  // Taille des photos en fonction du nombre par ligne
  const photoWidth = photosPerRow === 2 ? 240 : 160; // Largeur réduite pour 3 photos par ligne
  
  // Créer des lignes de photos
  const photoRows: any[] = [];
  let currentRow: any[] = [];
  
  photos.forEach((photo, index) => {
    // Traiter l'image pour s'assurer qu'elle est sûre pour PDFMake
    const safeImageObj = safeImage(photo);
    
    // Si l'image est valide, l'ajouter à la ligne courante
    if (safeImageObj) {
      // Ajuster la taille de l'image en fonction du nombre par ligne
      safeImageObj.width = photoWidth;
      
      currentRow.push(safeImageObj);
      
      // Si nous avons atteint le nombre de photos par ligne ou si c'est la dernière photo, ajouter la ligne
      if (currentRow.length === photosPerRow || index === photos.length - 1) {
        // Si la ligne n'est pas complète, ajouter des espaces vides
        while (currentRow.length < photosPerRow) {
          currentRow.push({ text: "", width: photoWidth, margin: [5, 10, 5, 10] });
        }
        
        // Ajouter la ligne au tableau
        photoRows.push({
          columns: currentRow,
          columnGap: 10,
          margin: [0, 5, 0, 5]
        });
        
        // Réinitialiser la ligne courante
        currentRow = [];
      }
    }
  });
  
  // Si aucune photo valide n'a été ajoutée
  if (photoRows.length === 0) {
    tables.push({
      text: "Aucune photo valide disponible",
      style: "photosInfo",
      margin: [0, 5, 0, 15]
    });
  } else {
    tables.push({
      stack: photoRows,
      margin: [0, 0, 0, 20]
    });
  }
  
  return tables;
}
