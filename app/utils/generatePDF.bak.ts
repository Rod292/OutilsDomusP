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

export async function generatePDFFromData(data: any, options: GeneratePDFOptions = {}): Promise<Blob> {
  console.log("Début de génération du PDF");
  
  try {
    // Vérifier que les données sont valides
    if (!data || typeof data !== 'object') {
      throw new Error("Données invalides pour la génération du PDF");
    }
    
    console.log("Données valides, initialisation du document PDF");
    
    // Créer un nouveau document PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4" // Format A4 explicitement défini
    });

    // Ajouter la police standard
    doc.setFont("helvetica");
    
    // Définition de la largeur de page disponible
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // Couleurs de la marque Arthur Loyd
    const primaryColor = "#DC0032"; // Rouge Arthur Loyd
    const secondaryColor = "#2D2D2D"; // Gris foncé
    const lightGray = "#EEEEEE"; // Gris clair pour les fonds
    
    // Position Y courante pour ajouter de nouveaux éléments
    let yPos = margin;
    let currentPage = 1;

    // Fonction pour tronquer les textes trop longs
    const truncateText = (text: string, maxWidth: number, fontSize: number): string => {
      if (!text || !doc) return "";
      
      const stringWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
      
      if (stringWidth <= maxWidth) return text;
      
      // Tronquer le texte pour qu'il rentre dans la largeur disponible
      let truncated = text;
      while (doc.getStringUnitWidth(truncated + "...") * fontSize / doc.internal.scaleFactor > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      
      return truncated + "...";
    };
    
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
    
    // Ajouter une image à partir d'une URL (promesse)
    const addImageFromUrl = async (url: string, x: number, y: number, width: number, height: number) => {
      if (!url || !doc) return;

      try {
        // Si c'est déjà une image base64
        if (url.startsWith('data:')) {
          try {
            doc.addImage(url, 'JPEG', x, y, width, height);
          } catch (imgError) {
            console.error(`Erreur lors de l'ajout de l'image base64:`, imgError);
          }
          return;
        }

        // Ajouter un timestamp pour éviter les problèmes de cache
        const urlWithTimestamp = url.includes('?') 
          ? `${url}&t=${Date.now()}` 
          : `${url}?t=${Date.now()}`;

        return new Promise<void>((resolve, reject) => {
          // Créer un timeout pour éviter les blocages
          const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout lors du chargement de l'image: ${url}`));
          }, 5000);
          
          // Créer un nouvel élément image pour charger l'URL
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          img.onload = () => {
            clearTimeout(timeoutId);
            
            try {
              // Normaliser l'image pour éviter les problèmes de mémoire
              const canvas = document.createElement('canvas');
              
              // Limiter la taille maximale pour éviter les problèmes de mémoire
              const MAX_SIZE = 1200;
              let w = img.width;
              let h = img.height;
              
              if (w > MAX_SIZE || h > MAX_SIZE) {
                if (w > h) {
                  h = (h / w) * MAX_SIZE;
                  w = MAX_SIZE;
                } else {
                  w = (w / h) * MAX_SIZE;
                  h = MAX_SIZE;
                }
              }
              
              canvas.width = w;
              canvas.height = h;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error("Impossible de créer le contexte canvas"));
                return;
              }
              
              ctx.drawImage(img, 0, 0, w, h);
              
              // Qualité ajustée en fonction de la taille
              const quality = Math.min(0.9, Math.max(0.5, 1000000 / (w * h)));
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              
              if (doc) {
                doc.addImage(dataUrl, 'JPEG', x, y, width, height);
              }
              
              resolve();
            } catch (error) {
              console.error("Erreur lors de l'ajout de l'image au PDF:", error);
              reject(error);
            }
          };
          
          img.onerror = (error) => {
            clearTimeout(timeoutId);
            console.error(`Erreur de chargement de l'image: ${url}`, error);
            reject(error);
          };
          
          // Charger l'image
          img.src = urlWithTimestamp;
        });
      } catch (error) {
        console.error(`Erreur générale lors du traitement de l'image: ${url}`, error);
      }
    };

    // Fonction pour ajouter l'en-tête du document
    const addHeader = async (pageNumber: number) => {
      if (!doc) return;
      
      yPos = margin;
      
      // Ligne de séparation en bas de l'en-tête
      const headerHeight = 15;
      
      try {
        // Ajouter le logo
        await addImageFromUrl(LOGO_URL, margin, yPos, 25, 10);
      } catch (error) {
        console.warn("Impossible d'ajouter le logo:", error);
      }
      
      // Titre "ÉTAT DES LIEUX"
      if (!doc) return; // Vérification après l'opération potentiellement asynchrone
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor);
      doc.setFontSize(14);
      doc.text("ÉTAT DES LIEUX", pageWidth - margin, yPos + 5, { align: "right" });
      
      // Sous-titre "ENTRÉE" ou "SORTIE"
      if (!doc) return; // Vérification après chaque bloc d'opérations
      doc.setFontSize(10);
      const typeEDL = data.typeEtatDesLieux === "entree" ? "ENTRÉE" : "SORTIE";
      doc.text(typeEDL, pageWidth - margin, yPos + 10, { align: "right" });
      
      // Ligne de séparation
      if (!doc) return; // Vérification après chaque bloc d'opérations
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos + headerHeight, pageWidth - margin, yPos + headerHeight);
      
      // Reset color
      if (!doc) return; // Vérification finale
      doc.setTextColor(secondaryColor);
      doc.setFont("helvetica", "normal");
      
      yPos += headerHeight + 5;
    };

    // Fonction pour ajouter le pied de page sur chaque page
    const addFooter = () => {
      const footerY = pageHeight - 10;
      
      // Ligne de séparation
      doc.setDrawColor(lightGray);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // Numéro de page
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor);
      doc.text(`Page ${currentPage}`, pageWidth / 2, footerY, { align: "center" });
      
      // Informations légales
      doc.setFontSize(7);
      doc.text("Arthur Loyd - État des lieux", margin, footerY);
      
      // Date d'édition
      const today = new Date().toLocaleDateString('fr-FR');
      doc.text(`Édité le ${today}`, pageWidth - margin, footerY, { align: "right" });
    };

    // Fonction pour créer une nouvelle page
    const addNewPage = async () => {
      addFooter(); // Ajouter le pied de page à la page actuelle
      doc.addPage(); // Ajouter une nouvelle page
      currentPage++; // Incrémenter le compteur de pages
      await addHeader(currentPage); // Ajouter l'en-tête sur la nouvelle page
    };

    // Fonction utilitaire pour vérifier s'il faut ajouter une nouvelle page
    const checkNewPage = async (spaceNeeded: number = 10) => {
      if (yPos + spaceNeeded > pageHeight - margin - 15) {
        await addNewPage();
        return true;
      }
      return false;
    };

    // Fonction utilitaire pour ajouter du texte
    const addText = async (text: string, fontSize: number = 10, isBold: boolean = false, isCenter: boolean = false, color: string = secondaryColor) => {
      if (!text) text = "";
      
      // Vérifier si on a besoin d'une nouvelle page
      await checkNewPage(fontSize + 4);
      
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color);
      
      // Calculer la largeur maximale disponible
      const maxWidth = contentWidth - (isCenter ? 0 : 4);
      
      // Tronquer le texte s'il est trop long
      const safeText = truncateText(text, maxWidth, fontSize);
      
      const xPos = isCenter ? pageWidth / 2 : margin;
      const align = isCenter ? 'center' : 'left';
      
      doc.text(safeText, xPos, yPos, { align });
      yPos += fontSize / 2 + 2.5;
    };

    // Fonction pour ajouter des titres de section avec un style amélioré
    const addSectionTitle = async (title: string) => {
      // Vérifier s'il y a assez d'espace, sinon ajouter une nouvelle page
      if (await checkNewPage(20)) {
        // Si on a ajouté une nouvelle page, yPos est déjà mis à jour
      }

      // Rectangle coloré en arrière-plan du titre (comme dans l'aperçu)
      doc.setFillColor(lightGray);
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      
      // Texte du titre
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text(title, margin + 2, yPos + 5.5);
      
      // Mise à jour de la position Y
      yPos += 12;
    };

    // Fonction utilitaire pour ajouter une case à cocher
    const addCheckbox = async (text: string = "", isChecked: boolean = false, x: number = margin) => {
      await checkNewPage(6);
      
      // Rectangle de la case à cocher
      doc.setDrawColor(secondaryColor);
      doc.setFillColor(isChecked ? primaryColor : "white");
      doc.rect(x, yPos - 3, 3, 3, isChecked ? 'F' : 'S');
      
      if (isChecked) {
        doc.setTextColor("white");
        doc.setFontSize(6);
        doc.text("✓", x + 0.5, yPos - 0.5);
      }
      
      // Texte à côté de la case
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      
      // Calculer la largeur maximale disponible
      const maxWidth = contentWidth - 8;
      const safeText = truncateText(text || "", maxWidth, 10);
      
      doc.text(safeText, x + 5, yPos);
    };

    // Fonction utilitaire pour ajouter un espace vertical
    const addSpace = async (space: number = 5) => {
      await checkNewPage(space);
      yPos += space;
    };

    // Fonction pour ajouter un cadre avec un titre
    const addFramedSection = async (title: string, contentCallback: () => Promise<void>) => {
      await checkNewPage(25); // Estimation minimale pour un cadre
      
      const startY = yPos;
      
      // Titre du cadre
      doc.setFillColor(primaryColor);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
      
      doc.setTextColor("white");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin + 5, yPos + 4.5);
      
      yPos += 10;
      
      // Exécuter le callback pour ajouter le contenu
      await contentCallback();
      
      // Déterminer la hauteur finale du cadre
      const frameHeight = yPos - startY + 3;
      
      // Dessiner le cadre autour du contenu
      doc.setDrawColor(lightGray);
      doc.setLineWidth(0.3);
      doc.rect(margin, startY, contentWidth, frameHeight);
      
      yPos += 6; // Augmenté pour éviter le chevauchement
    };

    // Fonction pour ajouter un tableau simple
    const addSimpleTable = async (headers: string[], rows: string[][]) => {
      // Estimation de l'espace nécessaire
      const rowHeight = 7;
      const tableHeight = (rows.length + 1) * rowHeight;
      
      await checkNewPage(tableHeight + 5);
      
      // Largeurs des colonnes (ajustées pour un meilleur affichage)
      const colCount = headers.length;
      let colWidths: number[] = [];
      
      // Distribution proportionnelle selon le contenu typique
      if (colCount === 3) {
        // Pour un tableau à 3 colonnes (Element, État, Commentaire)
        colWidths = [0.3 * contentWidth, 0.2 * contentWidth, 0.5 * contentWidth];
      } else {
        // Distribution uniforme par défaut
        colWidths = Array(colCount).fill(contentWidth / colCount);
      }
      
      // En-têtes du tableau
      doc.setFillColor(lightGray);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor);
      
      let xOffset = margin;
      for (let i = 0; i < headers.length; i++) {
        // Tronquer le texte d'en-tête si nécessaire
        const headerText = truncateText(headers[i], colWidths[i] - 4, 8);
        doc.text(headerText, xOffset + 2, yPos + 4.5);
        xOffset += colWidths[i];
      }
      
      yPos += rowHeight;
      
      // Lignes du tableau
      doc.setFont("helvetica", "normal");
      
      let rowColor = false; // Pour alterner les couleurs des lignes
      for (const row of rows) {
        // Fond alterné pour les lignes
        if (rowColor) {
          doc.setFillColor("#F9F9F9");
          doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
        }
        rowColor = !rowColor;
        
        // Texte de la ligne
        xOffset = margin;
        for (let i = 0; i < row.length; i++) {
          // Tronquer le texte de cellule si nécessaire
          const cellText = truncateText(row[i] || "", colWidths[i] - 4, 8);
          doc.text(cellText, xOffset + 2, yPos + 4.5);
          xOffset += colWidths[i];
        }
        
        yPos += rowHeight;
      }
      
      // Bordure du tableau
      doc.setDrawColor(lightGray);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos - rows.length * rowHeight - rowHeight, contentWidth, (rows.length + 1) * rowHeight);
      
      yPos += 5;
    };

    // Fonction pour ajouter des photos
    const addPhotos = async (photos: any[]) => {
      if (!photos || photos.length === 0) return;
      
      // Nombre de photos par ligne
      const photosPerRow = 2;
      const photoWidth = (contentWidth / photosPerRow) - 5;
      const photoHeight = photoWidth * 0.75; // Ratio 4:3
      
      // Calculer le nombre de lignes nécessaires
      const rowCount = Math.ceil(photos.length / photosPerRow);
      const totalHeight = rowCount * (photoHeight + 15); // Augmenté pour éviter le chevauchement
      
      // Vérifier si on a besoin d'une nouvelle page
      if (await checkNewPage(totalHeight)) {
        // Si une nouvelle page a été ajoutée, on revient ici
        await addText("PHOTOS DE LA PIÈCE", 11, true, false, primaryColor);
      } else {
        // On ajoute un titre pour les photos
        await addText("PHOTOS DE LA PIÈCE", 11, true, false, primaryColor);
      }
      
      let currentX = margin;
      let currentY = yPos;
      let count = 0;
      
      for (const photo of photos) {
        // Vérifier si on commence une nouvelle ligne
        if (count % photosPerRow === 0 && count > 0) {
          currentX = margin;
          currentY += photoHeight + 15; // Augmenté pour éviter le chevauchement
          
          // Vérifier si on a besoin d'une nouvelle page
          if (await checkNewPage(photoHeight + 20)) {
            currentY = yPos;
          }
        }
        
        try {
          // Cadre pour la photo
          doc.setDrawColor(lightGray);
          doc.setLineWidth(0.3);
          doc.rect(currentX, currentY, photoWidth, photoHeight);
          
          // Préparation des données de l'image
          let imageData: string | null = null;
          
          // Déterminer le type de données d'image et le convertir si nécessaire
          if (typeof photo === 'string') {
            // C'est une URL ou déjà un base64
            imageData = photo;
            console.log("Photo (string):", typeof imageData === 'string' ? imageData.substring(0, 100) + "..." : "Non valide");
          } else if (photo instanceof File || photo instanceof Blob) {
            // Conversion de File/Blob en base64
            try {
              imageData = await fileToBase64(photo);
              console.log("Photo (File/Blob) convertie en base64");
            } catch (err) {
              console.error("Erreur lors de la conversion en base64:", err);
              throw err;
            }
          } else if (photo && typeof photo === 'object') {
            // Tester toutes les propriétés possibles qui pourraient contenir l'image
            if (photo.url) {
              imageData = photo.url;
              console.log("Photo (object.url):", typeof imageData === 'string' ? imageData.substring(0, 100) + "..." : "Non valide");
            } else if (photo.src) {
              imageData = photo.src;
              console.log("Photo (object.src):", typeof imageData === 'string' ? imageData.substring(0, 100) + "..." : "Non valide");
            } else if (photo.path) {
              imageData = photo.path;
              console.log("Photo (object.path):", typeof imageData === 'string' ? imageData.substring(0, 100) + "..." : "Non valide");
            } else if (photo.data) {
              imageData = photo.data;
              console.log("Photo (object.data) trouvée");
            } else if (photo.preview) {
              imageData = photo.preview;
              console.log("Photo (object.preview) trouvée");
            } else if (photo.base64) {
              imageData = `data:image/jpeg;base64,${photo.base64}`;
              console.log("Photo (object.base64) trouvée");
            } else {
              // Chercher toute propriété qui pourrait être une URL d'image
              const props = Object.keys(photo);
              for (const prop of props) {
                if (typeof photo[prop] === 'string' && 
                    (photo[prop].startsWith('http') || 
                     photo[prop].startsWith('blob:') || 
                     photo[prop].startsWith('data:'))) {
                  imageData = photo[prop];
                  console.log(`Photo trouvée dans la propriété ${prop}`);
                  break;
                }
              }
              
              if (!imageData) {
                console.log("Propriétés de l'objet photo:", props);
              }
            }
          }
          
          // Ajouter l'image si les données sont disponibles
          if (imageData) {
            await addImageFromUrl(imageData, currentX, currentY, photoWidth, photoHeight);
            
            // Ajouter un petit label de numéro de photo en bas à droite, comme dans l'aperçu
            doc.setFillColor('#22c55e'); // Vert équivalent à bg-green-500
            doc.rect(currentX + photoWidth - 7, currentY + photoHeight - 5, 7, 5, 'F');
            doc.setTextColor('white');
            doc.setFontSize(7);
            doc.text(`#${count+1}`, currentX + photoWidth - 3.5, currentY + photoHeight - 1.5, { align: 'center' });
          } else {
            throw new Error("Format d'image non reconnu");
          }
        } catch (error) {
          console.error("Erreur lors de l'ajout d'une photo:", error);
          
          // Afficher un message d'erreur à la place de la photo
          doc.setFillColor("#FFDDDD");
          doc.rect(currentX, currentY, photoWidth, photoHeight, 'F');
          
          doc.setTextColor(primaryColor);
          doc.setFontSize(8);
          doc.text("Impossible de charger l'image", currentX + photoWidth/2, currentY + photoHeight/2, { align: 'center' });
          
          // Log supplémentaire pour le débogage
          if (photo) {
            console.log("Type de photo problématique:", typeof photo);
            if (typeof photo === 'object') {
              console.log("Propriétés de l'objet photo:", Object.keys(photo));
              console.log("Contenu de l'objet photo:", JSON.stringify(photo).substring(0, 200));
            }
          }
        }
        
        // Mise à jour pour la photo suivante
        currentX += photoWidth + 5;
        count++;
      }
      
      // Mise à jour de la position Y après toutes les photos
      yPos = currentY + photoHeight + 15; // Augmenté pour éviter le chevauchement
    };

    // Remplacer la fonction addTableSimple par la fonction addTable améliorée
    const addTable = async (
      headers: string[],
      data: any[][],
      widths?: number[],
      alternateRowColors = true
    ) => {
      if (!headers || !data || headers.length === 0 || data.length === 0) return;
      
      if (await checkNewPage(10 + data.length * 10)) {
        // Si une nouvelle page a été ajoutée, on revient ici
      }
      
      const tableWidth = contentWidth;
      const totalColumns = headers.length;
      const colWidths = widths || new Array(totalColumns).fill(tableWidth / totalColumns);
      
      // En-tête de la table avec couleur de fond
      let currentX = margin;
      doc.setFillColor(primaryColor);
      doc.setTextColor('white');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      for (let i = 0; i < headers.length; i++) {
        // Rectangle coloré pour l'en-tête
        doc.rect(currentX, yPos, colWidths[i], 8, 'F');
        
        // Texte de l'en-tête
        doc.text(
          headers[i],
          currentX + colWidths[i] / 2,
          yPos + 5,
          { align: 'center' }
        );
        
        currentX += colWidths[i];
      }
      
      yPos += 8;
      
      // Lignes de données
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'normal');
      
      for (let i = 0; i < data.length; i++) {
        currentX = margin;
        
        // Vérifier si on a besoin d'une nouvelle page
        if (await checkNewPage(10)) {
          currentX = margin;
        }
        
        // Alternance de couleur pour les lignes (comme dans l'aperçu)
        if (alternateRowColors && i % 2 === 1) {
          doc.setFillColor(245, 245, 245); // Gris très clair
          doc.rect(margin, yPos, tableWidth, 8, 'F');
        }
        
        for (let j = 0; j < data[i].length; j++) {
          let cellContent = data[i][j]?.toString() || '';
          
          // Traitement spécial pour les cases à cocher
          if (cellContent === 'true') {
            cellContent = '✓';
            doc.setTextColor('#22c55e'); // Vert pour les coches, comme dans l'aperçu
          } else if (cellContent === 'false') {
            cellContent = '✗';
            doc.setTextColor('#ef4444'); // Rouge pour les croix, comme dans l'aperçu
          } else {
            doc.setTextColor(secondaryColor);
          }
          
          doc.text(
            cellContent,
            currentX + colWidths[j] / 2,
            yPos + 5,
            { align: 'center' }
          );
          
          currentX += colWidths[j];
        }
        
        // Réinitialiser la couleur du texte
        doc.setTextColor(secondaryColor);
        
        // Dessiner un trait fin en bas de chaque ligne
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.line(margin, yPos + 8, margin + tableWidth, yPos + 8);
        
        yPos += 8;
      }
      
      // Ajouter un peu d'espace après le tableau
      yPos += 5;
    };

    // Fonction utilitaire pour formater les dates
    const formatDate = (dateString?: string): string => {
      if (!dateString) return "";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
      } catch {
        return dateString;
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

    // Mise à jour des appels de tableaux dans la section "Informations générales"
    const addInformationsGenerales = async () => {
      await addSectionTitle("INFORMATIONS GÉNÉRALES");
      
      const infoGenerales = [
        ["Adresse", data.adresse || ""],
        ["Bailleur", data.bailleur || ""],
        ["Locataire", data.locataire || ""],
        ["Date d'entrée", formatDate(data.dateEntree) || ""],
        ["Durée du bail", data.dureeBail || ""]
      ];
      
      await addTable(["Information", "Valeur"], infoGenerales, [contentWidth * 0.3, contentWidth * 0.7]);
    };

    // Mise à jour des appels de tableaux dans la section "Relevés de compteurs"
    const addReleveCompteurs = async () => {
      if (!data.releveCompteurs || Object.keys(data.releveCompteurs).length === 0) return;
      
      await addSectionTitle("RELEVÉS DE COMPTEURS");
      
      const compteurs = Object.entries(data.releveCompteurs).map(([key, value]) => {
        // Conversion des clés techniques en libellés plus lisibles
        const label = convertirCleEnLibelle(key);
        return [label, value || "Non relevé"];
      });
      
      await addTable(["Compteur", "Relevé"], compteurs, [contentWidth * 0.7, contentWidth * 0.3]);
    };

    // Mise à jour des appels de tableaux dans la section "Eléments de chauffage"
    const addElementsChauffage = async () => {
      if (!data.elements || data.elements.chauffage?.length === 0) return;
      
      await addSectionTitle("ÉLÉMENTS DE CHAUFFAGE");
      
      // Créer les données formatées pour le tableau
      const chauffageData = data.elements.chauffage.map((item: any) => [
        item.nom || "",
        item.marque || "",
        item.etat?.entree || "",
        item.etat?.sortie || ""
      ]);
      
      await addTable(
        ["Élément", "Marque", "État entrée", "État sortie"],
        chauffageData,
        [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2]
      );
    };

    // Mise à jour des appels de tableaux dans la section "Clés remises"
    const addClesRemises = async () => {
      if (!data.cles) return;
      
      await addSectionTitle("CLÉS REMISES");
      
      // Créer un tableau de données à partir de l'objet cles
      const clesData = [
        ["Nombre de clés", data.cles.nombre?.toString() || "0", ""],
        ["Entrée immeuble", "", data.cles.entreeImmeuble || ""],
        ["Boîte aux lettres", "", data.cles.boiteAuxLettres || ""]
      ];
      
      await addTable(
        ["Type", "Nombre", "Description"],
        clesData,
        [contentWidth * 0.3, contentWidth * 0.2, contentWidth * 0.5]
      );
    };

    // Commencer le document
    await addHeader(currentPage);
    
    // ----- INFORMATIONS GÉNÉRALES -----
    await addInformationsGenerales();
    
    await addSpace(6); // Augmenté pour éviter le chevauchement
    
    await addFramedSection("Parties concernées", async () => {
      await addText(`Propriétaire : ${data.proprietaire?.nom || ""}`, 10, true);
      await addText(`Adresse : ${data.proprietaire?.adresse || ""}`, 10);
      await addSpace(6); // Augmenté pour éviter le chevauchement
      await addText(`Locataire(s) : ${data.locataire?.nom || ""}`, 10, true);
      await addText(`Adresse : ${data.locataire?.adresse || ""}`, 10);
    });
    
    // ----- RELEVÉS DES COMPTEURS -----
    await addReleveCompteurs();
    
    // ----- ÉLÉMENTS DE CHAUFFAGE -----
    await addElementsChauffage();
    
    // ----- REMISE DE CLÉS -----
    await addClesRemises();
    
    // ----- ÉTAT DES LIEUX PIÈCE PAR PIÈCE -----
    await addSectionTitle("4 - ÉTAT DES LIEUX PIÈCE PAR PIÈCE");
    
    if (Array.isArray(data.pieces)) {
      for (const piece of data.pieces) {
        if (!piece) continue;
        
        // Titre de la pièce avec un fond coloré
        await addSpace(6); // Augmenté pour éviter le chevauchement
        
        await addFramedSection(piece.nom || "Pièce sans nom", async () => {
          // Préparer les données pour le tableau
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
          
          // Ajouter le tableau des éléments
          if (rows.length > 0) {
            await addSimpleTable(["Élément", "État", "Commentaire"], rows);
          } else {
            await addText("Aucun élément enregistré pour cette pièce.", 10, false, true);
          }
          
          // Ajouter les photos si disponibles
          if (piece.photos && piece.photos.length > 0) {
            await addSpace(6); // Augmenté pour éviter le chevauchement
            await addPhotos(piece.photos);
          }
        });
      }
    }
    
    // ----- CONDITIONS GÉNÉRALES -----
    await addSectionTitle("CONDITIONS GÉNÉRALES");
    
    const conditionsText = "Le présent état des lieux établi contradictoirement entre les parties qui le reconnaissent exact, fait partie intégrante du contrat de location dont il ne peut être dissocié.";
    await addText(conditionsText, 10);
    await addSpace(10); // Augmenté pour éviter le chevauchement
    
    await addText(`Fait à Brest, le ${data.dateEtatDesLieux || ""}`, 10, true);
    await addSpace(15); // Augmenté pour éviter le chevauchement
    
    // ----- SIGNATURES -----
    await addFramedSection("SIGNATURES", async () => {
      // S'assurer que doc existe, même si TS l'a déjà vérifié plus haut
      if (!doc) return;
        
      // Diviser l'espace en deux colonnes
      const colWidth = contentWidth / 2 - 10;
      
      // Reset yPos pour s'assurer qu'il y a assez d'espace
      yPos += 5;
      
      // Colonne de gauche : Propriétaire
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Le propriétaire ou son représentant", margin + 5, yPos);
      
      yPos += 7;
      
      // Nom du propriétaire
      doc.setFont("helvetica", "normal");
      doc.text(data.proprietaire?.nom || "", margin + 5, yPos);
      
      yPos += 7;
      
      // Mention pour la signature
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Signature précédée de la mention « Certifié exact »", margin + 5, yPos);
      
      yPos += 7;
      
      // Rectangle pour la signature
      doc.rect(margin + 5, yPos, colWidth - 10, 20);
      
      // Position pour la colonne de droite
      const rightColX = margin + colWidth + 10;
      const rightColY = yPos - 14; // Même hauteur que la colonne de gauche
      
      // Colonne de droite : Locataire
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Le(s) locataire(s)", rightColX, rightColY);
      
      // Nom du locataire
      doc.setFont("helvetica", "normal");
      doc.text(data.locataire?.nom || "", rightColX, rightColY + 7);
      
      // Mention pour la signature
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Signature précédée de la mention « Certifié exact »", rightColX, rightColY + 14);
      
      // Rectangle pour la signature
      doc.rect(rightColX, rightColY + 21, colWidth - 10, 20);
    });
    
    // Ajouter le pied de page sur la dernière page
    addFooter();
    
    // Finir et retourner le PDF
    console.log("PDF généré avec succès");
    return doc.output("blob");
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    
    // En cas d'erreur, essayer de créer un PDF minimal avec un message d'erreur
    try {
      if (!doc) {
        // Si doc n'a pas été créé, en créer un nouveau
        doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });
      }
      
      // Ajouter un titre et un message d'erreur
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Erreur de génération du PDF", 20, 30);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`, 20, 50);
      doc.text("Veuillez réessayer ou contacter le support technique", 20, 60);
      
      return doc.output("blob");
    } catch (fallbackError) {
      console.error("Erreur lors de la création du PDF de secours:", fallbackError);
      throw new Error(`Erreur de génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Nettoyage des ressources si nécessaire
      doc = null;
    }
  }
}

export default generatePDFFromData;

