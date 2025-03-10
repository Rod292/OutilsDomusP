"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Camera, X, Plus, Save, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from 'next/image'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

// Image placeholder en cas d'erreur de chargement
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";

// Initialiser pdfMake avec les polices - solution robuste
try {
  // @ts-ignore - contourner les problèmes de type
  const vfs = pdfFonts.pdfMake?.vfs || (pdfFonts as any)?.vfs;
  if (vfs) {
    pdfMake.vfs = vfs;
  } else {
    console.warn('Impossible de trouver vfs dans pdfFonts, la génération de PDF pourrait ne pas fonctionner correctement');
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation de pdfMake:', error);
}

// Interface pour les props du formulaire
interface EtatDesLieuxFormProps {
  onRapportGenerated: (rapport: string, formData: any) => void
  initialData?: any
  onProgressUpdate?: (data: any) => void
  consultantName: string
  editMode?: boolean
}

// Options d'état pour évaluation des éléments
const etatOptions = ["Neuf", "Bon état", "Etat moyen", "Usagé", "Dégradé", "Hors service"]

// Fonction pour obtenir la date du jour au format YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Structure principale des données du formulaire
interface FormData {
  // Informations générales
  typeEtatDesLieux: "entree" | "sortie"
  dateEtatDesLieux: string
  dateEtat: string
  
  // Informations sur le bien
  typeBien: string[]
  adresseBien: string
  codePostalBien: string
  villeBien: string
  superficieBien?: string
  
  // Parties au contrat
  bailleur: {
    nom: string
    prenom: string
    adresse: string
    codePostal: string
    ville: string
    telephone: string
    email: string
  }
  locataire: {
    nom: string
    prenom: string
    telephone: string
    email: string
    adresse: string
    codePostal: string
    ville: string
  }
  
  // Mandataire (si présent)
  mandataire: {
    present: boolean
    nom: string
    adresse: string
    telephone: string
  }
  
  // Contrat
  contrat: {
    dateSignature: string
    dateEntree: string
    dateSortie: string
    dureeContrat: string
    montantLoyer: string
    montantCharges: string
    montantDepotGarantie: string
    typeActivite: string
  }
  
  // Eléments remis
  elements: {
    cles: {
      nombre: string
      detail: string
    }
    badges: {
      nombre: string
      detail: string
    }
    telecommandes: {
      nombre: string
      detail: string
    }
    documents: {
      diagnostics: boolean
      planLocaux: boolean
      reglementImmeuble: boolean
      noticeMaintenance: boolean
    }
    autresElements: string
  }
  
  // Relevés des compteurs
  compteurs: {
    eau: {
      presence: boolean
      numero: string
      releve: string
      localisation: string
      observations: string
      photos: Array<string | File>
    }
    electricite: {
      presence: boolean
      numero: string
      releve: string
      puissance: string
      localisation: string
      observations: string
      photos: Array<string | File>
    }
    gaz: {
      presence: boolean
      numero: string
      releve: string
      localisation: string
      observations: string
      photos: Array<string | File>
    }
  }
  
  // Configuration du logement
  pieces: Array<{
    id: string
    nom: string
    sols: {
      nature: string
      etat: string
      observations: string
    }
    murs: {
      nature: string
      etat: string
      observations: string
    }
    plafonds: {
      nature: string
      etat: string
      observations: string
    }
    plinthes: {
      nature: string
      etat: string
      observations: string
    }
    fenetres: {
      nature: string
      etat: string
      observations: string
    }
    portes: {
      nature: string
      etat: string
      observations: string
    }
    chauffage: {
      nature: string
      etat: string
      observations: string
    }
    prises: {
      nombre: string
      etat: string
      observations: string
    }
    interrupteurs: {
      nombre: string
      etat: string
      observations: string
    }
    equipements: Array<{
      id: string
      nom: string
      etat: string
      observations: string
    }>
    photos: Array<string | File>
    observations: string
    caracteristiques?: {
      sol?: string
      murs?: string
      plafond?: string
      menuiseries?: string
    }
  }>
  
  // Equipements extérieurs
  exterieur: {
    jardin: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
    terrasse: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
    balcon: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
    garage: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
    parking: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
    cave: {
      presence: boolean
      etat: string
      observations: string
      photos: Array<string | File>
    }
  }
  
  // Observations générales
  observationsGenerales: string
  
  // Signatures
  signatures: {
    bailleur: boolean
    locataire: boolean
    mandataire: boolean
  }
}

// Fonction pour créer une signature unique pour une image base64
const getImageSignature = (base64Image: string): string => {
  // Signature plus robuste basée sur parties de l'image
  const startPos = Math.min(100, Math.floor(base64Image.length / 4));
  const midPos = Math.floor(base64Image.length / 2);
  const endPos = Math.max(0, base64Image.length - 100);
  
  let signature = '';
  signature += base64Image.substring(startPos, startPos + 20);
  if (midPos + 20 < base64Image.length) {
    signature += '_' + base64Image.substring(midPos, midPos + 20);
  }
  if (endPos > 0 && endPos < base64Image.length) {
    signature += '_' + base64Image.substring(endPos, endPos + 20);
  }
  return signature;
};

export function EtatDesLieuxForm({
  onRapportGenerated,
  initialData,
  onProgressUpdate,
  consultantName,
  editMode = false,
}: EtatDesLieuxFormProps) {
  // Onglets du formulaire
  const tabs = [
    { title: "Type d'état des lieux", icon: "📄" },
    { title: "Informations bien", icon: "🏢" },
    { title: "Parties", icon: "👥" },
    { title: "Contrat", icon: "📝" },
    { title: "Éléments remis", icon: "🔑" },
    { title: "Compteurs", icon: "🔌" },
    { title: "Pièces", icon: "🚪" },
  ]

  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState(0)
  
  // État pour les sections ouvertes
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  
  // État pour le suivi de la progression
  const [progress, setProgress] = useState(0)
  
  // État pour le formulaire
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) {
      // Assurer que toutes les pièces ont un ID
      const dataWithIds = { ...initialData };
      
      // Vérifier et ajouter des IDs aux pièces si nécessaire
      if (dataWithIds.pieces) {
        dataWithIds.pieces = dataWithIds.pieces.map((piece: any) => {
          // Ajouter un ID à la pièce si manquant
          if (!piece.id) {
            piece.id = `piece_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            console.log(`ID généré pour pièce existante: ${piece.id}`);
          }
          
          // Ajouter des IDs aux équipements si nécessaire
          if (piece.equipements) {
            piece.equipements = piece.equipements.map((equip: any) => {
              if (!equip.id) {
                equip.id = `equip_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                console.log(`ID généré pour équipement existant: ${equip.id}`);
              }
              return equip;
            });
          }
          
          return piece;
        });
      }
      
      console.log("Données initiales avec IDs:", dataWithIds);
      return dataWithIds;
    }
    
    return {
      // Valeurs par défaut ou données initiales si fournies
      typeEtatDesLieux: initialData?.typeEtatDesLieux || "entree",
      dateEtatDesLieux: initialData?.dateEtatDesLieux || getTodayDate(),
      dateEtat: initialData?.dateEtat || getTodayDate(),
      
      typeBien: initialData?.typeBien || [],
      adresseBien: initialData?.adresseBien || "",
      codePostalBien: initialData?.codePostalBien || "",
      villeBien: initialData?.villeBien || "",
      
      bailleur: {
        nom: initialData?.bailleur?.nom || "",
        prenom: initialData?.bailleur?.prenom || "",
        adresse: initialData?.bailleur?.adresse || "",
        codePostal: initialData?.bailleur?.codePostal || "",
        ville: initialData?.bailleur?.ville || "",
        telephone: initialData?.bailleur?.telephone || "",
        email: initialData?.bailleur?.email || "",
      },
      
      locataire: {
        nom: initialData?.locataire?.nom || "",
        prenom: initialData?.locataire?.prenom || "",
        telephone: initialData?.locataire?.telephone || "",
        email: initialData?.locataire?.email || "",
        adresse: initialData?.locataire?.adresse || "",
        codePostal: initialData?.locataire?.codePostal || "",
        ville: initialData?.locataire?.ville || "",
      },
      
      mandataire: {
        present: initialData?.mandataire?.present || false,
        nom: initialData?.mandataire?.nom || "",
        adresse: initialData?.mandataire?.adresse || "",
        telephone: initialData?.mandataire?.telephone || "",
      },
      
      contrat: {
        dateSignature: initialData?.contrat?.dateSignature || "",
        dateEntree: initialData?.contrat?.dateEntree || "",
        dateSortie: initialData?.contrat?.dateSortie || "",
        dureeContrat: initialData?.contrat?.dureeContrat || "",
        montantLoyer: initialData?.contrat?.montantLoyer || "",
        montantCharges: initialData?.contrat?.montantCharges || "",
        montantDepotGarantie: initialData?.contrat?.montantDepotGarantie || "",
        typeActivite: initialData?.contrat?.typeActivite || "",
      },
      
      elements: {
        cles: {
          nombre: initialData?.elements?.cles?.nombre || "0",
          detail: initialData?.elements?.cles?.detail || "",
        },
        badges: {
          nombre: initialData?.elements?.badges?.nombre || "0",
          detail: initialData?.elements?.badges?.detail || "",
        },
        telecommandes: {
          nombre: initialData?.elements?.telecommandes?.nombre || "0",
          detail: initialData?.elements?.telecommandes?.detail || "",
        },
        documents: {
          diagnostics: initialData?.elements?.documents?.diagnostics || false,
          planLocaux: initialData?.elements?.documents?.planLocaux || false,
          reglementImmeuble: initialData?.elements?.documents?.reglementImmeuble || false,
          noticeMaintenance: initialData?.elements?.documents?.noticeMaintenance || false
        },
        autresElements: initialData?.elements?.autresElements || ""
      },
      
      compteurs: {
        eau: {
          presence: initialData?.compteurs?.eau?.presence || false,
          numero: initialData?.compteurs?.eau?.numero || "",
          releve: initialData?.compteurs?.eau?.releve || "",
          localisation: initialData?.compteurs?.eau?.localisation || "",
          observations: initialData?.compteurs?.eau?.observations || "",
          photos: initialData?.compteurs?.eau?.photos || [],
        },
        electricite: {
          presence: initialData?.compteurs?.electricite?.presence || false,
          numero: initialData?.compteurs?.electricite?.numero || "",
          releve: initialData?.compteurs?.electricite?.releve || "",
          puissance: initialData?.compteurs?.electricite?.puissance || "",
          localisation: initialData?.compteurs?.electricite?.localisation || "",
          observations: initialData?.compteurs?.electricite?.observations || "",
          photos: initialData?.compteurs?.electricite?.photos || [],
        },
        gaz: {
          presence: initialData?.compteurs?.gaz?.presence || false,
          numero: initialData?.compteurs?.gaz?.numero || "",
          releve: initialData?.compteurs?.gaz?.releve || "",
          localisation: initialData?.compteurs?.gaz?.localisation || "",
          observations: initialData?.compteurs?.gaz?.observations || "",
          photos: initialData?.compteurs?.gaz?.photos || [],
        },
      },
      
      pieces: initialData?.pieces || [
        {
          id: "1",
          nom: "Entrée",
          sols: {
            nature: "",
            etat: "",
            observations: "",
          },
          murs: {
            nature: "",
            etat: "",
            observations: "",
          },
          plafonds: {
            nature: "",
            etat: "",
            observations: "",
          },
          plinthes: {
            nature: "",
            etat: "",
            observations: "",
          },
          fenetres: {
            nature: "",
            etat: "",
            observations: "",
          },
          portes: {
            nature: "",
            etat: "",
            observations: "",
          },
          chauffage: {
            nature: "",
            etat: "",
            observations: "",
          },
          prises: {
            nombre: "0",
            etat: "",
            observations: "",
          },
          interrupteurs: {
            nombre: "0",
            etat: "",
            observations: "",
          },
          equipements: [],
          photos: [],
          observations: "",
        },
      ],
      
      exterieur: {
        jardin: {
          presence: initialData?.exterieur?.jardin?.presence || false,
          etat: initialData?.exterieur?.jardin?.etat || "",
          observations: initialData?.exterieur?.jardin?.observations || "",
          photos: initialData?.exterieur?.jardin?.photos || [],
        },
        terrasse: {
          presence: initialData?.exterieur?.terrasse?.presence || false,
          etat: initialData?.exterieur?.terrasse?.etat || "",
          observations: initialData?.exterieur?.terrasse?.observations || "",
          photos: initialData?.exterieur?.terrasse?.photos || [],
        },
        balcon: {
          presence: initialData?.exterieur?.balcon?.presence || false,
          etat: initialData?.exterieur?.balcon?.etat || "",
          observations: initialData?.exterieur?.balcon?.observations || "",
          photos: initialData?.exterieur?.balcon?.photos || [],
        },
        garage: {
          presence: initialData?.exterieur?.garage?.presence || false,
          etat: initialData?.exterieur?.garage?.etat || "",
          observations: initialData?.exterieur?.garage?.observations || "",
          photos: initialData?.exterieur?.garage?.photos || [],
        },
        parking: {
          presence: initialData?.exterieur?.parking?.presence || false,
          etat: initialData?.exterieur?.parking?.etat || "",
          observations: initialData?.exterieur?.parking?.observations || "",
          photos: initialData?.exterieur?.parking?.photos || [],
        },
        cave: {
          presence: initialData?.exterieur?.cave?.presence || false,
          etat: initialData?.exterieur?.cave?.etat || "",
          observations: initialData?.exterieur?.cave?.observations || "",
          photos: initialData?.exterieur?.cave?.photos || [],
        },
      },
      
      observationsGenerales: initialData?.observationsGenerales || "",
      
      signatures: {
        bailleur: initialData?.signatures?.bailleur || false,
        locataire: initialData?.signatures?.locataire || false,
        mandataire: initialData?.signatures?.mandataire || false,
      },
    }
  })
  
  // Toast pour les notifications
  const { toast } = useToast()
  
  // Référence au formulaire pour soumettre
  const formRef = useRef<HTMLFormElement>(null)
  
  // Gérer les changements dans les champs simples
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    updateFormField(name, value)
  }
  
  // Gérer les changements dans les listes déroulantes
  const handleSelectChange = (name: string, value: string) => {
    updateFormField(name, value)
  }
  
  // Gérer les changements dans les cases à cocher
  const handleCheckboxChange = (name: string, checked: boolean) => {
    updateFormField(name, checked)
  }
  
  // Fonction générique pour mettre à jour n'importe quel champ du formulaire
  const updateFormField = (fieldPath: string, value: any) => {
    setFormData((prevData) => {
      const newData = { ...prevData }
      const paths = fieldPath.split('.')
      let current: any = newData
      
      // Naviguer jusqu'à l'objet parent du champ à mettre à jour
      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) {
          current[paths[i]] = {}
        }
        current = current[paths[i]]
      }
      
      // Mettre à jour le champ
      current[paths[paths.length - 1]] = value
      
      return newData
    })
  }
  
  // Fonction pour mettre à jour un champ imbriqué dans l'objet formData
  const updateNestedFormField = (fieldPath: string, value: any) => {
    setFormData((prevData) => {
      // Créer une copie profonde des données actuelles
      const updatedData = JSON.parse(JSON.stringify(prevData));
      
      // Diviser le chemin en segments
      const segments = fieldPath.split(".");
      
      // Référence pour naviguer dans l'objet
      let current = updatedData;
      
      // Parcourir les segments jusqu'à l'avant-dernier
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        
        // Si le segment suivant n'existe pas encore, le créer
        if (!current[segment]) {
          current[segment] = {};
        }
        
        // Avancer au segment suivant
        current = current[segment];
      }
      
      // Mettre à jour la valeur du dernier segment
      current[segments[segments.length - 1]] = value;
      
      // Mettre à jour la progression si nécessaire
      if (onProgressUpdate) {
        onProgressUpdate(updatedData);
      }
      
      return updatedData;
    });
  };
  
  // Variable pour suivre les opérations d'upload en cours
  const uploadsInProgress = useRef<Record<string, boolean>>({});
  
  // Cache des signatures d'images pour éviter les doublons
  const imageSignatureCache = useRef<Record<string, Set<string>>>({});

  const handlePhotoUpload = (fieldPath: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handlePhotoUpload appelé - début", fieldPath);
    
    // Fonction interne pour générer une signature unique d'image
    const getImageSignature = (base64Image: string): string => {
      const startPos = Math.min(100, Math.floor(base64Image.length / 4));
      const midPos = Math.floor(base64Image.length / 2);
      const endPos = Math.max(0, base64Image.length - 100);
      
      let signature = '';
      signature += base64Image.substring(startPos, startPos + 20);
      if (midPos + 20 < base64Image.length) {
        signature += '_' + base64Image.substring(midPos, midPos + 20);
      }
      if (endPos > 0 && endPos < base64Image.length) {
        signature += '_' + base64Image.substring(endPos, endPos + 20);
      }
      return signature;
    };
    
    // Si aucun événement n'est fourni, créer un input file caché et le déclencher
    if (!e) {
      console.log("Aucun événement fourni, création d'un input file caché");
      
      // Créer l'élément input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true; // Permettre la sélection multiple
      
      // Définir le gestionnaire de changement
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        if (target && target.files && target.files.length > 0) {
          console.log(`${target.files.length} fichier(s) sélectionné(s) via input caché`);
          
          // Rappeler handlePhotoUpload avec l'événement obtenu
          handlePhotoUpload(fieldPath, { target } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
      };
      
      // Déclencher le clic
      input.click();
      return;
    }
    
    if (e && e.target.files && e.target.files.length > 0) {
      // Vérifier si un upload est déjà en cours pour ce champ
      if (uploadsInProgress.current[fieldPath]) {
        console.log(`Upload déjà en cours pour ${fieldPath}, annulation pour éviter les doublons`);
        return;
      }
      
      // Marquer cet upload comme en cours
      uploadsInProgress.current[fieldPath] = true;
      
      // Initialiser le cache des signatures pour ce champ s'il n'existe pas
      if (!imageSignatureCache.current[fieldPath]) {
        imageSignatureCache.current[fieldPath] = new Set<string>();
      }
      
      const files = Array.from(e.target.files);
      console.log(`${files.length} fichier(s) sélectionné(s)`);
      
      // Vérifier l'état actuel du tableau de photos
      const paths = fieldPath.split('.');
      let currentPhotos: any[] = [];
      let current = { ...formData } as any;
      
      for (let i = 0; i < paths.length; i++) {
        if (i === paths.length - 1) {
          // S'assurer que le champ est un tableau
          if (!Array.isArray(current[paths[i]])) {
            current[paths[i]] = [];
          }
          currentPhotos = current[paths[i]];
        } else {
          if (!current[paths[i]]) {
            current[paths[i]] = {};
          }
          current = current[paths[i]];
        }
      }
      
      console.log(`État actuel du tableau de photos (${fieldPath}):`, currentPhotos);
      console.log(`Nombre de photos avant ajout: ${currentPhotos.length}`);
      
      // Créer un tableau pour stocker toutes les promesses de traitement d'images
      const imageProcessingPromises: Promise<string | null>[] = [];
      
      // Traiter chaque fichier
      files.forEach(file => {
        console.log(`Traitement du fichier: ${file.name}, taille: ${file.size}, type: ${file.type}`);
        
        // Vérifier la taille du fichier (max 5Mo)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Fichier trop volumineux",
            description: `Le fichier ${file.name} est trop volumineux. La taille maximale acceptée est de 5Mo`,
            variant: "destructive",
          });
          return; // Passer au fichier suivant
        }
        
        // Vérifier que le type de fichier est une image
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Type de fichier non supporté",
            description: `Le fichier ${file.name} n'est pas une image (type: ${file.type})`,
            variant: "destructive",
          });
          return; // Passer au fichier suivant
        }
        
        // Créer une promesse pour le traitement de cette image
        const processPromise = new Promise<string | null>((resolve) => {
          // Compresser l'image
          compressImage(file).then(compressedFile => {
            // Créer un URL pour la prévisualisation
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target && event.target.result) {
                const imageData = event.target.result;
                console.log(`Image ${file.name} lue avec succès, taille des données: ${typeof imageData === 'string' ? imageData.length : 'non-string'}`);
                
                // Vérifier que les données sont au format base64
                if (typeof imageData !== 'string' || !imageData.startsWith('data:')) {
                  console.error(`Image ${file.name} n'est pas au format base64 valide`);
                  toast({
                    title: "Erreur de format",
                    description: `Impossible de traiter l'image ${file.name}`,
                    variant: "destructive",
                  });
                  resolve(null);
                  return;
                }
                
                // Résoudre avec les données de l'image
                resolve(imageData as string);
              } else {
                console.error(`Échec de lecture de l'image ${file.name}`);
                resolve(null);
              }
            };
            reader.onerror = () => {
              console.error(`Erreur lors de la lecture de l'image ${file.name}`);
              resolve(null);
            };
            reader.readAsDataURL(compressedFile);
          }).catch(error => {
            console.error(`Erreur lors de la compression de l'image ${file.name}:`, error);
            toast({
              title: "Erreur de compression",
              description: `Impossible de compresser l'image ${file.name}`,
              variant: "destructive",
            });
            resolve(null);
          });
        });
        
        // Ajouter la promesse au tableau
        imageProcessingPromises.push(processPromise);
      });
      
      // Attendre que toutes les images soient traitées
      Promise.all(imageProcessingPromises)
        .then((results) => {
          // S'assurer que l'upload est toujours en cours pour ce champ
          if (!uploadsInProgress.current[fieldPath]) {
            console.log(`Upload pour ${fieldPath} a été annulé entre-temps, arrêt du traitement`);
            return;
          }
          
          // Filtrer les résultats pour ne garder que les images valides
          const validImages = results.filter((img): img is string => img !== null);
          console.log(`${validImages.length} images valides sur ${results.length} traitées`);
          
          if (validImages.length === 0) {
            console.log("Aucune image valide à ajouter");
            // Libérer le marqueur d'upload
            uploadsInProgress.current[fieldPath] = false;
            return;
          }
          
          // Filtrer les doublons basés sur les signatures
          const uniqueImages: string[] = [];
          validImages.forEach(imageData => {
            const signature = getImageSignature(imageData);
            if (!imageSignatureCache.current[fieldPath].has(signature)) {
              imageSignatureCache.current[fieldPath].add(signature);
              uniqueImages.push(imageData);
            } else {
              console.log("Image dupliquée détectée et ignorée (signature déjà présente)");
            }
          });
          
          console.log(`${uniqueImages.length} nouvelles images uniques sur ${validImages.length} traitées`);
          
          if (uniqueImages.length === 0) {
            console.log("Toutes les images sont des doublons, rien à ajouter");
            uploadsInProgress.current[fieldPath] = false;
            return;
          }
          
          // Mise à jour en une seule opération avec vérification supplémentaire
          setFormData(prevData => {
            const newData = { ...prevData };
            let current = newData as any;
            
            // Naviguer jusqu'au tableau de photos
            const paths = fieldPath.split('.');
            for (let i = 0; i < paths.length - 1; i++) {
              if (!current[paths[i]]) {
                current[paths[i]] = {};
              }
              current = current[paths[i]];
            }
            
            // S'assurer que le champ est un tableau
            const lastPath = paths[paths.length - 1];
            if (!Array.isArray(current[lastPath])) {
              current[lastPath] = [];
            }
            
            // Récupérer le tableau actuel de photos
            const currentArray = current[lastPath];
            console.log(`Tableau de photos avant ajout: ${currentArray.length} éléments`);
            
            // PROTECTION FINALE CONTRE LA DUPLICATION:
            // Vérifier si la dernière image que nous allons ajouter existe déjà
            // Cela détecte si cet ajout a déjà été fait lors d'un rendu précédent
            const lastImageToAdd = uniqueImages[uniqueImages.length - 1];
            const lastImageSignature = getImageSignature(lastImageToAdd);
            
            // Vérifier si l'image existe déjà dans le tableau actuel
            const imageExists = currentArray.some((existingPhoto: any) => {
              if (typeof existingPhoto === 'string') {
                return getImageSignature(existingPhoto) === lastImageSignature;
              }
              return false;
            });
            
            if (imageExists) {
              console.log("Dernier lot d'images déjà présent dans le tableau, annulation pour éviter les doublons");
              return prevData; // Retourner l'état précédent sans modification
            }
            
            // Ajouter toutes les nouvelles images
            uniqueImages.forEach(img => {
              currentArray.push(img);
            });
            
            console.log(`${uniqueImages.length} nouvelles images ajoutées, tableau final: ${currentArray.length} éléments`);
            
            // Après avoir effectué la mise à jour, supprimer le marqueur d'upload
            setTimeout(() => {
              uploadsInProgress.current[fieldPath] = false;
              console.log(`Upload terminé pour ${fieldPath}, marqueur supprimé`);
            }, 1000);
            
            toast({
              title: "Images ajoutées",
              description: `${uniqueImages.length} image(s) ajoutée(s) avec succès`,
              variant: "default",
            });
            
            return newData;
          });
        })
        .catch(error => {
          // En cas d'erreur, supprimer également le marqueur d'upload
          uploadsInProgress.current[fieldPath] = false;
          console.error("Erreur lors du traitement des images:", error);
          toast({
            title: "Erreur",
            description: "Une erreur est survenue lors du traitement des images",
            variant: "destructive",
          });
        });
    }
    
    console.log("handlePhotoUpload appelé - fin");
  }
  
  // Fonction pour compresser une image
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target || !event.target.result) {
          reject(new Error("Échec de la lecture du fichier"));
          return;
        }

        // Utiliser l'objet Image natif du navigateur au lieu de l'importation Next.js
        const img = document.createElement('img');
        img.onload = () => {
          // Calculer les dimensions pour la compression
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200; // Dimension maximale pour l'image

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // Créer un canvas pour la compression
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error("Impossible de créer le contexte du canvas"));
            return;
          }
          
          // Dessiner l'image sur le canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir en blob avec compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Échec de la conversion en blob"));
                return;
              }
              
              // Vérifier que le blob est valide
              if (blob.size === 0) {
                console.error("Blob de taille nulle généré");
                reject(new Error("Image compressée invalide (taille nulle)"));
                return;
              }
              
              // Ajouter des informations de débogage
              console.log(`Image compressée avec succès: ${width}x${height}, taille: ${blob.size} octets, type: ${blob.type}`);
              
              resolve(blob);
            },
            'image/jpeg',
            0.8 // Qualité de compression légèrement augmentée (0.8 = 80%)
          );
        };
        
        img.onerror = (error) => {
          console.error("Erreur lors du chargement de l'image:", error);
          reject(new Error("Échec du chargement de l'image"));
        };
        
        // S'assurer que la source est une chaîne
        const imgSrc = event.target.result.toString();
        img.src = imgSrc;
      };
      
      reader.onerror = (error) => {
        console.error("Erreur lors de la lecture du fichier:", error);
        reject(new Error("Échec de la lecture du fichier"));
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  // Gérer la suppression d'une photo
  const handleRemovePhoto = (fieldPath: string, index: number) => {
    console.log(`handleRemovePhoto appelé - fieldPath: ${fieldPath}, index: ${index}`);
    setFormData((prevData) => {
      const newData = { ...prevData };
      const paths = fieldPath.split('.');
      let current: any = newData;
      
      // Naviguer jusqu'à l'objet parent du champ à mettre à jour
      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) {
          current[paths[i]] = {};
        }
        current = current[paths[i]];
      }
      
      // Supprimer la photo du tableau
      if (Array.isArray(current[paths[paths.length - 1]])) {
        current[paths[paths.length - 1]] = current[paths[paths.length - 1]].filter((_: any, i: number) => i !== index);
        console.log(`Photo supprimée à l'index ${index}, nouvelles photos:`, current[paths[paths.length - 1]]);
      }
      
      return newData;
    });
  };
  
  // Ajouter un état pour suivre si une action est en cours
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingEquipment, setIsAddingEquipment] = useState<Record<number, boolean>>({});
  
  // Gérer l'ajout d'une pièce
  const handleAddRoom = () => {
    console.log("handleAddRoom appelé - début");
    
    // Vérifier si un ajout est déjà en cours
    if (isAddingRoom) {
      console.log("Ajout de pièce déjà en cours, annulation");
      return;
    }
    
    // Marquer l'ajout comme en cours
    setIsAddingRoom(true);
    console.log("Marquage de l'ajout de pièce comme en cours");
    
    // Délai pour éviter les doubles appels en mode strict
    setTimeout(() => {
      // Ajouter la pièce une seule fois avec dé-doublonnage
      setFormData((prevData) => {
        console.log(`Pièces avant ajout: ${prevData.pieces.length}`);
        
        // Protection contre les doubles appels
        const initialPieceCount = prevData.pieces.length;
        const lastPieceAddTime = prevData.pieces.length > 0 
          ? Number(prevData.pieces[prevData.pieces.length - 1]?.id?.split('_')[1] || 0) 
          : 0;
          
        // Si la dernière pièce a été ajoutée il y a moins de 500ms, ne rien faire
        if (Date.now() - lastPieceAddTime < 500) {
          console.log("Double appel détecté, annulation");
          setIsAddingRoom(false);
          return prevData;
        }
        
        const newData = { ...prevData };
        
        // Générer un ID unique pour la nouvelle pièce avec plus de précision
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 10000);
        const uniqueId = `piece_${timestamp}_${randomSuffix}`;
        
        console.log(`Nouvel ID généré: ${uniqueId}`);
        
        newData.pieces.push({
          id: uniqueId,
          nom: `Pièce ${newData.pieces.length + 1}`,
          sols: { nature: "", etat: "", observations: "" },
          murs: { nature: "", etat: "", observations: "" },
          plafonds: { nature: "", etat: "", observations: "" },
          plinthes: { nature: "", etat: "", observations: "" },
          fenetres: { nature: "", etat: "", observations: "" },
          portes: { nature: "", etat: "", observations: "" },
          chauffage: { nature: "", etat: "", observations: "" },
          prises: { nombre: "0", etat: "", observations: "" },
          interrupteurs: { nombre: "0", etat: "", observations: "" },
          equipements: [],
          photos: [],
          observations: "",
        });
        
        console.log(`Pièces après ajout: ${newData.pieces.length}`);
        
        // Vérifier qu'une seule pièce a été ajoutée
        if (newData.pieces.length !== initialPieceCount + 1) {
          console.warn(`Anomalie détectée: ${newData.pieces.length - initialPieceCount} pièces ajoutées au lieu de 1`);
        }
        
        // Réinitialiser l'état après l'ajout
        setIsAddingRoom(false);
        
        return newData;
      });
      
      console.log("handleAddRoom appelé - fin");
    }, 0); // délai minimal pour échapper au double rendu
  };
  
  // Gérer la suppression d'une pièce
  const handleRemoveRoom = (index: number) => {
    if (index === 0) return // Empêcher la suppression de la première pièce
    
    setFormData((prevData) => {
      const newData = { ...prevData }
      newData.pieces.splice(index, 1)
      return newData
    })
  }
  
  // Ajouter un objet pour suivre les verrous d'ajout d'équipement par pièce
  // const equipmentLocks = useRef<Record<string, boolean>>({});
  
  // Gérer l'ajout d'un équipement à une pièce
  const handleAddEquipment = (pieceIndex: number) => {
    console.log("handleAddEquipment appelé - début", pieceIndex);
    
    // Vérifier si un ajout est déjà en cours pour cette pièce
    if (isAddingEquipment[pieceIndex]) {
      console.log(`Ajout d'équipement déjà en cours pour la pièce ${pieceIndex}, annulation`);
      return;
    }
    
    // Marquer l'ajout comme en cours pour cette pièce
    setIsAddingEquipment(prev => ({
      ...prev,
      [pieceIndex]: true
    }));
    console.log(`Marquage de l'ajout d'équipement comme en cours pour la pièce ${pieceIndex}`);
    
    // Délai pour éviter les doubles appels en mode strict
    setTimeout(() => {
      // Ajouter l'équipement une seule fois avec dé-doublonnage
      setFormData((prevData) => {
        console.log(`Équipements avant ajout: ${prevData.pieces[pieceIndex].equipements.length}`);
        
        // Protection contre les doubles appels
        const initialEquipCount = prevData.pieces[pieceIndex].equipements.length;
        const lastEquipAddTime = initialEquipCount > 0 
          ? Number(prevData.pieces[pieceIndex].equipements[initialEquipCount - 1]?.id?.split('_')[1] || 0) 
          : 0;
          
        // Si le dernier équipement a été ajouté il y a moins de 500ms, ne rien faire
        if (Date.now() - lastEquipAddTime < 500) {
          console.log("Double appel détecté, annulation");
          setIsAddingEquipment(prev => ({
            ...prev,
            [pieceIndex]: false
          }));
          return prevData;
        }
        
        const newData = { ...prevData };
        
        // Générer un ID unique pour le nouvel équipement
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 10000);
        const uniqueId = `equip_${timestamp}_${randomSuffix}`;
        
        console.log(`Nouvel ID d'équipement généré: ${uniqueId}`);
        
        newData.pieces[pieceIndex].equipements.push({
          id: uniqueId,
          nom: "",
          etat: "",
          observations: "",
        });
        
        console.log(`Équipements après ajout: ${newData.pieces[pieceIndex].equipements.length}`);
        
        // Vérifier qu'un seul équipement a été ajouté
        if (newData.pieces[pieceIndex].equipements.length !== initialEquipCount + 1) {
          console.warn(`Anomalie détectée: ${newData.pieces[pieceIndex].equipements.length - initialEquipCount} équipements ajoutés au lieu de 1`);
        }
        
        // Réinitialiser l'état après l'ajout
        setIsAddingEquipment(prev => ({
          ...prev,
          [pieceIndex]: false
        }));
        
        return newData;
      });
      
      console.log("handleAddEquipment appelé - fin");
    }, 0); // délai minimal pour échapper au double rendu
  };
  
  // Gérer la suppression d'un équipement
  const handleRemoveEquipment = (pieceIndex: number, equipmentIndex: number) => {
    console.log(`handleRemoveEquipment appelé - pieceIndex: ${pieceIndex}, equipmentIndex: ${equipmentIndex}`);
    setFormData((prevData) => {
      const newData = { ...prevData };
      newData.pieces[pieceIndex].equipements.splice(equipmentIndex, 1);
      console.log(`Équipement supprimé, nombre restant: ${newData.pieces[pieceIndex].equipements.length}`);
      return newData;
    });
  }
  
  // Gérer l'ouverture/fermeture d'une section
  const handleSectionToggle = (sectionId: string) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }
  
  // Calculer la progression du formulaire
  const calculateProgress = () => {
    // Logique pour calculer le pourcentage de complétion
    // Sera implémentée plus tard
    setProgress(0)
  }
  
  // Générer un rapport HTML
  const generateReport = () => {
    // Cette fonction sera remplacée par la génération PDF
    const rapport = `
      <h1>État des Lieux ${formData.typeEtatDesLieux === "entree" ? "d'entrée" : "de sortie"}</h1>
      <p>Date: ${formData.dateEtatDesLieux}</p>
      <!-- Le reste du contenu sera généré plus tard -->
    `
    
    return rapport
  }
  
  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("======= SOUMISSION DU FORMULAIRE DÉCLENCHÉE =======")
    console.log("Onglet actif lors de la soumission:", activeTab)
    
    // Vérifier que nous sommes bien sur le dernier onglet
    if (activeTab !== tabs.length - 1) {
      console.log("Tentative de soumission depuis un onglet intermédiaire - ANNULÉE")
      console.log("Navigation vers l'onglet suivant à la place")
      
      // Au lieu de soumettre, passer à l'onglet suivant
      setActiveTab(Math.min(tabs.length - 1, activeTab + 1))
      
      return // Arrêter la soumission
    }
    
    console.log("Soumission du formulaire depuis le dernier onglet - VALIDÉE")
    console.log("Données du formulaire:", formData)
    
    try {
      const rapport = generateReport()
      onRapportGenerated(rapport, formData)
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération du rapport",
        variant: "destructive",
      })
    }
  }
  
  // Mettre à jour la progression quand les données changent
  useEffect(() => {
    calculateProgress()
    onProgressUpdate?.(formData)
  }, [formData, onProgressUpdate])
  
  // Rendu du formulaire
  return (
    <div className="container mx-auto pb-safe main-content">
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        {/* Navigation par onglets */}
        <div className="flex overflow-x-auto py-2 gap-1 sm:gap-2 no-scrollbar">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex flex-col items-center justify-center min-w-16 sm:min-w-24 px-1 py-2 rounded-lg text-sm transition-colors
                ${activeTab === index 
                  ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
              aria-selected={activeTab === index}
              role="tab"
            >
              <span className="text-xl sm:text-2xl">{tab.icon}</span>
              <span className="text-xs sm:text-sm whitespace-nowrap mt-1">{tab.title}</span>
            </button>
          ))}
        </div>
        
        {/* Contenu du formulaire */}
        <form 
          ref={formRef} 
          onSubmit={handleSubmit} 
          className="space-y-6"
          onClick={(e) => {
            console.log("Clic détecté sur le formulaire:", e.target);
          }}
        >
          {/* Type d'état des lieux */}
          {activeTab === 0 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Type d'état des lieux</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="typeEtatDesLieux" className="text-base font-medium">
                    Type d'état des lieux
                  </Label>
                  <RadioGroup
                    value={formData.typeEtatDesLieux}
                    onValueChange={(value) => updateFormField("typeEtatDesLieux", value)}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="entree" id="entree" />
                      <Label htmlFor="entree" className="text-base">
                        Entrée
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sortie" id="sortie" />
                      <Label htmlFor="sortie" className="text-base">
                        Sortie
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEtatDesLieux" className="text-base font-medium">
                    Date de l'état des lieux
                  </Label>
                  <Input
                    type="date"
                    id="dateEtatDesLieux"
                    name="dateEtatDesLieux"
                    value={formData.dateEtatDesLieux}
                    onChange={handleInputChange}
                    className="w-full sm:w-auto text-base"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Informations sur le bien */}
          {activeTab === 1 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Informations sur le bien</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="typeBien" className="text-base font-medium">
                    Type de bien
                  </Label>
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="typeBien-bureau" 
                        checked={formData.typeBien.includes("bureau")}
                        onCheckedChange={(checked) => {
                          const newTypeBien = [...formData.typeBien];
                          if (checked) {
                            if (!newTypeBien.includes("bureau")) newTypeBien.push("bureau");
                          } else {
                            const index = newTypeBien.indexOf("bureau");
                            if (index !== -1) newTypeBien.splice(index, 1);
                          }
                          updateFormField("typeBien", newTypeBien);
                        }}
                      />
                      <Label htmlFor="typeBien-bureau">Bureau</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="typeBien-local-commercial" 
                        checked={formData.typeBien.includes("local-commercial")}
                        onCheckedChange={(checked) => {
                          const newTypeBien = [...formData.typeBien];
                          if (checked) {
                            if (!newTypeBien.includes("local-commercial")) newTypeBien.push("local-commercial");
                          } else {
                            const index = newTypeBien.indexOf("local-commercial");
                            if (index !== -1) newTypeBien.splice(index, 1);
                          }
                          updateFormField("typeBien", newTypeBien);
                        }}
                      />
                      <Label htmlFor="typeBien-local-commercial">Local commercial</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="typeBien-local-activite" 
                        checked={formData.typeBien.includes("local-activite")}
                        onCheckedChange={(checked) => {
                          const newTypeBien = [...formData.typeBien];
                          if (checked) {
                            if (!newTypeBien.includes("local-activite")) newTypeBien.push("local-activite");
                          } else {
                            const index = newTypeBien.indexOf("local-activite");
                            if (index !== -1) newTypeBien.splice(index, 1);
                          }
                          updateFormField("typeBien", newTypeBien);
                        }}
                      />
                      <Label htmlFor="typeBien-local-activite">Local d'activité</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adresseBien" className="text-base font-medium">
                    Adresse
                  </Label>
                  <Input
                    type="text"
                    id="adresseBien"
                    name="adresseBien"
                    value={formData.adresseBien}
                    onChange={handleInputChange}
                    className="w-full text-base"
                    placeholder="Numéro et nom de la rue"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codePostalBien" className="text-base font-medium">
                      Code postal
                    </Label>
                    <Input
                      type="text"
                      id="codePostalBien"
                      name="codePostalBien"
                      value={formData.codePostalBien}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Ex: 75001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="villeBien" className="text-base font-medium">
                      Ville
                    </Label>
                    <Input
                      type="text"
                      id="villeBien"
                      name="villeBien"
                      value={formData.villeBien}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Ex: Paris"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="superficieBien" className="text-base font-medium">
                    Superficie (m²)
                  </Label>
                  <Input
                    type="number"
                    id="superficieBien"
                    name="superficieBien"
                    value={formData.superficieBien || ""}
                    onChange={handleInputChange}
                    className="w-full text-base"
                    placeholder="Surface en m²"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Parties */}
          {activeTab === 2 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Parties au contrat</h2>
              
              <div className="space-y-6">
                {/* Bailleur */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Bailleur / Propriétaire</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.nom" className="text-base font-medium">
                        Nom
                      </Label>
                      <Input
                        type="text"
                        id="bailleur.nom"
                        name="bailleur.nom"
                        value={formData.bailleur.nom}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Nom du bailleur"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.prenom" className="text-base font-medium">
                        Prénom
                      </Label>
                      <Input
                        type="text"
                        id="bailleur.prenom"
                        name="bailleur.prenom"
                        value={formData.bailleur.prenom}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Prénom du bailleur"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="bailleur.adresse" className="text-base font-medium">
                      Adresse
                    </Label>
                    <Input
                      type="text"
                      id="bailleur.adresse"
                      name="bailleur.adresse"
                      value={formData.bailleur.adresse}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Adresse du bailleur"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.codePostal" className="text-base font-medium">
                        Code postal
                      </Label>
                      <Input
                        type="text"
                        id="bailleur.codePostal"
                        name="bailleur.codePostal"
                        value={formData.bailleur.codePostal}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Code postal"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.ville" className="text-base font-medium">
                        Ville
                      </Label>
                      <Input
                        type="text"
                        id="bailleur.ville"
                        name="bailleur.ville"
                        value={formData.bailleur.ville}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.telephone" className="text-base font-medium">
                        Téléphone
                      </Label>
                      <Input
                        type="tel"
                        id="bailleur.telephone"
                        name="bailleur.telephone"
                        value={formData.bailleur.telephone}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Numéro de téléphone"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.email" className="text-base font-medium">
                        Email
                      </Label>
                      <Input
                        type="email"
                        id="bailleur.email"
                        name="bailleur.email"
                        value={formData.bailleur.email}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse email"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Locataire */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Locataire</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locataire.nom" className="text-base font-medium">
                        Nom
                      </Label>
                      <Input
                        type="text"
                        id="locataire.nom"
                        name="locataire.nom"
                        value={formData.locataire.nom}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Nom du locataire"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="locataire.prenom" className="text-base font-medium">
                        Prénom
                      </Label>
                      <Input
                        type="text"
                        id="locataire.prenom"
                        name="locataire.prenom"
                        value={formData.locataire.prenom}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Prénom du locataire"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="locataire.telephone" className="text-base font-medium">
                        Téléphone
                      </Label>
                      <Input
                        type="tel"
                        id="locataire.telephone"
                        name="locataire.telephone"
                        value={formData.locataire.telephone}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Numéro de téléphone"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="locataire.email" className="text-base font-medium">
                        Email
                      </Label>
                      <Input
                        type="email"
                        id="locataire.email"
                        name="locataire.email"
                        value={formData.locataire.email}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse email"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="locataire.adresse" className="text-base font-medium">
                        Adresse
                      </Label>
                      <Input
                        type="text"
                        id="locataire.adresse"
                        name="locataire.adresse"
                        value={formData.locataire.adresse}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse du locataire"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="locataire.codePostal" className="text-base font-medium">
                        Code postal
                      </Label>
                      <Input
                        type="text"
                        id="locataire.codePostal"
                        name="locataire.codePostal"
                        value={formData.locataire.codePostal}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Code postal"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="locataire.ville" className="text-base font-medium">
                        Ville
                      </Label>
                      <Input
                        type="text"
                        id="locataire.ville"
                        name="locataire.ville"
                        value={formData.locataire.ville}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Mandataire */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <Checkbox 
                      id="mandataire.present" 
                      checked={formData.mandataire.present}
                      onCheckedChange={(checked) => 
                        updateFormField("mandataire.present", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="mandataire.present" className="text-lg font-medium">
                      Mandataire / Agence immobilière
                    </Label>
                  </div>
                  
                  {formData.mandataire.present && (
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="mandataire.nom" className="text-base font-medium">
                          Nom de l'agence / du mandataire
                        </Label>
                        <Input
                          type="text"
                          id="mandataire.nom"
                          name="mandataire.nom"
                          value={formData.mandataire.nom}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Nom de l'agence"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mandataire.adresse" className="text-base font-medium">
                          Adresse
                        </Label>
                        <Input
                          type="text"
                          id="mandataire.adresse"
                          name="mandataire.adresse"
                          value={formData.mandataire.adresse}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Adresse de l'agence"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="mandataire.telephone" className="text-base font-medium">
                          Téléphone
                        </Label>
                        <Input
                          type="tel"
                          id="mandataire.telephone"
                          name="mandataire.telephone"
                          value={formData.mandataire.telephone}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Numéro de téléphone"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Contrat */}
          {activeTab === 3 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Informations sur le contrat</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contrat.dateSignature" className="text-base font-medium">
                      Date de signature du bail
                    </Label>
                    <Input
                      type="date"
                      id="contrat.dateSignature"
                      name="contrat.dateSignature"
                      value={formData.contrat.dateSignature}
                      onChange={handleInputChange}
                      className="w-full text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contrat.dureeContrat" className="text-base font-medium">
                      Durée du bail (ans)
                    </Label>
                    <Select 
                      value={formData.contrat.dureeContrat} 
                      onValueChange={(value) => handleSelectChange("contrat.dureeContrat", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une durée" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 ans (bail commercial)</SelectItem>
                        <SelectItem value="6">6 ans</SelectItem>
                        <SelectItem value="9">9 ans (bail commercial)</SelectItem>
                        <SelectItem value="12">12 ans</SelectItem>
                        <SelectItem value="autre">Autre durée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contrat.dateEntree" className="text-base font-medium">
                      Date d'entrée dans les lieux
                    </Label>
                    <Input
                      type="date"
                      id="contrat.dateEntree"
                      name="contrat.dateEntree"
                      value={formData.contrat.dateEntree}
                      onChange={handleInputChange}
                      className="w-full text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contrat.dateSortie" className="text-base font-medium">
                      Date de sortie prévue
                    </Label>
                    <Input
                      type="date"
                      id="contrat.dateSortie"
                      name="contrat.dateSortie"
                      value={formData.contrat.dateSortie}
                      onChange={handleInputChange}
                      className="w-full text-base"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contrat.montantLoyer" className="text-base font-medium">
                      Montant du loyer (€ HT HC)
                    </Label>
                    <Input
                      type="text"
                      id="contrat.montantLoyer"
                      name="contrat.montantLoyer"
                      value={formData.contrat.montantLoyer}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Ex: 1500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contrat.montantCharges" className="text-base font-medium">
                      Provision sur charges (€)
                    </Label>
                    <Input
                      type="text"
                      id="contrat.montantCharges"
                      name="contrat.montantCharges"
                      value={formData.contrat.montantCharges}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Ex: 200"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contrat.montantDepotGarantie" className="text-base font-medium">
                    Montant du dépôt de garantie (€)
                  </Label>
                  <Input
                    type="text"
                    id="contrat.montantDepotGarantie"
                    name="contrat.montantDepotGarantie"
                    value={formData.contrat.montantDepotGarantie}
                    onChange={handleInputChange}
                    className="w-full text-base"
                    placeholder="Ex: 3000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contrat.typeActivite" className="text-base font-medium">
                    Type d'activité prévue
                  </Label>
                  <Textarea
                    id="contrat.typeActivite"
                    name="contrat.typeActivite"
                    value={formData.contrat.typeActivite || ""}
                    onChange={handleInputChange}
                    placeholder="Précisez l'activité exercée dans les locaux"
                    className="w-full min-h-[80px] text-base"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Éléments remis */}
          {activeTab === 4 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Éléments remis au locataire</h2>
              
              <div className="space-y-6">
                {/* Clés */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Clés</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="elements.cles.nombre" className="text-base font-medium">
                        Nombre de clés
                      </Label>
                      <Input
                        type="number"
                        id="elements.cles.nombre"
                        name="elements.cles.nombre"
                        value={formData.elements.cles.nombre}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.cles.detail" className="text-base font-medium">
                        Détail (portes, accès)
                      </Label>
                      <Input
                        type="text"
                        id="elements.cles.detail"
                        name="elements.cles.detail"
                        value={formData.elements.cles.detail}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Ex: 2 entrée, 1 bureau principal"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Badges/cartes d'accès</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="elements.badges.nombre" className="text-base font-medium">
                        Nombre de badges
                      </Label>
                      <Input
                        type="number"
                        id="elements.badges.nombre"
                        name="elements.badges.nombre"
                        value={formData.elements.badges.nombre}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.badges.detail" className="text-base font-medium">
                        Détail (type d'accès)
                      </Label>
                      <Input
                        type="text"
                        id="elements.badges.detail"
                        name="elements.badges.detail"
                        value={formData.elements.badges.detail}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Ex: accès immeuble, parking"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Télécommandes */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Télécommandes</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="elements.telecommandes.nombre" className="text-base font-medium">
                        Nombre de télécommandes
                      </Label>
                      <Input
                        type="number"
                        id="elements.telecommandes.nombre"
                        name="elements.telecommandes.nombre"
                        value={formData.elements.telecommandes.nombre}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.telecommandes.detail" className="text-base font-medium">
                        Détail (usage)
                      </Label>
                      <Input
                        type="text"
                        id="elements.telecommandes.detail"
                        name="elements.telecommandes.detail"
                        value={formData.elements.telecommandes.detail}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Ex: portail, porte de garage"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Documents remis */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Documents remis</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="elements.documents.diagnostics" 
                        checked={formData.elements?.documents?.diagnostics || false}
                        onCheckedChange={(checked) => 
                          updateNestedFormField("elements.documents.diagnostics", checked === true)
                        }
                      />
                      <Label htmlFor="elements.documents.diagnostics" className="text-base">
                        Diagnostics techniques (DPE, amiante, etc.)
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="elements.documents.planLocaux" 
                        checked={formData.elements?.documents?.planLocaux || false}
                        onCheckedChange={(checked) => 
                          updateNestedFormField("elements.documents.planLocaux", checked === true)
                        }
                      />
                      <Label htmlFor="elements.documents.planLocaux" className="text-base">
                        Plan des locaux
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="elements.documents.reglementImmeuble" 
                        checked={formData.elements?.documents?.reglementImmeuble || false}
                        onCheckedChange={(checked) => 
                          updateNestedFormField("elements.documents.reglementImmeuble", checked === true)
                        }
                      />
                      <Label htmlFor="elements.documents.reglementImmeuble" className="text-base">
                        Règlement intérieur de l'immeuble
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="elements.documents.noticeMaintenance" 
                        checked={formData.elements?.documents?.noticeMaintenance || false}
                        onCheckedChange={(checked) => 
                          updateNestedFormField("elements.documents.noticeMaintenance", checked === true)
                        }
                      />
                      <Label htmlFor="elements.documents.noticeMaintenance" className="text-base">
                        Notices d'utilisation et de maintenance
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Zone pour noter des éléments supplémentaires */}
                <div className="space-y-2">
                  <Label htmlFor="elements.autresElements" className="text-base font-medium">
                    Autres éléments remis (précisez)
                  </Label>
                  <Textarea
                    id="elements.autresElements"
                    name="elements.autresElements"
                    value={formData.elements.autresElements || ""}
                    onChange={handleInputChange}
                    placeholder="Notez ici tous les autres éléments remis au locataire"
                    className="w-full min-h-[80px] text-base"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Compteurs */}
          {activeTab === 5 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Relevés des compteurs</h2>
              
              <div className="space-y-8">
                {/* Compteur électricité */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center mb-4">
                    <Checkbox 
                      id="compteurs.electricite.presence" 
                      checked={formData.compteurs.electricite.presence}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.electricite.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.electricite.presence" className="text-lg font-medium">
                      Compteur d'électricité
                    </Label>
                  </div>
                  
                  {formData.compteurs.electricite.presence && (
                    <div className="space-y-4 pl-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.electricite.numero" className="text-base font-medium">
                            Numéro du compteur
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.electricite.numero"
                            name="compteurs.electricite.numero"
                            value={formData.compteurs.electricite.numero}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 123456789"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.electricite.releve" className="text-base font-medium">
                            Relevé (kWh)
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.electricite.releve"
                            name="compteurs.electricite.releve"
                            value={formData.compteurs.electricite.releve}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 12345"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.electricite.puissance" className="text-base font-medium">
                            Puissance souscrite (kVA)
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.electricite.puissance"
                            name="compteurs.electricite.puissance"
                            value={formData.compteurs.electricite.puissance}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 9"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.electricite.localisation" className="text-base font-medium">
                            Localisation
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.electricite.localisation"
                            name="compteurs.electricite.localisation"
                            value={formData.compteurs.electricite.localisation}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: Dans l'entrée"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.electricite.observations" className="text-base font-medium">
                          Observations
                        </Label>
                        <Textarea
                          id="compteurs.electricite.observations"
                          name="compteurs.electricite.observations"
                          value={formData.compteurs.electricite.observations}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Notes sur l'état du compteur, accessibilité, etc."
                        />
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <Label className="text-base font-medium">
                          Photos du compteur
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {formData.compteurs.electricite.photos.map((photo, index) => (
                            <div key={`electricite-photo-${index}`} className="relative">
                              <Image
                                src={
                                  typeof photo === 'string' 
                                    ? photo 
                                    : ((photo as any)?.type === 'base64_metadata' || (photo as any)?.type === 'file_metadata') 
                                      ? ((photo as any)?.downloadUrl 
                                        ? (photo as any).downloadUrl 
                                        : (photo as any)?.preview 
                                          ? (photo as any).preview
                                          : PLACEHOLDER_IMAGE)
                                        : PLACEHOLDER_IMAGE
                                }
                                alt={`Photo ${index + 1}`}
                                width={120}
                                height={120}
                                className="object-cover rounded-md w-full h-24"
                                unoptimized={true}
                                onError={(e) => {
                                  console.log(`Erreur de chargement pour la photo ${index} :`, photo);
                                  if (typeof photo === 'object' && photo !== null) {
                                    // Essayer toutes les propriétés possibles qui pourraient contenir une URL
                                    const possibleUrls = [
                                      (photo as any).downloadUrl,
                                      (photo as any).url,
                                      (photo as any).fullUrl,
                                      (photo as any).preview,
                                      (photo as any).src,
                                      (photo as any).path
                                    ];
                                    
                                    // Trouver la première URL valide
                                    const validUrl = possibleUrls.find(url => 
                                      url && typeof url === 'string' && 
                                      (url.startsWith('http') || url.startsWith('data:'))
                                    );
                                    
                                    if (validUrl) {
                                      console.log(`Tentative de rechargement avec URL alternative: ${validUrl.substring(0, 30)}...`);
                                      (e.target as HTMLImageElement).src = validUrl;
                                    } else {
                                      console.log("Aucune URL valide trouvée dans l'objet photo");
                                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                    }
                                  } else {
                                    // Fallback sur une image par défaut
                                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                                onClick={() => handleRemovePhoto('compteurs.electricite.photos', index)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Bouton d'ajout de photo toujours visible */}
                          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md w-full h-24">
                            <label className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                              <Camera className="h-8 w-8 mb-1" />
                              <span className="text-xs">Ajouter</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handlePhotoUpload('compteurs.electricite.photos', e);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Compteur eau */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center mb-4">
                    <Checkbox 
                      id="compteurs.eau.presence" 
                      checked={formData.compteurs.eau.presence}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.eau.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.eau.presence" className="text-lg font-medium">
                      Compteur d'eau
                    </Label>
                  </div>
                  
                  {formData.compteurs.eau.presence && (
                    <div className="space-y-4 pl-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.eau.numero" className="text-base font-medium">
                            Numéro du compteur
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.eau.numero"
                            name="compteurs.eau.numero"
                            value={formData.compteurs.eau.numero}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 123456789"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.eau.releve" className="text-base font-medium">
                            Relevé (m³)
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.eau.releve"
                            name="compteurs.eau.releve"
                            value={formData.compteurs.eau.releve}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 123"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.eau.localisation" className="text-base font-medium">
                          Localisation
                        </Label>
                        <Input
                          type="text"
                          id="compteurs.eau.localisation"
                          name="compteurs.eau.localisation"
                          value={formData.compteurs.eau.localisation}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Ex: Dans la cave, local technique"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.eau.observations" className="text-base font-medium">
                          Observations
                        </Label>
                        <Textarea
                          id="compteurs.eau.observations"
                          name="compteurs.eau.observations"
                          value={formData.compteurs.eau.observations}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Notes sur l'état du compteur, accessibilité, etc."
                        />
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <Label className="text-base font-medium">
                          Photos du compteur
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {formData.compteurs.eau.photos.map((photo, index) => (
                            <div key={`eau-photo-${index}`} className="relative">
                              <Image
                                src={
                                  typeof photo === 'string' 
                                    ? photo 
                                    : ((photo as any)?.type === 'base64_metadata' || (photo as any)?.type === 'file_metadata') 
                                      ? ((photo as any)?.downloadUrl 
                                        ? (photo as any).downloadUrl 
                                        : (photo as any)?.preview 
                                          ? (photo as any).preview
                                          : PLACEHOLDER_IMAGE)
                                        : PLACEHOLDER_IMAGE
                                }
                                alt={`Photo ${index + 1}`}
                                width={120}
                                height={120}
                                className="object-cover rounded-md w-full h-24"
                                unoptimized={true}
                                onError={(e) => {
                                  console.log(`Erreur de chargement pour la photo ${index} :`, photo);
                                  if (typeof photo === 'object' && photo !== null) {
                                    // Essayer toutes les propriétés possibles qui pourraient contenir une URL
                                    const possibleUrls = [
                                      (photo as any).downloadUrl,
                                      (photo as any).url,
                                      (photo as any).fullUrl,
                                      (photo as any).preview,
                                      (photo as any).src,
                                      (photo as any).path
                                    ];
                                    
                                    // Trouver la première URL valide
                                    const validUrl = possibleUrls.find(url => 
                                      url && typeof url === 'string' && 
                                      (url.startsWith('http') || url.startsWith('data:'))
                                    );
                                    
                                    if (validUrl) {
                                      console.log(`Tentative de rechargement avec URL alternative: ${validUrl.substring(0, 30)}...`);
                                      (e.target as HTMLImageElement).src = validUrl;
                                    } else {
                                      console.log("Aucune URL valide trouvée dans l'objet photo");
                                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                    }
                                  } else {
                                    // Fallback sur une image par défaut
                                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                                onClick={() => handleRemovePhoto('compteurs.eau.photos', index)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Bouton d'ajout de photo toujours visible */}
                          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md w-full h-24">
                            <label className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                              <Camera className="h-8 w-8 mb-1" />
                              <span className="text-xs">Ajouter</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handlePhotoUpload('compteurs.eau.photos', e);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Compteur gaz */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center mb-4">
                    <Checkbox 
                      id="compteurs.gaz.presence" 
                      checked={formData.compteurs.gaz.presence}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.gaz.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.gaz.presence" className="text-lg font-medium">
                      Compteur de gaz
                    </Label>
                  </div>
                  
                  {formData.compteurs.gaz.presence && (
                    <div className="space-y-4 pl-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.gaz.numero" className="text-base font-medium">
                            Numéro du compteur
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.gaz.numero"
                            name="compteurs.gaz.numero"
                            value={formData.compteurs.gaz.numero}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 123456789"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.gaz.releve" className="text-base font-medium">
                            Relevé (m³)
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.gaz.releve"
                            name="compteurs.gaz.releve"
                            value={formData.compteurs.gaz.releve}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Ex: 1234"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.gaz.localisation" className="text-base font-medium">
                          Localisation
                        </Label>
                        <Input
                          type="text"
                          id="compteurs.gaz.localisation"
                          name="compteurs.gaz.localisation"
                          value={formData.compteurs.gaz.localisation}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Ex: Dans le local technique"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.gaz.observations" className="text-base font-medium">
                          Observations
                        </Label>
                        <Textarea
                          id="compteurs.gaz.observations"
                          name="compteurs.gaz.observations"
                          value={formData.compteurs.gaz.observations}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Notes sur l'état du compteur, accessibilité, etc."
                        />
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <Label className="text-base font-medium">
                          Photos du compteur
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {formData.compteurs.gaz.photos.map((photo, index) => (
                            <div key={`gaz-photo-${index}`} className="relative">
                              <Image
                                src={
                                  typeof photo === 'string' 
                                    ? photo 
                                    : ((photo as any)?.type === 'base64_metadata' || (photo as any)?.type === 'file_metadata') 
                                      ? ((photo as any)?.downloadUrl 
                                        ? (photo as any).downloadUrl 
                                        : (photo as any)?.preview 
                                          ? (photo as any).preview
                                          : PLACEHOLDER_IMAGE)
                                        : PLACEHOLDER_IMAGE
                                }
                                alt={`Photo ${index + 1}`}
                                width={120}
                                height={120}
                                className="object-cover rounded-md w-full h-24"
                                unoptimized={true}
                                onError={(e) => {
                                  console.log(`Erreur de chargement pour la photo ${index} :`, photo);
                                  if (typeof photo === 'object' && photo !== null) {
                                    // Essayer toutes les propriétés possibles qui pourraient contenir une URL
                                    const possibleUrls = [
                                      (photo as any).downloadUrl,
                                      (photo as any).url,
                                      (photo as any).fullUrl,
                                      (photo as any).preview,
                                      (photo as any).src,
                                      (photo as any).path
                                    ];
                                    
                                    // Trouver la première URL valide
                                    const validUrl = possibleUrls.find(url => 
                                      url && typeof url === 'string' && 
                                      (url.startsWith('http') || url.startsWith('data:'))
                                    );
                                    
                                    if (validUrl) {
                                      console.log(`Tentative de rechargement avec URL alternative: ${validUrl.substring(0, 30)}...`);
                                      (e.target as HTMLImageElement).src = validUrl;
                                    } else {
                                      console.log("Aucune URL valide trouvée dans l'objet photo");
                                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                    }
                                  } else {
                                    // Fallback sur une image par défaut
                                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                                onClick={() => handleRemovePhoto('compteurs.gaz.photos', index)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Bouton d'ajout de photo toujours visible */}
                          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md w-full h-24">
                            <label className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                              <Camera className="h-8 w-8 mb-1" />
                              <span className="text-xs">Ajouter</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handlePhotoUpload('compteurs.gaz.photos', e);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Pièces */}
          {activeTab === 6 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">État des lieux par pièce</h2>
              
              <div className="space-y-8">
                {/* Liste des pièces */}
                {formData.pieces.map((piece, pieceIndex) => (
                  <div key={piece.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-medium">{piece.nom}</span>
                        <Input
                          type="text"
                          value={piece.nom}
                          onChange={(e) => {
                            const newPieces = [...formData.pieces];
                            newPieces[pieceIndex].nom = e.target.value;
                            updateFormField("pieces", newPieces);
                          }}
                          className="ml-2 w-40 text-base"
                          placeholder="Nom de la pièce"
                        />
                      </div>
                      
                      {pieceIndex > 0 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveRoom(pieceIndex)}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {/* Sols */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Sols</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.sols.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.sols.nature`}
                              name={`pieces.${pieceIndex}.sols.nature`}
                              value={piece.sols.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].sols.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Carrelage, parquet, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.sols.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.sols.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.sols.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.sols.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.sols.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.sols.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.sols.observations`}
                              name={`pieces.${pieceIndex}.sols.observations`}
                              value={piece.sols.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].sols.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des sols"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Murs */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Murs</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.murs.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.murs.nature`}
                              name={`pieces.${pieceIndex}.murs.nature`}
                              value={piece.murs.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].murs.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Peinture, papier peint, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.murs.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.murs.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.murs.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.murs.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.murs.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.murs.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.murs.observations`}
                              name={`pieces.${pieceIndex}.murs.observations`}
                              value={piece.murs.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].murs.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des murs"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Plafonds */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Plafonds</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plafonds.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.plafonds.nature`}
                              name={`pieces.${pieceIndex}.plafonds.nature`}
                              value={piece.plafonds.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].plafonds.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Peinture, dalles, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plafonds.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plafonds.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plafonds.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plafonds.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plafonds.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plafonds.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.plafonds.observations`}
                              name={`pieces.${pieceIndex}.plafonds.observations`}
                              value={piece.plafonds.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].plafonds.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des plafonds"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Plinthes */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Plinthes</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plinthes.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.plinthes.nature`}
                              name={`pieces.${pieceIndex}.plinthes.nature`}
                              value={piece.plinthes.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].plinthes.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Bois, carrelage, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plinthes.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plinthes.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plinthes.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plinthes.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.plinthes.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.plinthes.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.plinthes.observations`}
                              name={`pieces.${pieceIndex}.plinthes.observations`}
                              value={piece.plinthes.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].plinthes.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des plinthes"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Fenêtres */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Fenêtres</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.fenetres.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.fenetres.nature`}
                              name={`pieces.${pieceIndex}.fenetres.nature`}
                              value={piece.fenetres.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].fenetres.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: PVC, aluminium, bois, double vitrage, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.fenetres.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.fenetres.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.fenetres.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.fenetres.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.fenetres.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.fenetres.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.fenetres.observations`}
                              name={`pieces.${pieceIndex}.fenetres.observations`}
                              value={piece.fenetres.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].fenetres.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des fenêtres"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Portes */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Portes</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.portes.nature`} className="text-sm font-medium">
                              Nature
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.portes.nature`}
                              name={`pieces.${pieceIndex}.portes.nature`}
                              value={piece.portes.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].portes.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Bois, métal, vitrée, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.portes.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.portes.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.portes.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.portes.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.portes.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.portes.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.portes.observations`}
                              name={`pieces.${pieceIndex}.portes.observations`}
                              value={piece.portes.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].portes.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des portes"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Chauffage */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Chauffage</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.chauffage.nature`} className="text-sm font-medium">
                              Type de chauffage
                            </Label>
                            <Input
                              type="text"
                              id={`pieces.${pieceIndex}.chauffage.nature`}
                              name={`pieces.${pieceIndex}.chauffage.nature`}
                              value={piece.chauffage.nature}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].chauffage.nature = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Ex: Radiateur électrique, gaz, climatisation, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.chauffage.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.chauffage.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.chauffage.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.chauffage.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.chauffage.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.chauffage.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.chauffage.observations`}
                              name={`pieces.${pieceIndex}.chauffage.observations`}
                              value={piece.chauffage.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].chauffage.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état du chauffage"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Prises électriques */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Prises électriques</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.prises.nombre`} className="text-sm font-medium">
                              Nombre de prises
                            </Label>
                            <Input
                              type="number"
                              id={`pieces.${pieceIndex}.prises.nombre`}
                              name={`pieces.${pieceIndex}.prises.nombre`}
                              value={piece.prises.nombre}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].prises.nombre = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.prises.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.prises.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].prises.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.prises.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].prises.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.prises.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].prises.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.prises.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].prises.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.prises.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.prises.observations`}
                              name={`pieces.${pieceIndex}.prises.observations`}
                              value={piece.prises.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].prises.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des prises électriques"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Interrupteurs */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Interrupteurs</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.interrupteurs.nombre`} className="text-sm font-medium">
                              Nombre d'interrupteurs
                            </Label>
                            <Input
                              type="number"
                              id={`pieces.${pieceIndex}.interrupteurs.nombre`}
                              name={`pieces.${pieceIndex}.interrupteurs.nombre`}
                              value={piece.interrupteurs.nombre}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].interrupteurs.nombre = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.interrupteurs.etat`} className="text-sm font-medium">
                              État
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Button
                                type="button"
                                className={`flex-1 ${piece.interrupteurs.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].interrupteurs.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.interrupteurs.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].interrupteurs.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon état
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.interrupteurs.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].interrupteurs.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                État d'usage
                              </Button>
                              <Button
                                type="button"
                                className={`flex-1 ${piece.interrupteurs.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].interrupteurs.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais état
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`pieces.${pieceIndex}.interrupteurs.observations`} className="text-sm font-medium">
                              Observations
                            </Label>
                            <Textarea
                              id={`pieces.${pieceIndex}.interrupteurs.observations`}
                              name={`pieces.${pieceIndex}.interrupteurs.observations`}
                              value={piece.interrupteurs.observations}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].interrupteurs.observations = e.target.value;
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              placeholder="Observations sur l'état des interrupteurs"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Équipements personnalisés */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Éléments personnalisés</h3>
                        
                        {piece.equipements.map((equipement, equipementIndex) => (
                          <div key={equipement.id || equipementIndex} className="mb-4 p-3 border border-gray-200 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium">Élément {equipementIndex + 1}</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEquipment(pieceIndex, equipementIndex)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipementIndex}.nom`} className="text-sm font-medium">
                                  Nom de l'équipement
                                </Label>
                                <Input
                                  type="text"
                                  id={`pieces.${pieceIndex}.equipements.${equipementIndex}.nom`}
                                  name={`pieces.${pieceIndex}.equipements.${equipementIndex}.nom`}
                                  value={equipement.nom}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    newPieces[pieceIndex].equipements[equipementIndex].nom = e.target.value;
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-sm"
                                  placeholder="Ex: Climatisation, Placard, Étagère..."
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipementIndex}.etat`} className="text-sm font-medium">
                                  État
                                </Label>
                                <div className="flex gap-2 mt-1">
                                  <Button
                                    type="button"
                                    className={`flex-1 ${equipement.etat === "Très bon état" ? "bg-green-600" : "bg-gray-200 text-gray-800"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      newPieces[pieceIndex].equipements[equipementIndex].etat = "Très bon état";
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Très bon état
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`flex-1 ${equipement.etat === "Bon état" ? "bg-blue-600" : "bg-gray-200 text-gray-800"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      newPieces[pieceIndex].equipements[equipementIndex].etat = "Bon état";
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Bon état
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`flex-1 ${equipement.etat === "État d'usage" ? "bg-orange-600" : "bg-gray-200 text-gray-800"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      newPieces[pieceIndex].equipements[equipementIndex].etat = "État d'usage";
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    État d'usage
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`flex-1 ${equipement.etat === "Mauvais état" ? "bg-red-600" : "bg-gray-200 text-gray-800"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      newPieces[pieceIndex].equipements[equipementIndex].etat = "Mauvais état";
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Mauvais état
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipementIndex}.observations`} className="text-sm font-medium">
                                  Observations
                                </Label>
                                <Textarea
                                  id={`pieces.${pieceIndex}.equipements.${equipementIndex}.observations`}
                                  name={`pieces.${pieceIndex}.equipements.${equipementIndex}.observations`}
                                  value={equipement.observations}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    newPieces[pieceIndex].equipements[equipementIndex].observations = e.target.value;
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-sm"
                                  placeholder="Observations sur l'état de l'équipement"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          onClick={(e) => {
                            // Empêcher la propagation de l'événement
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Appeler directement la fonction d'ajout sans désactiver le bouton
                            // La fonction handleAddEquipment a maintenant son propre mécanisme de verrouillage
                            handleAddEquipment(pieceIndex);
                          }}
                          className="w-full mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un élément
                        </Button>
                      </div>
                      
                      {/* Observations générales de la pièce */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Observations générales</h3>
                        <Textarea
                          id={`pieces.${pieceIndex}.observations`}
                          name={`pieces.${pieceIndex}.observations`}
                          value={piece.observations}
                          onChange={(e) => {
                            const newPieces = [...formData.pieces];
                            newPieces[pieceIndex].observations = e.target.value;
                            updateFormField("pieces", newPieces);
                          }}
                          className="w-full min-h-[100px] text-sm"
                          placeholder="Observations générales sur la pièce"
                        />
                      </div>
                      
                      {/* Photos de la pièce */}
                      <div className="space-y-2">
                        <Label className="text-base font-medium">
                          Photos de la pièce
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {piece.photos.map((photo, photoIndex) => (
                            <div key={`piece-${pieceIndex}-photo-${photoIndex}`} className="relative">
                              <Image
                                src={
                                  typeof photo === 'string' 
                                    ? photo 
                                    : ((photo as any)?.type === 'base64_metadata' || (photo as any)?.type === 'file_metadata') 
                                      ? ((photo as any)?.downloadUrl 
                                        ? (photo as any).downloadUrl 
                                        : (photo as any)?.source 
                                          ? `${(photo as any).source}...`
                                          : PLACEHOLDER_IMAGE)
                                      : PLACEHOLDER_IMAGE
                                }
                                alt={`Photo ${photoIndex + 1}`}
                                width={120}
                                height={120}
                                className="object-cover rounded-md w-full h-24"
                                unoptimized={true}
                                onError={(e) => {
                                  console.log(`Erreur de chargement pour la photo ${photoIndex} :`, photo);
                                  if (typeof photo === 'object' && (photo as any)?.downloadUrl) {
                                    console.log(`Tentative de rechargement avec l'URL directe: ${(photo as any).downloadUrl}`);
                                    // Réessayer avec l'URL directe en cas d'échec
                                    (e.target as HTMLImageElement).src = (photo as any).downloadUrl;
                                  } else {
                                    // Fallback sur une image par défaut
                                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                                onClick={() => handleRemovePhoto(`pieces.${pieceIndex}.photos`, photoIndex)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Bouton d'ajout de photo toujours visible */}
                          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md w-full h-24">
                            <label className="flex flex-col items-center justify-center p-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                              <Camera className="h-8 w-8 mb-1" />
                              <span className="text-xs">Ajouter</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handlePhotoUpload(`pieces.${pieceIndex}.photos`, e);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Bouton pour ajouter une pièce */}
                <Button
                  type="button"
                  onClick={(e) => {
                    // Empêcher la propagation de l'événement
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Appeler directement la fonction d'ajout sans désactiver le bouton
                    // La fonction handleAddRoom a maintenant son propre mécanisme de verrouillage
                    handleAddRoom();
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une pièce
                </Button>
              </div>
            </div>
          )}
          
          {/* Sauvegarde du formulaire */}
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-4 border-t shadow-md">
            <div className="flex justify-between items-center gap-2">
              {/* Boutons de navigation */}
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
                disabled={activeTab === 0}
              >
                Précédent
              </Button>
              
              {activeTab < tabs.length - 1 ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    // Empêcher toute propagation de l'événement qui pourrait déclencher une soumission
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log("======= BOUTON SUIVANT CLIQUÉ =======");
                    console.log("Onglet actif avant:", activeTab);
                    console.log("Onglet cible:", Math.min(tabs.length - 1, activeTab + 1));
                    
                    // Mise à jour de l'onglet actif
                    setActiveTab(Math.min(tabs.length - 1, activeTab + 1));
                    
                    console.log("Navigation terminée");
                  }}
                >
                  Suivant
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    // Vérification supplémentaire avant soumission
                    console.log("Bouton Terminer cliqué");
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Terminer
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 