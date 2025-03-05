import { jsPDF } from "jspdf";
// Importation conditionnelle pour éviter les problèmes côté serveur
let autoTable: any;
if (typeof window !== 'undefined') {
  import('jspdf-autotable').then((module) => {
    autoTable = module.default;
  });
}

interface GeneratePDFOptions {
  scale?: number;
  quality?: number;
  unit?: "pt" | "px" | "mm";
  format?: "a4" | [number, number];
}

// URL du logo Arthur Loyd
const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png";

// Interface pour le type de compteur
interface Compteur {
  releve?: boolean;
  estReleve?: boolean;
  numero?: string;
  valeur?: string;
  date?: string | Date;
  puissance?: string;
  localisation?: string;
  [key: string]: any; // Pour les propriétés additionnelles
}

export async function generatePDFFromData(data: any, options: GeneratePDFOptions = {}): Promise<Blob> {
  console.log("Début de la génération du PDF");

  try {
    // Vérifier si data est valide
    if (!data || typeof data !== "object") {
      console.error("Données invalides pour la génération du PDF");
      throw new Error("Invalid data for PDF generation");
    }

    console.log("Données valides, initialisation du document PDF");

    // Initialiser le document PDF
    let doc: jsPDF | null = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    if (!doc) {
      console.error("Erreur lors de l'initialisation du document PDF");
      throw new Error("Failed to initialize PDF document");
    }

    // Définir les dimensions et marges
    const pageWidth = 210; // A4 largeur en mm (identique à l'aperçu)
    const pageHeight = 297; // A4 hauteur en mm (identique à l'aperçu)
    const margin = 15; // Marge en mm (identique à l'aperçu)
    const contentWidth = pageWidth - margin * 2;

    // Définir les couleurs
    const primaryColor = "#DC0032"; // Rouge Arthur Loyd
    const secondaryColor = "#424242"; // Gris foncé
    const lightGray = "#DDDDDD"; // Gris clair pour les bordures

    // Configurer les polices
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor);

    // Variables de suivi de position
    let yPos = margin + 10;
    let currentPage = 0;

    // Fonction pour formater les dates
    const formatDate = (date?: string | Date): string => {
      if (!date) return "";
      try {
        // Si c'est un objet Date, le formater
        if (date instanceof Date) {
          return date.toLocaleDateString('fr-FR');
        }
        // Sinon, supposer que c'est une chaîne et la retourner directement
        return date.toString();
      } catch (error) {
        console.error("Erreur lors du formatage de la date:", error);
        return "";
      }
    };

    // Fonction utilitaire pour convertir les clés techniques en libellés lisibles
    const convertirCleEnLibelle = (cle: string): string => {
      const mappings: Record<string, string> = {
        'electricite': 'Électricité',
        'eauFroide': 'Eau froide',
        'eauChaude': 'Eau chaude',
        'gaz': 'Gaz',
        'chauffage': 'Chauffage',
        'internet': 'Internet',
        'telephonie': 'Téléphonie'
      };
      
      return mappings[cle] || cle;
    };

    // Fonction pour tronquer le texte si nécessaire
    const truncateText = (text: string, maxWidth: number, fontSize: number): string => {
      if (!doc) return text;
      
      doc.setFontSize(fontSize);
      
      if (doc.getTextWidth(text) <= maxWidth) return text;
      
      let truncated = text;
      while (doc.getTextWidth(truncated + "...") > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      
      return truncated + "...";
    };

    // Fonction pour vérifier s'il reste assez d'espace sur la page
    const checkNewPage = async (requiredSpace: number, forceNewPage: boolean = false): Promise<boolean> => {
      // Si on force une nouvelle page ou si l'espace restant est insuffisant
      if (forceNewPage || yPos + requiredSpace > pageHeight - margin) {
        await addNewPage();
        return true;
      }
      return false;
    };

    // Fonction pour ajouter l'en-tête
    const addHeader = async (pageNum: number): Promise<void> => {
      // Position Y pour commencer l'en-tête
      yPos = margin;
      
      try {
        // Logo
        await addImageFromUrl(
          LOGO_URL,
          margin,
          yPos,
          40,
          12
        );
        
        // Titre centré
        doc!.setFont("helvetica", "bold");
        doc!.setFontSize(18);
        doc!.setTextColor(primaryColor);
        doc!.text("ÉTAT DES LIEUX", pageWidth - margin, yPos + 10, { align: "right" });
        
        // Sous-titre (type d'état des lieux)
        if (data?.typeEtatDesLieux === "entree" || data?.typeEtat === "entree") {
          doc!.setFontSize(14);
          doc!.text("ENTRÉE", pageWidth - margin, yPos + 20, { align: "right" });
        } else if (data?.typeEtatDesLieux === "sortie" || data?.typeEtat === "sortie") {
          doc!.setFontSize(14);
          doc!.text("SORTIE", pageWidth - margin, yPos + 20, { align: "right" });
        }
        
        // Numéro de page
        doc!.setFontSize(8);
        doc!.setTextColor(secondaryColor);
        doc!.text(`Page ${pageNum}`, pageWidth - margin, yPos, { align: "right" });
        
        // Ligne de séparation
        doc!.setDrawColor(lightGray);
        doc!.setLineWidth(0.5);
        doc!.line(margin, yPos + 25, pageWidth - margin, yPos + 25);
        
        // Mise à jour de la position Y
        yPos += 30; // Réduit de 35 à 30 pour économiser de l'espace
      } catch (error) {
        console.error("Erreur lors de l'ajout de l'en-tête:", error);
      }
    };

    // Fonction pour ajouter le pied de page
    const addFooter = (): void => {
      try {
        const footerY = pageHeight - 10;
        
        // Ligne de séparation
        doc!.setDrawColor(lightGray);
        doc!.setLineWidth(0.5);
        doc!.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        // Texte du pied de page
        doc!.setFontSize(8);
        doc!.setTextColor(secondaryColor);
        doc!.setFont("helvetica", "normal");
        
        // Texte à gauche
        doc!.text(
          "Arthur Loyd - État des lieux", 
          margin, 
          footerY
        );
        
        // Texte à droite
        const today = new Date().toLocaleDateString('fr-FR');
        doc!.text(
          `Édité le ${today}`, 
          pageWidth - margin, 
          footerY, 
          { align: "right" }
        );
      } catch (error) {
        console.error("Erreur lors de l'ajout du pied de page:", error);
      }
    };

    // Fonction pour ajouter une image à partir d'une URL
    const addImageFromUrl = async (url: string, x: number, y: number, width: number, height: number): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        try {
          // Si c'est une image en base64
          if (url.startsWith('data:')) {
            try {
              doc!.addImage(url, x, y, width, height);
              resolve();
            } catch (error) {
              console.error("Erreur lors de l'ajout de l'image base64:", error);
              reject(error);
            }
            return;
          }
          
          // Ajouter un timestamp pour éviter les problèmes de cache
          const urlWithTimestamp = url.includes('?') ? 
            `${url}&t=${new Date().getTime()}` : 
            `${url}?t=${new Date().getTime()}`;
          
          // Créer un élément image temporaire
          const img = new Image();
          
          // Gestion de l'événement de chargement
          img.onload = function() {
            try {
              // Normaliser la taille de l'image avec un canvas pour éviter les problèmes de mémoire
              const canvas = document.createElement('canvas');
              const maxDimension = 1200; // Taille maximale pour éviter les problèmes de mémoire
              
              // Ajuster la taille du canvas en fonction de l'image
              let canvasWidth = img.width;
              let canvasHeight = img.height;
              
              // Redimensionner si l'image est trop grande
              if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
                if (canvasWidth > canvasHeight) {
                  canvasHeight = (canvasHeight / canvasWidth) * maxDimension;
                  canvasWidth = maxDimension;
                } else {
                  canvasWidth = (canvasWidth / canvasHeight) * maxDimension;
                  canvasHeight = maxDimension;
                }
              }
              
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;
              
              // Dessiner l'image sur le canvas
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                
                // Ajuster la qualité pour les grandes images
                let quality = 0.95;
                if (canvasWidth * canvasHeight > 1000000) { // > 1 megapixel
                  quality = 0.8; // Réduire la qualité pour les grandes images
                }
                
                // Convertir le canvas en base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Ajouter l'image au PDF
                doc!.addImage(dataUrl, x, y, width, height);
                resolve();
              } else {
                reject(new Error("Impossible de créer le contexte 2D du canvas"));
              }
            } catch (error) {
              console.error("Erreur lors de la conversion canvas:", error);
              reject(error);
            }
          };
          
          // Gestion des erreurs
          img.onerror = function() {
            console.error("Erreur de chargement de l'image:", urlWithTimestamp);
            reject(new Error(`Failed to load image: ${urlWithTimestamp}`));
          };
          
          // Définir un timeout pour le chargement de l'image
          const timeout = setTimeout(() => {
            img.src = ""; // Arrêter le chargement
            reject(new Error(`Image loading timeout: ${urlWithTimestamp}`));
          }, 5000); // 5 secondes de timeout
          
          // Démarrer le chargement
          img.src = urlWithTimestamp;
          
          // Nettoyer le timeout si l'image est chargée ou en erreur
          img.onload = function() {
            clearTimeout(timeout);
            try {
              doc!.addImage(img, x, y, width, height);
              resolve();
            } catch (error) {
              console.error("Erreur lors de l'ajout de l'image:", error);
              reject(error);
            }
          };
          
          img.onerror = function() {
            clearTimeout(timeout);
            console.error("Erreur de chargement de l'image:", urlWithTimestamp);
            reject(new Error(`Failed to load image: ${urlWithTimestamp}`));
          };
        } catch (error) {
          console.error("Erreur globale lors de l'ajout de l'image:", error);
          reject(error);
        }
      });
    };

    // Fonction pour ajouter une section avec titre
    const addSectionTitle = async (title: string): Promise<void> => {
      // Vérifier s'il y a assez d'espace
      await checkNewPage(15);
      
      // Ligne de titre avec fond rouge
      doc!.setDrawColor(primaryColor);
      doc!.setFillColor(primaryColor);
      doc!.rect(margin, yPos, contentWidth, 8, 'F');
      
      // Texte du titre
      doc!.setTextColor(255, 255, 255); // Blanc
      doc!.setFontSize(11);
      doc!.setFont("helvetica", "bold");
      doc!.text(title, margin + 5, yPos + 5.5);
      
      // Mettre à jour la position Y
      yPos += 15;
      
      // Réinitialiser les paramètres de texte
      doc!.setTextColor(secondaryColor);
      doc!.setFontSize(10);
      doc!.setFont("helvetica", "normal");
    };

    // Fonction pour ajouter un cadre avec un titre
    const addFramedSection = async (title: string, contentCallback: () => Promise<void>) => {
      // Vérifier s'il y a assez d'espace, sinon ajouter une nouvelle page
      if (await checkNewPage(20)) {
        // Si on a ajouté une nouvelle page, yPos est déjà mis à jour
      }
      
      const startY = yPos;
      
      // Titre du cadre avec fond rouge
      doc!.setFillColor(primaryColor);
      doc!.rect(margin, yPos, contentWidth, 10, 'F');
      
      doc!.setTextColor("white");
      doc!.setFontSize(10);
      doc!.setFont("helvetica", "bold");
      doc!.text(title, margin + 5, yPos + 6.5);
      
      yPos += 15;
      
      // Position avant le contenu
      const beforeContentY = yPos;
      
      // Ajouter le contenu
      await contentCallback();
      
      // Calculer la hauteur du cadre
      const frameHeight = yPos - beforeContentY + 5;
      
      // Dessiner le cadre autour du contenu
      doc!.setDrawColor(lightGray);
      doc!.setLineWidth(0.3);
      doc!.rect(margin, startY, contentWidth, frameHeight + 10);
      
      yPos += 10; // Espace après la section
    };

    // Fonction pour ajouter une case à cocher
    const addCheckbox = async (label: string, checked: boolean = false, xPosition: number = margin) => {
      const boxSize = 4;
      
      // Dessiner la case
      doc!.setDrawColor(0);
      doc!.setLineWidth(0.2);
      doc!.rect(xPosition, yPos - 3, boxSize, boxSize);
      
      // Si cochée, ajouter un X
      if (checked) {
        doc!.setFont("helvetica", "bold");
        doc!.text("✓", xPosition + 1, yPos - 0.5);
      }
      
      // Ajouter le libellé
      doc!.setFont("helvetica", "normal");
      doc!.text(label, xPosition + boxSize + 3, yPos);
      
      return boxSize + 3 + doc!.getTextWidth(label);
    };

    // Fonction pour créer une nouvelle page
    const addNewPage = async () => {
      // Vérifier si la page précédente avait du contenu
      if (currentPage > 0) {
        addFooter(); // Ajouter le pied de page à la page actuelle
      }
      
      doc!.addPage(); // Ajouter une nouvelle page
      currentPage++; // Incrémenter le compteur de pages
      
      await addHeader(currentPage); // Ajouter l'en-tête sur la nouvelle page
    };

    // Fonction pour ajouter les informations générales
    const addInformationsGenerales = async () => {
      if (!data) return;
      
      // En-tête avec case à cocher pour type d'état des lieux
      doc!.setFontSize(10);
      doc!.setFont("helvetica", "bold");
      doc!.setTextColor(0);
      
      let xOffset = await addCheckbox(
        "d'entrée", 
        data.typeEtatDesLieux === "entree" || data.typeEtat === "entree"
      );
      xOffset += 5;
      
      let xPos = margin + xOffset;
      await addCheckbox(
        "de sortie", 
        data.typeEtatDesLieux === "sortie" || data.typeEtat === "sortie",
        xPos
      );
      
      doc!.setFont("helvetica", "normal");
      doc!.text(`fait le ${formatDate(data.dateEtatDesLieux)}`, margin + 100, yPos);
      
      yPos += 15;
      
      // Section Identification du bien
      await addSectionTitle("INFORMATIONS GÉNÉRALES");
      
      // Type de bien avec cases à cocher
      xOffset = await addCheckbox(
        "Bureau", 
        Array.isArray(data.typeBien) 
          ? data.typeBien.includes("bureau") 
          : data.typeBien === "bureau" || data.informations?.typeBien === "bureau"
      );
      xOffset += 5;
      
      xPos = margin + xOffset;
      xOffset += await addCheckbox(
        "Commerce", 
        Array.isArray(data.typeBien) 
          ? data.typeBien.includes("local-commercial") 
          : data.typeBien === "commerce" || data.typeBien === "local-commercial" || data.informations?.typeBien === "commerce",
        xPos
      );
      xOffset += 5;
      
      xPos = margin + xOffset;
      xOffset += await addCheckbox(
        "Local d'activité", 
        Array.isArray(data.typeBien) 
          ? data.typeBien.includes("local-activite") 
          : data.typeBien === "local-activite" || data.informations?.typeBien === "local-activite",
        xPos
      );
      xOffset += 5;
      
      xPos = margin + xOffset;
      await addCheckbox(
        "Autre", 
        Array.isArray(data.typeBien) 
          ? data.typeBien.includes("autre") 
          : data.typeBien === "autre" || data.informations?.typeBien === "autre",
        xPos
      );
      
      yPos += 15;
      
      // Adresse
      doc!.setFont("helvetica", "bold");
      doc!.text("Adresse des locaux :", margin, yPos);
      doc!.setFont("helvetica", "normal");
      if (data.adresse) {
        if (typeof data.adresse === 'string') {
          doc!.text(data.adresse, margin + 50, yPos);
        } else {
          // Format d'adresse complexe
          const adresseComplete = [
            data.adresse.rue,
            `${data.adresse.codePostal || ''} ${data.adresse.ville || ''}`
          ].filter(Boolean).join(', ');
          doc!.text(adresseComplete, margin + 50, yPos);
        }
      } else if (data.informations?.adresse) {
        doc!.text(data.informations.adresse, margin + 50, yPos);
      }
      
      yPos += 10;
      
      // Nombre de pièces
      doc!.setFont("helvetica", "bold");
      doc!.text("Nombre de pièces :", margin, yPos);
      doc!.setFont("helvetica", "normal");
      doc!.text(
        data.nombrePieces?.toString() || 
        data.informations?.nombrePieces?.toString() || 
        "",
        margin + 50, 
        yPos
      );
      
      yPos += 10;
      
      // Date d'entrée
      doc!.setFont("helvetica", "bold");
      doc!.text("Date d'entrée :", margin, yPos);
      doc!.setFont("helvetica", "normal");
      doc!.text(
        formatDate(data.dateEntree || data.informations?.dateEntree), 
        margin + 50, 
        yPos
      );
      
      // Forcer une nouvelle page pour les parties concernées
      // Cela garantit que la section commence toujours sur une nouvelle page
      await checkNewPage(0, true);
      
      // Section Parties concernées
      await addSectionTitle("PARTIES CONCERNÉES");
      
      // Propriétaire
      await addFramedSection("Propriétaire", async () => {
        // Nom
        doc!.setFont("helvetica", "bold");
        doc!.text("Propriétaire :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.proprietaire?.nom || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Adresse
        doc!.setFont("helvetica", "bold");
        doc!.text("Adresse :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.proprietaire?.adresse || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Téléphone
        doc!.setFont("helvetica", "bold");
        doc!.text("Téléphone :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.proprietaire?.telephone || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Email
        doc!.setFont("helvetica", "bold");
        doc!.text("Email :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.proprietaire?.email || "", margin + 50, yPos);
      });
      
      // Locataire
      await addFramedSection("Locataire(s)", async () => {
        // Nom
        doc!.setFont("helvetica", "bold");
        doc!.text("Locataire(s) :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.locataire?.nom || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Adresse
        doc!.setFont("helvetica", "bold");
        doc!.text("Adresse :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.locataire?.adresse || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Téléphone
        doc!.setFont("helvetica", "bold");
        doc!.text("Téléphone :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.locataire?.telephone || "", margin + 50, yPos);
        
        yPos += 10;
        
        // Email
        doc!.setFont("helvetica", "bold");
        doc!.text("Email :", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.locataire?.email || "", margin + 50, yPos);
      });
    };

    // Mise à jour des appels de tableaux dans la section "Relevés de compteurs"
    const addReleveCompteurs = async () => {
      if (!data.releveCompteurs || Object.keys(data.releveCompteurs).length === 0) return;
      
      // Forcer une nouvelle page pour les compteurs
      await checkNewPage(0, true);
      
      await addSectionTitle("1 - RELEVÉS DES COMPTEURS");
      
      // Pour chaque type de compteur
      for (const [key, compteurData] of Object.entries(data.releveCompteurs)) {
        if (!compteurData) continue;
        
        // S'assurer que compteurData est traité comme un objet de type Compteur
        const compteur = compteurData as Compteur;
        
        // Vérifier s'il reste assez d'espace pour ce compteur
        // Si moins de 40mm restant, créer une nouvelle page
        if (pageHeight - margin - yPos < 40) {
          await checkNewPage(0, true);
        }
        
        // Titre du compteur
        await addFramedSection(convertirCleEnLibelle(key), async () => {
          // Case à cocher pour indiquer si le compteur a été relevé
          const estReleve = compteur.releve === true || compteur.estReleve === true;
          await addCheckbox("Compteur relevé", estReleve);
          
          yPos += 8; // Réduit de 10 à 8
          
          // Numéro du compteur
          doc!.setFont("helvetica", "bold");
          doc!.text("Numéro du compteur:", margin, yPos);
          doc!.setFont("helvetica", "normal");
          doc!.text(compteur.numero || "", margin + 60, yPos);
          
          yPos += 8; // Réduit de 10 à 8
          
          // Relevé
          doc!.setFont("helvetica", "bold");
          doc!.text("Relevé:", margin, yPos);
          doc!.setFont("helvetica", "normal");
          // S'assurer que la valeur est une chaîne
          const valeurReleve = compteur.valeur ? compteur.valeur.toString() : 
                              (compteur.releve && typeof compteur.releve === 'string' ? compteur.releve : "");
          doc!.text(valeurReleve, margin + 60, yPos);
          
          yPos += 8; // Réduit de 10 à 8
          
          // Date du relevé
          doc!.setFont("helvetica", "bold");
          doc!.text("Date:", margin, yPos);
          doc!.setFont("helvetica", "normal");
          doc!.text(formatDate(compteur.date) || "", margin + 60, yPos);
          
          yPos += 8; // Réduit de 10 à 8
          
          // Puissance (uniquement pour l'électricité)
          if (key === 'electricite') {
            doc!.setFont("helvetica", "bold");
            doc!.text("Puissance:", margin, yPos);
            doc!.setFont("helvetica", "normal");
            doc!.text(compteur.puissance || "", margin + 60, yPos);
            
            yPos += 8; // Réduit de 10 à 8
          }
          
          // Localisation
          doc!.setFont("helvetica", "bold");
          doc!.text("Localisation:", margin, yPos);
          doc!.setFont("helvetica", "normal");
          doc!.text(compteur.localisation || "", margin + 60, yPos);
        });
      }
    };
    
    // Mise à jour des appels de tableaux dans la section "Clés remises"
    const addClesRemises = async () => {
      if (!data.cles) return;
      
      // Vérifier s'il reste assez d'espace pour cette section
      if (pageHeight - margin - yPos < 60) {
        await checkNewPage(0, true);
      }
      
      await addSectionTitle("CLÉS REMISES");
      
      await addFramedSection("Type", async () => {
        // Nombre de clés
        doc!.setFont("helvetica", "bold");
        doc!.text("Nombre de clés", margin, yPos);
        doc!.setFont("helvetica", "normal");
        doc!.text(data.cles.nombre?.toString() || "0", contentWidth - margin, yPos, { align: 'right' });
        
        yPos += 10;
        
        // Entrée immeuble
        doc!.setFont("helvetica", "bold");
        doc!.text("Entrée immeuble", margin, yPos);
        doc!.setFont("helvetica", "normal");
        
        yPos += 10;
        
        // Boîte aux lettres
        doc!.setFont("helvetica", "bold");
        doc!.text("Boîte aux lettres", margin, yPos);
        doc!.setFont("helvetica", "normal");
      });
    };

    // Mise à jour pour une mise en page améliorée des pièces
    const addEtatLieuxPieces = async () => {
      if (!Array.isArray(data.pieces) || data.pieces.length === 0) return;
      
      // Force une nouvelle page pour la section des pièces
      await checkNewPage(0, true);
      
      await addSectionTitle("4 - ÉTAT DES LIEUX PIÈCE PAR PIÈCE");
      
      for (const piece of data.pieces) {
        if (!piece) continue;
        
        // Titre de la pièce avec un fond coloré
        await addFramedSection(piece.nom || "Pièce sans nom", async () => {
          // Création du tableau d'éléments
          const headers = ["Élément", "État", "Commentaire"];
          const rows: string[][] = [];
          
          if (piece.etat && typeof piece.etat === 'object') {
            const commentaires = piece.commentaires || {};
            
            for (const [key, value] of Object.entries(piece.etat)) {
              rows.push([
                key || "",
                value ? String(value) : "",
                commentaires[key] || ""
              ]);
            }
          }
          
          // Ajouter le tableau des éléments de la pièce
          if (rows.length > 0) {
            // Largeurs des colonnes
            const colWidths = [
              contentWidth * 0.25, // Élément
              contentWidth * 0.25, // État
              contentWidth * 0.5   // Commentaire
            ];
            
            await addTable(headers, rows, colWidths);
          } else {
            await addText("Aucun élément enregistré pour cette pièce.", 10, false, true);
          }
          
          // Ajouter les photos si disponibles
          if (piece.photos && piece.photos.length > 0) {
            await addSpace(10);
            await addPhotos(piece.photos);
          }
        });
        
        await addSpace(5);
      }
    };

    // Fonction pour ajouter la section des signatures
    const addSignatures = async () => {
      yPos += 20; // Espace avant les signatures
      
      // Vérifier s'il y a assez d'espace sur la page actuelle, sinon ajouter une nouvelle page
      if (yPos > pageHeight - 120) {
        await addNewPage();
      }
      
      // Ligne de titre pour les signatures
      doc!.setDrawColor(primaryColor);
      doc!.setFillColor(primaryColor);
      doc!.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
      
      doc!.setTextColor(255, 255, 255); // Texte blanc
      doc!.setFontSize(12);
      doc!.setFont("helvetica", "bold");
      doc!.text("SIGNATURES", margin + 5, yPos + 6);
      
      yPos += 15;
      
      // Diviser l'espace pour les signatures du propriétaire et du locataire
      const colWidth = (pageWidth - margin * 2) / 2 - 5;
      
      // Signature du propriétaire
      doc!.setDrawColor(primaryColor);
      doc!.setLineWidth(0.5);
      doc!.rect(margin, yPos, colWidth, 80);
      
      doc!.setTextColor(primaryColor);
      doc!.setFontSize(11);
      doc!.text("LE PROPRIÉTAIRE OU SON MANDATAIRE", margin + colWidth / 2, yPos + 10, { align: "center" });
      doc!.setFontSize(10);
      doc!.setFont("helvetica", "normal");
      doc!.text("(signature et cachet)", margin + colWidth / 2, yPos + 20, { align: "center" });
      
      // Signature du locataire
      doc!.setDrawColor(primaryColor);
      doc!.rect(margin + colWidth + 10, yPos, colWidth, 80);
      
      doc!.setTextColor(primaryColor);
      doc!.setFontSize(11);
      doc!.setFont("helvetica", "bold");
      doc!.text("LE LOCATAIRE", margin + colWidth + 10 + colWidth / 2, yPos + 10, { align: "center" });
      doc!.setFontSize(10);
      doc!.setFont("helvetica", "normal");
      doc!.text("(signature)", margin + colWidth + 10 + colWidth / 2, yPos + 20, { align: "center" });
      
      yPos += 90; // Espace après les signatures
    };

    // Fonction pour ajouter une table
    const addTable = async (headers: string[], data: any[][], widths?: number[], alternateRowColors = true) => {
      // Si aucune donnée, ne rien faire
      if (!data || data.length === 0) return;
      
      // Calculer les largeurs des colonnes si non spécifiées
      const colWidths = widths || Array(headers.length).fill(contentWidth / headers.length);
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
      
      // Vérifier s'il y a assez d'espace pour le tableau (titre + 1 ligne par donnée)
      const tableHeight = 8 * (data.length + 1) + 10;
      if (await checkNewPage(tableHeight)) {
        // Si on a ajouté une nouvelle page, yPos est déjà mis à jour
      }
      
      // En-tête de la table avec couleur de fond
      let currentX = margin;
      doc!.setFillColor(primaryColor);
      doc!.setTextColor('white');
      doc!.setFontSize(9);
      doc!.setFont('helvetica', 'bold');
      
      for (let i = 0; i < headers.length; i++) {
        // Rectangle coloré pour l'en-tête
        doc!.rect(currentX, yPos, colWidths[i], 8, 'F');
        
        // Texte de l'en-tête
        doc!.text(
          headers[i],
          currentX + colWidths[i] / 2,
          yPos + 5,
          { align: 'center' }
        );
        
        currentX += colWidths[i];
      }
      
      yPos += 8;
      
      // Lignes de données
      doc!.setTextColor(secondaryColor);
      doc!.setFont('helvetica', 'normal');
      
      for (let i = 0; i < data.length; i++) {
        currentX = margin;
        
        // Alternance de couleur pour les lignes (comme dans l'aperçu)
        if (alternateRowColors && i % 2 === 1) {
          doc!.setFillColor(245, 245, 245); // Gris très clair
          doc!.rect(margin, yPos, tableWidth, 8, 'F');
        }
        
        for (let j = 0; j < data[i].length; j++) {
          let cellContent = String(data[i][j] || '');
          
          // Gérer les valeurs booléennes avec des coches et des croix
          if (cellContent === 'true') {
            cellContent = '✓';
            doc!.setTextColor('#22c55e'); // Vert pour les coches, comme dans l'aperçu
          } else if (cellContent === 'false') {
            cellContent = '✗';
            doc!.setTextColor('#ef4444'); // Rouge pour les croix, comme dans l'aperçu
          } else {
            doc!.setTextColor(secondaryColor);
          }
          
          doc!.text(
            cellContent,
            currentX + colWidths[j] / 2,
            yPos + 5,
            { align: 'center' }
          );
          
          currentX += colWidths[j];
        }
        
        // Réinitialiser la couleur du texte
        doc!.setTextColor(secondaryColor);
        
        // Dessiner un trait fin en bas de chaque ligne
        doc!.setDrawColor(220, 220, 220);
        doc!.setLineWidth(0.1);
        doc!.line(margin, yPos + 8, margin + tableWidth, yPos + 8);
        
        yPos += 8;
      }
      
      // Bordure du tableau
      doc!.setDrawColor(lightGray);
      doc!.setLineWidth(0.3);
      doc!.rect(margin, yPos - data.length * 8 - 8, tableWidth, (data.length + 1) * 8);
      
      yPos += 5; // Espace après le tableau
    };

    // Fonction pour ajouter du texte
    const addText = async (text: string, fontSize: number = 10, isBold: boolean = false, isCenter: boolean = false, color: string = secondaryColor) => {
      if (!text) text = "";
      
      // Vérifier si on a besoin d'une nouvelle page
      await checkNewPage(fontSize + 4);
      
      doc!.setFontSize(fontSize);
      doc!.setFont("helvetica", isBold ? "bold" : "normal");
      doc!.setTextColor(color);
      
      // Calculer la largeur maximale disponible
      const maxWidth = contentWidth - (isCenter ? 0 : 4);
      
      // Tronquer le texte s'il est trop long
      const safeText = truncateText(text, maxWidth, fontSize);
      
      const xPos = isCenter ? pageWidth / 2 : margin;
      const align = isCenter ? 'center' : 'left';
      
      doc!.text(safeText, xPos, yPos, { align });
      yPos += fontSize / 2 + 2.5;
    };

    // Fonction pour ajouter un espace
    const addSpace = async (space: number = 5) => {
      await checkNewPage(space);
      yPos += space;
    };

    // Fonction pour ajouter des photos
    const addPhotos = async (photos: any[]) => {
      if (!photos || photos.length === 0) return;
      
      // Titre pour les photos
      doc!.setFontSize(11);
      doc!.setFont("helvetica", "bold");
      doc!.setTextColor(primaryColor);
      const photoCount = Math.min(photos.length, 4); // Limiter à 4 photos maximum
      doc!.text(`PHOTOS DE LA PIÈCE (${photoCount} disponible${photoCount > 1 ? 's' : ''})`, margin, yPos + 5);
      yPos += 10;
      
      // Configurer la grille de photos
      const photosPerRow = 2;
      const photoWidth = (contentWidth / photosPerRow) - 5;
      const photoHeight = photoWidth * 0.75; // Ratio 4:3
      
      // Calculer le nombre de lignes nécessaires
      const rowCount = Math.ceil(Math.min(photos.length, 4) / photosPerRow);
      const totalHeight = rowCount * (photoHeight + 5);
      
      // Vérifier si on a besoin d'une nouvelle page
      await checkNewPage(totalHeight + 15);
      
      let currentX = margin;
      let currentY = yPos;
      let count = 0;
      
      // Fonction améliorée pour extraire les données d'image
      const extractImageData = async (photo: any): Promise<string | null> => {
        try {
          // Cas 1: Photo est une chaîne (URL ou base64)
          if (typeof photo === 'string') {
            // Si c'est une base64, on la retourne directement
            if (photo.startsWith('data:')) {
              return photo;
            }
            
            // Si c'est une URL, on essaie de la charger via XHR
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.onload = function() {
                const reader = new FileReader();
                reader.onloadend = function() {
                  resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(xhr.response);
              };
              xhr.onerror = reject;
              xhr.open('GET', photo);
              xhr.responseType = 'blob';
              xhr.send();
            });
          }
          
          // Cas 2: Photo est un File ou Blob
          if (photo instanceof File || photo instanceof Blob) {
            return fileToBase64(photo);
          }
          
          // Cas 3: Photo est un objet avec des propriétés d'image
          if (photo && typeof photo === 'object') {
            // Vérifier toutes les propriétés possibles
            const propertiesToCheck = ['url', 'src', 'data', 'base64', 'path', 'preview'];
            
            for (const prop of propertiesToCheck) {
              if (photo[prop]) {
                // Si c'est une URL ou un path
                if (typeof photo[prop] === 'string') {
                  if (photo[prop].startsWith('data:')) {
                    return photo[prop];
                  } else if (photo[prop].startsWith('http') || photo[prop].startsWith('blob:')) {
                    // Charger l'URL
                    return new Promise((resolve, reject) => {
                      const img = new Image();
                      img.crossOrigin = 'Anonymous';
                      img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(img, 0, 0);
                          resolve(canvas.toDataURL('image/jpeg'));
                        } else {
                          reject(new Error('Impossible de créer le contexte canvas'));
                        }
                      };
                      img.onerror = function() {
                        reject(new Error(`Impossible de charger l'image: ${photo[prop]}`));
                      };
                      img.src = photo[prop];
                    });
                  }
                }
                
                // Si base64 sans préfixe
                if (prop === 'base64' && typeof photo[prop] === 'string') {
                  return `data:image/jpeg;base64,${photo[prop]}`;
                }
              }
            }
            
            // Vérifier si c'est un objet File caché dans une propriété
            for (const key in photo) {
              if (photo[key] instanceof File || photo[key] instanceof Blob) {
                return fileToBase64(photo[key]);
              }
            }
          }
          
          console.warn("Format d'image non reconnu:", photo);
          return null;
        } catch (error) {
          console.error("Erreur lors de l'extraction des données d'image:", error);
          return null;
        }
      };
      
      // Afficher seulement les 4 premières photos
      for (const photo of photos.slice(0, 4)) {
        // Vérifier si on commence une nouvelle ligne
        if (count % photosPerRow === 0 && count > 0) {
          currentX = margin;
          currentY += photoHeight + 5;
          
          // Vérifier si on a besoin d'une nouvelle page
          if (await checkNewPage(photoHeight + 10)) {
            currentY = yPos;
          }
        }
        
        try {
          // Cadre pour la photo
          doc!.setDrawColor(lightGray);
          doc!.setLineWidth(0.3);
          doc!.rect(currentX, currentY, photoWidth, photoHeight);
          
          // Fond gris en attendant l'image
          doc!.setFillColor("#F5F5F5");
          doc!.rect(currentX, currentY, photoWidth, photoHeight, 'F');
          
          // Récupérer les données de l'image avec la nouvelle fonction
          const imageData = await extractImageData(photo);
          
          // Ajouter l'image si on a des données valides
          if (imageData) {
            try {
              doc!.addImage(
                imageData,
                "JPEG",
                currentX + 0.5,
                currentY + 0.5,
                photoWidth - 1,
                photoHeight - 1
              );
            } catch (imgError) {
              console.error("Erreur lors de l'ajout de l'image au PDF:", imgError);
              // Message d'erreur dans le cadre
              doc!.setFillColor("#FFDDDD");
              doc!.rect(currentX, currentY, photoWidth, photoHeight, 'F');
              doc!.setTextColor("#DC0032");
              doc!.setFontSize(8);
              doc!.text("Erreur d'image", currentX + photoWidth/2, currentY + photoHeight/2, { align: 'center' });
            }
          } else {
            // Aucune donnée d'image valide
            doc!.setFillColor("#FFDDDD");
            doc!.rect(currentX, currentY, photoWidth, photoHeight, 'F');
            doc!.setTextColor("#DC0032");
            doc!.setFontSize(8);
            doc!.text("Image non disponible", currentX + photoWidth/2, currentY + photoHeight/2, { align: 'center' });
          }
          
          // Étiquette pour le numéro de la photo
          doc!.setFillColor("#22c55e");
          doc!.rect(currentX + photoWidth - 10, currentY + photoHeight - 5, 8, 4, 'F');
          doc!.setTextColor("#FFFFFF");
          doc!.setFontSize(6);
          doc!.text(`#${count + 1}`, currentX + photoWidth - 6, currentY + photoHeight - 2.5, { align: 'center' });
          
          // Mise à jour des compteurs
          currentX += photoWidth + 5;
          count++;
          
        } catch (photoError) {
          console.error("Erreur lors du traitement de la photo:", photoError);
          currentX += photoWidth + 5;
          count++;
        }
      }
      
      // Ajouter un espace après les photos
      yPos = currentY + photoHeight + 10;
    };
    
    // Initialisation et génération du document
    try {
      currentPage = 1;
      await addHeader(currentPage);
      
      // Générer les sections du document
      await addInformationsGenerales();
      await addReleveCompteurs();
      await addClesRemises();
      await addEtatLieuxPieces();
      await addSignatures();
      
      // Ajouter le pied de page sur la dernière page
      addFooter();
      
      // Retourner le document au format blob
      return doc!.output("blob");
    } catch (error) {
      console.error("Erreur lors de la génération du document PDF:", error);
      
      // Tenter de créer un document d'erreur
      try {
        // Réinitialiser le document
        doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });
        
        // Informations d'erreur
        doc.setFontSize(14);
        doc.text("Erreur lors de la génération du document", 20, 20);
        
        doc.setFontSize(10);
        yPos = 30;
        doc.text(`Erreur: ${String(error)}`, 20, yPos);
        yPos += 10;
        
        // Informations de diagnostic
        doc.text("Informations de diagnostic:", 20, yPos);
        yPos += 5;
        
        if (data) {
          // Vérifier les données problématiques
          if (data.cles) {
            doc.text(`data.cles est de type: ${typeof data.cles}`, 20, yPos);
            yPos += 5;
          }
          
          if (data.pieces) {
            doc.text(`data.pieces est de type: ${typeof data.pieces}, longueur: ${Array.isArray(data.pieces) ? data.pieces.length : 'N/A'}`, 20, yPos);
            yPos += 5;
          }
        } else {
          doc.text("Aucune donnée reçue", 20, yPos);
        }
        
        // Ajouter des instructions pour l'utilisateur
        doc.setTextColor("#DC0032"); // Rouge Arthur Loyd
        doc.setFontSize(12);
        doc.text("Veuillez contacter le support technique avec les informations ci-dessus.", 20, yPos + 10);
        
        // Retour du document d'erreur
        return doc.output("blob");
      } catch (fallbackError) {
        console.error("Erreur lors de la création du PDF d'erreur:", fallbackError);
        // En cas d'échec total, renvoyer un blob vide avec un message d'erreur minimal
        return new Blob(["Erreur lors de la génération du PDF"], { type: "text/plain" });
      }
    }
  } catch (outerError) {
    console.error("Erreur initiale:", outerError);
    return new Blob(["Erreur lors de l'initialisation du PDF"], { type: "text/plain" });
  }
}

// Fonction pour convertir une image File ou Blob en base64
const fileToBase64 = async (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Fichier non fourni"));
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default generatePDFFromData;


