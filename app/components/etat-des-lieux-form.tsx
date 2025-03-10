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
import { ChevronDown, ChevronUp, Camera, X, Plus, Save, FileText, Check } from "lucide-react"
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
    if (onProgressUpdate) {
      onProgressUpdate(progress || 0);
    }
  }, [formData, onProgressUpdate, progress])
  
  // Rendu du formulaire
  return (
    <div className="bg-white rounded-lg shadow-sm w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sections principales du formulaire - réduire les paddings sur mobile */}
        <div className="px-1.5 sm:px-4 py-4">
          {/* Contenu inchangé mais avec moins de padding */}
          {/* ... */}
        </div>
      </form>
    </div>
  )
} 