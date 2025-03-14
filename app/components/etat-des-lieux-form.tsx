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
    raisonSociale: string
    civilite: string
    nom: string
    prenom: string
    representant: string
    adresse: string
    codePostal: string
    ville: string
    telephone: string
    email: string
  }
  locataire: {
    raisonSociale: string
    civilite: string
    nom: string
    prenom: string
    representant: string
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
    dureeContrat: string
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
      testable?: boolean
    }
    electricite: {
      testable?: boolean
      prisesMurales: {
        nombre: string
        etat: string
        observations: string
      }
      prisesRJ45: {
        nombre: string
        etat: string
        observations: string
      }
      interrupteurs: {
        nombre: string
        etat: string
        observations: string
      }
      observations: string
    }
    luminaires: {
      spots: {
        nombre: string
        etat: string
        observations: string
      }
      suspensions: {
        nombre: string
        etat: string
        observations: string
      }
      dallesLumineuses: {
        nombre: string
        etat: string
        observations: string
      }
      neons: {
        nombre: string
        etat: string
        observations: string
      }
      observations: string
    }
    // Garder les anciens champs pour la rétrocompatibilité
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
      nature: string
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
        raisonSociale: initialData?.bailleur?.raisonSociale || "",
        civilite: initialData?.bailleur?.civilite || "",
        nom: initialData?.bailleur?.nom || "",
        prenom: initialData?.bailleur?.prenom || "",
        representant: initialData?.bailleur?.representant || "",
        adresse: initialData?.bailleur?.adresse || "",
        codePostal: initialData?.bailleur?.codePostal || "",
        ville: initialData?.bailleur?.ville || "",
        telephone: initialData?.bailleur?.telephone || "",
        email: initialData?.bailleur?.email || "",
      },
      
      locataire: {
        raisonSociale: initialData?.locataire?.raisonSociale || "",
        civilite: initialData?.locataire?.civilite || "",
        nom: initialData?.locataire?.nom || "",
        prenom: initialData?.locataire?.prenom || "",
        representant: initialData?.locataire?.representant || "",
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
        dureeContrat: initialData?.contrat?.dureeContrat || "",
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
          electricite: {
            testable: false,
            prisesMurales: {
              nombre: "",
              etat: "",
              observations: "",
            },
            prisesRJ45: {
              nombre: "",
              etat: "",
              observations: "",
            },
            interrupteurs: {
              nombre: "",
              etat: "",
              observations: "",
            },
            observations: "",
          },
          luminaires: {
            spots: {
              nombre: "",
              etat: "",
              observations: "",
            },
            suspensions: {
              nombre: "",
              etat: "",
              observations: "",
            },
            dallesLumineuses: {
              nombre: "",
              etat: "",
              observations: "",
            },
            neons: {
              nombre: "",
              etat: "",
              observations: "",
            },
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
    const { name, value } = e.target;
    
    // Traitement spécial pour la date qui doit toujours avoir une valeur
    if (name === "dateEtatDesLieux" && value === "") {
      updateFormField(name, getTodayDate());
      return;
    }
    
    updateFormField(name, value);
  };
  
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
      input.setAttribute('capture', 'environment'); // Ajouter l'attribut capture pour utiliser l'appareil photo
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
  
  // Fonction utilitaire pour créer une copie sécurisée de formData.pieces
  const safeClonePieces = () => {
    return Array.isArray(formData.pieces) ? [...formData.pieces] : [];
  };
  
  // Gérer l'ajout d'une pièce
  const handleAddRoom = () => {
    const newPiece = {
      id: `piece_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      nom: `Pièce ${Array.isArray(formData.pieces) ? formData.pieces.length + 1 : 1}`,
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
      electricite: {
        testable: false,
        prisesMurales: {
          nombre: "",
          etat: "",
          observations: "",
        },
        prisesRJ45: {
          nombre: "",
          etat: "",
          observations: "",
        },
        interrupteurs: {
          nombre: "",
          etat: "",
          observations: "",
        },
        observations: "",
      },
      luminaires: {
        spots: {
          nombre: "",
          etat: "",
          observations: "",
        },
        suspensions: {
          nombre: "",
          etat: "",
          observations: "",
        },
        dallesLumineuses: {
          nombre: "",
          etat: "",
          observations: "",
        },
        neons: {
          nombre: "",
          etat: "",
          observations: "",
        },
        observations: "",
      },
      prises: {
        nombre: "",
        etat: "",
        observations: "",
      },
      interrupteurs: {
        nombre: "",
        etat: "",
        observations: "",
      },
      equipements: [],
      photos: [],
      observations: "",
    };
    
    const newPieces = Array.isArray(formData.pieces) ? [...formData.pieces, newPiece] : [newPiece];
    updateFormField("pieces", newPieces);
  };
  
  // Gérer la suppression d'une pièce
  const handleRemoveRoom = (index: number) => {
    if (index === 0) return; // Empêcher la suppression de la première pièce
    
    if (!Array.isArray(formData.pieces)) return;
    
    const newPieces = [...formData.pieces];
    newPieces.splice(index, 1);
    updateFormField("pieces", newPieces);
  };
  
  // Ajouter un objet pour suivre les verrous d'ajout d'équipement par pièce
  // const equipmentLocks = useRef<Record<string, boolean>>({});
  
  // Gérer l'ajout d'un équipement à une pièce
  const handleAddEquipment = (pieceIndex: number) => {
    const newEquipment = {
      id: `equip_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      nom: "",
      nature: "",
      etat: "",
      observations: "",
    };
    
    const newPieces = safeClonePieces();
    if (newPieces[pieceIndex] && Array.isArray(newPieces[pieceIndex].equipements)) {
      newPieces[pieceIndex].equipements.push(newEquipment);
    } else if (newPieces[pieceIndex]) {
      newPieces[pieceIndex].equipements = [newEquipment];
    }
    
    updateFormField("pieces", newPieces);
  };
  
  // Gérer la suppression d'un équipement
  const handleRemoveEquipment = (pieceIndex: number, equipmentIndex: number) => {
    const newPieces = safeClonePieces();
    if (newPieces[pieceIndex] && Array.isArray(newPieces[pieceIndex].equipements)) {
      newPieces[pieceIndex].equipements.splice(equipmentIndex, 1);
      updateFormField("pieces", newPieces);
    }
  };
  
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
  
  // Fonction pour générer un PDF
  const handleGeneratePDF = () => {
    console.log("Génération du PDF demandée")
    try {
      // Utiliser la même logique que handleSubmit pour générer le rapport
      const rapport = generateReport()
      onRapportGenerated(rapport, formData)
      
      toast({
        title: "Succès",
        description: "Le rapport PDF a été généré avec succès",
        variant: "default",
      })
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération du PDF",
        variant: "destructive",
      })
    }
  }
  
  // Mettre à jour la progression quand les données changent
  useEffect(() => {
    calculateProgress()
    onProgressUpdate?.(formData)
  }, [formData, onProgressUpdate])
  
  // Fonction pour gérer les erreurs de chargement d'images Firebase Storage
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, photo: any) => {
    console.log("Erreur de chargement d'image détectée");
    const imgElement = e.target as HTMLImageElement;
    
    // Vérifier si l'image est une URL Firebase Storage
    if (typeof photo === 'string' && photo.includes('firebasestorage.googleapis.com')) {
      console.log("URL Firebase Storage détectée:", photo.substring(0, 100) + "...");
      
      // Essayer de convertir l'image en base64 via un canvas
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        console.log("Image Firebase chargée avec succès via crossOrigin");
        try {
          // Créer un canvas pour convertir l'image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Dessiner l'image sur le canvas
            ctx.drawImage(img, 0, 0);
            
            // Convertir en base64
            const dataUrl = canvas.toDataURL('image/jpeg');
            imgElement.src = dataUrl;
          } else {
            console.warn("Impossible de créer le contexte du canvas");
            imgElement.src = PLACEHOLDER_IMAGE;
          }
        } catch (error) {
          console.error("Erreur lors de la conversion en base64:", error);
          imgElement.src = PLACEHOLDER_IMAGE;
        }
      };
      
      img.onerror = () => {
        console.warn("Échec du chargement de l'image Firebase même avec crossOrigin");
        imgElement.src = PLACEHOLDER_IMAGE;
      };
      
      // Ajouter un timestamp pour éviter le cache
      const urlWithTimestamp = `${photo}&t=${Date.now()}`;
      img.src = urlWithTimestamp;
    } else if (typeof photo === 'object' && photo !== null) {
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
        
        // Si c'est une URL Firebase Storage, utiliser la même approche que ci-dessus
        if (validUrl.includes('firebasestorage.googleapis.com')) {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                imgElement.src = dataUrl;
              } else {
                imgElement.src = PLACEHOLDER_IMAGE;
              }
            } catch (error) {
              imgElement.src = PLACEHOLDER_IMAGE;
            }
          };
          
          img.onerror = () => {
            imgElement.src = PLACEHOLDER_IMAGE;
          };
          
          const urlWithTimestamp = `${validUrl}&t=${Date.now()}`;
          img.src = urlWithTimestamp;
        } else {
          imgElement.src = validUrl;
        }
      } else {
        console.log("Aucune URL valide trouvée dans l'objet photo");
        imgElement.src = PLACEHOLDER_IMAGE;
      }
    } else {
      // Fallback sur une image par défaut
      imgElement.src = PLACEHOLDER_IMAGE;
    }
  };
  
  // Rendu du formulaire
  return (
    <div className="container mx-auto pb-safe main-content">
      <div className="flex flex-col gap-6 p-2 sm:p-4">
        {/* Navigation par onglets */}
        <div className="flex overflow-x-auto py-2 gap-1 sm:gap-3 no-scrollbar -mx-2 px-2 section-navigation section-tabs">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex flex-col items-center justify-center min-w-[4.5rem] sm:min-w-24 px-1 sm:px-2 py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all duration-200
                ${activeTab === index 
                  ? 'bg-[#DC0032] text-white font-medium shadow-sm' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200'
                }`}
              aria-selected={activeTab === index}
              role="tab"
            >
              <div className="text-center">
                <div className="font-medium">{tab.icon}</div>
                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm">{tab.title}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Contenu du formulaire */}
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <div className={activeTab === 0 ? "" : "hidden"}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Type d'état des lieux</h2>
              </div>
              <div className="p-6 space-y-6">
          {/* Type d'état des lieux */}
                <div className="space-y-3">
                    <Label className="text-base font-medium">Type d'état des lieux</Label>
                    <RadioGroup
                    name="typeEtatDesLieux"
                      value={formData.typeEtatDesLieux}
                    onValueChange={(value) => updateFormField("typeEtatDesLieux", value)}
                    className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                      <RadioGroupItem value="entree" id="typeEtatDesLieux-entree" className="text-[#DC0032]" />
                      <Label htmlFor="typeEtatDesLieux-entree" className="text-base">Entrée</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sortie" id="typeEtatDesLieux-sortie" className="text-[#DC0032]" />
                      <Label htmlFor="typeEtatDesLieux-sortie" className="text-base">Sortie</Label>
                      </div>
                    </RadioGroup>
                  </div>

                {/* Date de l'état des lieux */}
                <div className="space-y-3">
                  <Label htmlFor="dateEtatDesLieux" className="text-base font-medium">
                    Date de l'état des lieux
                  </Label>
                    <Input
                      type="date"
                      id="dateEtatDesLieux"
                      name="dateEtatDesLieux"
                      value={formData.dateEtatDesLieux || getTodayDate()}
                      onChange={handleInputChange}
                    className="w-full text-base border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
            </div>
          </div>

          {/* Informations sur le bien */}
          <div className={activeTab === 1 ? "" : "hidden"}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Informations sur le bien</h2>
                </div>
              <div className="p-6 space-y-6">
                {/* Type de bien */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Type de bien</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="typeBien-bureau" 
                          checked={Array.isArray(formData.typeBien) && formData.typeBien.includes("bureau")} 
                          onCheckedChange={(checked) => {
                            const newTypeBien = Array.isArray(formData.typeBien) ? [...formData.typeBien] : [];
                            if (checked) {
                              if (!newTypeBien.includes("bureau")) newTypeBien.push("bureau");
                            } else {
                              const index = newTypeBien.indexOf("bureau");
                              if (index !== -1) newTypeBien.splice(index, 1);
                            }
                            updateFormField("typeBien", newTypeBien);
                          }}
                          className="data-[state=checked]:bg-[#DC0032] data-[state=checked]:border-[#DC0032]"
                        />
                        <Label htmlFor="typeBien-bureau">Bureau</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="typeBien-entrepot" 
                          checked={Array.isArray(formData.typeBien) && formData.typeBien.includes("entrepot")} 
                          onCheckedChange={(checked) => {
                            const newTypeBien = Array.isArray(formData.typeBien) ? [...formData.typeBien] : [];
                            if (checked) {
                              if (!newTypeBien.includes("entrepot")) newTypeBien.push("entrepot");
                            } else {
                              const index = newTypeBien.indexOf("entrepot");
                              if (index !== -1) newTypeBien.splice(index, 1);
                            }
                            updateFormField("typeBien", newTypeBien);
                          }}
                          className="data-[state=checked]:bg-[#DC0032] data-[state=checked]:border-[#DC0032]"
                        />
                        <Label htmlFor="typeBien-entrepot">Entrepôt</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="typeBien-local-activite" 
                          checked={Array.isArray(formData.typeBien) && formData.typeBien.includes("local-activite")} 
                          onCheckedChange={(checked) => {
                            const newTypeBien = Array.isArray(formData.typeBien) ? [...formData.typeBien] : [];
                            if (checked) {
                              if (!newTypeBien.includes("local-activite")) newTypeBien.push("local-activite");
                            } else {
                              const index = newTypeBien.indexOf("local-activite");
                              if (index !== -1) newTypeBien.splice(index, 1);
                            }
                            updateFormField("typeBien", newTypeBien);
                          }}
                          className="data-[state=checked]:bg-[#DC0032] data-[state=checked]:border-[#DC0032]"
                        />
                        <Label htmlFor="typeBien-local-activite">Local d'activité</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="typeBien-local-commercial" 
                          checked={Array.isArray(formData.typeBien) && formData.typeBien.includes("local-commercial")} 
                          onCheckedChange={(checked) => {
                            const newTypeBien = Array.isArray(formData.typeBien) ? [...formData.typeBien] : [];
                            if (checked) {
                              if (!newTypeBien.includes("local-commercial")) newTypeBien.push("local-commercial");
                            } else {
                              const index = newTypeBien.indexOf("local-commercial");
                              if (index !== -1) newTypeBien.splice(index, 1);
                            }
                            updateFormField("typeBien", newTypeBien);
                          }}
                          className="data-[state=checked]:bg-[#DC0032] data-[state=checked]:border-[#DC0032]"
                        />
                        <Label htmlFor="typeBien-local-commercial">Local commercial</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="adresseBien" className="text-base font-medium">
                      Adresse
                    </Label>
                    <Input
                      type="text"
                      id="adresseBien"
                      name="adresseBien"
                      value={formData.adresseBien}
                      onChange={handleInputChange}
                      className="w-full text-base border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="codePostalBien" className="text-base font-medium">
                        Code postal
                      </Label>
                      <Input
                        type="text"
                        id="codePostalBien"
                        name="codePostalBien"
                        value={formData.codePostalBien}
                        onChange={handleInputChange}
                        className="w-full text-base border-gray-300 rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="villeBien" className="text-base font-medium">
                        Ville
                      </Label>
                      <Input
                        type="text"
                        id="villeBien"
                        name="villeBien"
                        value={formData.villeBien}
                        onChange={handleInputChange}
                        className="w-full text-base border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="superficieBien" className="text-base font-medium">
                      Superficie (m²)
                    </Label>
                    <Input
                      type="text"
                      id="superficieBien"
                      name="superficieBien"
                      value={formData.superficieBien || ""}
                      onChange={handleInputChange}
                      className="w-full text-base border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
            </div>
          </div>

          {/* Parties */}
          {activeTab === 2 && (
            <div className="bg-card p-4 rounded-lg shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">Parties au contrat</h2>
              
              <div className="space-y-6">
                {/* Bailleur */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Bailleur / Propriétaire</h3>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="bailleur.raisonSociale" className="text-base font-medium">
                      Raison sociale
                    </Label>
                    <Input
                      type="text"
                      id="bailleur.raisonSociale"
                      name="bailleur.raisonSociale"
                      value={formData.bailleur?.raisonSociale || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Raison sociale"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="bailleur.representant" className="text-base font-medium">
                      Représenté par
                    </Label>
                    <Input
                      type="text"
                      id="bailleur.representant"
                      name="bailleur.representant"
                      value={formData.bailleur?.representant || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Représentant"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="bailleur.civilite" className="text-base font-medium">
                      Civilité
                    </Label>
                    <Select
                      value={formData.bailleur?.civilite || ""}
                      onValueChange={(value) => handleSelectChange("bailleur.civilite", value)}
                    >
                      <SelectTrigger id="bailleur.civilite" className="w-full text-base">
                        <SelectValue placeholder="Sélectionner une civilité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M.">M.</SelectItem>
                        <SelectItem value="Mme">Mme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bailleur.nom" className="text-base font-medium">
                        Nom
                      </Label>
                      <Input
                        type="text"
                        id="bailleur.nom"
                        name="bailleur.nom"
                        value={formData.bailleur?.nom || ""}
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
                        value={formData.bailleur?.prenom || ""}
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
                      value={formData.bailleur?.adresse || ""}
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
                        value={formData.bailleur?.codePostal || ""}
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
                        value={formData.bailleur?.ville || ""}
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
                        value={formData.bailleur?.telephone || ""}
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
                        value={formData.bailleur?.email || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse email"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Locataire */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Locataire / Preneur</h3>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="locataire.raisonSociale" className="text-base font-medium">
                      Raison sociale
                    </Label>
                    <Input
                      type="text"
                      id="locataire.raisonSociale"
                      name="locataire.raisonSociale"
                      value={formData.locataire?.raisonSociale || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Raison sociale"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="locataire.representant" className="text-base font-medium">
                      Représenté par
                    </Label>
                    <Input
                      type="text"
                      id="locataire.representant"
                      name="locataire.representant"
                      value={formData.locataire?.representant || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                      placeholder="Représentant"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="locataire.civilite" className="text-base font-medium">
                      Civilité
                    </Label>
                    <Select
                      value={formData.locataire?.civilite || ""}
                      onValueChange={(value) => handleSelectChange("locataire.civilite", value)}
                    >
                      <SelectTrigger id="locataire.civilite" className="w-full text-base">
                        <SelectValue placeholder="Sélectionner une civilité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M.">M.</SelectItem>
                        <SelectItem value="Mme">Mme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="locataire.nom" className="text-base font-medium">
                        Nom
                      </Label>
                      <Input
                        type="text"
                        id="locataire.nom"
                        name="locataire.nom"
                        value={formData.locataire?.nom || ""}
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
                        value={formData.locataire?.prenom || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Prénom du locataire"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                      <Label htmlFor="locataire.telephone" className="text-base font-medium">
                        Téléphone
                      </Label>
                      <Input
                        type="tel"
                        id="locataire.telephone"
                        name="locataire.telephone"
                        value={formData.locataire?.telephone || ""}
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
                        value={formData.locataire?.email || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse email"
                      />
                  </div>
                  
                  <div className="space-y-2 mt-4">
                      <Label htmlFor="locataire.adresse" className="text-base font-medium">
                        Adresse
                      </Label>
                      <Input
                        type="text"
                        id="locataire.adresse"
                        name="locataire.adresse"
                        value={formData.locataire?.adresse || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Adresse du locataire"
                      />
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
                        value={formData.locataire?.codePostal || ""}
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
                        value={formData.locataire?.ville || ""}
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
                      checked={formData.mandataire?.present || false}
                      onCheckedChange={(checked) => 
                        updateFormField("mandataire.present", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="mandataire.present" className="text-base font-medium">
                      Mandataire présent
                    </Label>
                  </div>
                  
                  {formData.mandataire?.present && (
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="mandataire.nom" className="text-base font-medium">
                          Nom du mandataire
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
                      value={formData.contrat?.dateSignature || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contrat.dureeContrat" className="text-base font-medium">
                      Durée du bail
                    </Label>
                    <Select
                      value={formData.contrat?.dureeContrat || ""}
                      onValueChange={(value) => handleSelectChange("contrat.dureeContrat", value)}
                    >
                      <SelectTrigger className="w-full text-base">
                        <SelectValue placeholder="Sélectionner la durée du bail" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bail 3-6-9">Bail 3-6-9</SelectItem>
                        <SelectItem value="Bail 6-9">Bail 6-9</SelectItem>
                        <SelectItem value="Bail 6 ans ferme">Bail 6 ans ferme</SelectItem>
                        <SelectItem value="Bail 9 ans ferme">Bail 9 ans ferme</SelectItem>
                        <SelectItem value="Bail précaire">Bail précaire</SelectItem>
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
                      value={formData.contrat?.dateEntree || ""}
                      onChange={handleInputChange}
                      className="w-full text-base"
                    />
                  </div>
                  
                  {/* Suppression du bloc de date de sortie prévue */}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contrat.typeActivite" className="text-base font-medium">
                    Type d'activité prévue
                  </Label>
                  <Textarea
                    id="contrat.typeActivite"
                    name="contrat.typeActivite"
                    value={formData.contrat?.typeActivite || ""}
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
                        value={formData.elements?.cles?.nombre || "0"}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.cles.detail" className="text-base font-medium">
                        Détail (portes, accès)
                      </Label>
                      <Textarea
                        id="elements.cles.detail"
                        name="elements.cles.detail"
                        value={formData.elements?.cles?.detail || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Détails sur les clés"
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
                        value={formData.elements?.badges?.nombre || "0"}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.badges.detail" className="text-base font-medium">
                        Détail (type d'accès)
                      </Label>
                      <Textarea
                        id="elements.badges.detail"
                        name="elements.badges.detail"
                        value={formData.elements?.badges?.detail || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Détails sur les badges"
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
                        value={formData.elements?.telecommandes?.nombre || "0"}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="elements.telecommandes.detail" className="text-base font-medium">
                        Détail (usage)
                      </Label>
                      <Textarea
                        id="elements.telecommandes.detail"
                        name="elements.telecommandes.detail"
                        value={formData.elements?.telecommandes?.detail || ""}
                        onChange={handleInputChange}
                        className="w-full text-base"
                        placeholder="Détails sur les télécommandes"
                      />
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
                    value={formData.elements?.autresElements || ""}
                    onChange={handleInputChange}
                    className="w-full text-base"
                    placeholder="Autres éléments remis"
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
                      checked={formData.compteurs?.electricite?.presence || false}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.electricite.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.electricite.presence" className="text-lg font-medium">
                      Compteur d'électricité
                    </Label>
                  </div>
                  
                  {formData.compteurs?.electricite?.presence && (
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
                            value={formData.compteurs?.electricite?.numero || ""}
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
                            value={formData.compteurs?.electricite?.releve || ""}
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
                            value={formData.compteurs?.electricite?.puissance || ""}
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
                            value={formData.compteurs?.electricite?.localisation || ""}
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
                          value={formData.compteurs?.electricite?.observations || ""}
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
                          {(formData.compteurs?.electricite?.photos || []).map((photo, index) => (
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
                                onError={(e) => handleImageError(e, photo)}
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
                                capture="environment"
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
                      checked={formData.compteurs?.eau?.presence || false}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.eau.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.eau.presence" className="text-lg font-medium">
                      Compteur d'eau
                    </Label>
                  </div>
                  
                  {formData.compteurs?.eau?.presence && (
                    <div className="space-y-4 pl-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.eau.numero" className="text-base font-medium">
                            Numéro de compteur
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.eau.numero"
                            name="compteurs.eau.numero"
                            value={formData.compteurs?.eau?.numero || ""}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Numéro du compteur"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.eau.releve" className="text-base font-medium">
                            Relevé
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.eau.releve"
                            name="compteurs.eau.releve"
                            value={formData.compteurs?.eau?.releve || ""}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Relevé du compteur"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="compteurs.eau.localisation" className="text-base font-medium">
                            Localisation
                          </Label>
                          <Input
                            type="text"
                            id="compteurs.eau.localisation"
                            name="compteurs.eau.localisation"
                            value={formData.compteurs?.eau?.localisation || ""}
                            onChange={handleInputChange}
                            className="w-full text-base"
                            placeholder="Localisation du compteur"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compteurs.eau.observations" className="text-base font-medium">
                          Observations
                        </Label>
                        <Textarea
                          id="compteurs.eau.observations"
                          name="compteurs.eau.observations"
                          value={formData.compteurs?.eau?.observations || ""}
                          onChange={handleInputChange}
                          className="w-full text-base"
                          placeholder="Observations sur le compteur d'eau"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-base font-medium">
                          Photos du compteur
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {(formData.compteurs?.eau?.photos || []).map((photo, index) => (
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
                                onError={(e) => handleImageError(e, photo)}
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
                                capture="environment"
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
                      checked={formData.compteurs?.gaz?.presence || false}
                      onCheckedChange={(checked) => 
                        updateFormField("compteurs.gaz.presence", checked === true)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor="compteurs.gaz.presence" className="text-lg font-medium">
                      Compteur de gaz
                    </Label>
                  </div>
                  
                  {formData.compteurs?.gaz?.presence && (
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
                            value={formData.compteurs?.gaz?.numero}
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
                            value={formData.compteurs?.gaz?.releve}
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
                          value={formData.compteurs?.gaz?.localisation}
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
                          value={formData.compteurs?.gaz?.observations}
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
                          {(formData.compteurs?.gaz?.photos || []).map((photo, index) => (
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
                                onError={(e) => handleImageError(e, photo)}
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
                                capture="environment"
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
                {Array.isArray(formData.pieces) && formData.pieces.map((piece, pieceIndex) => (
                  <div key={piece.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-medium">{piece.nom}</span>
                        <Input
                          type="text"
                          value={piece.nom}
                          onChange={(e) => {
                            const newPieces = Array.isArray(formData.pieces) ? [...formData.pieces] : [];
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.sols.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.sols.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.sols.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.sols.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].sols.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.murs.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.murs.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.murs.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.murs.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].murs.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                        <h3 className="text-base font-medium mb-3">Plafond</h3>
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plafonds.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plafonds.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plafonds.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plafonds.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plafonds.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plinthes.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plinthes.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plinthes.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.plinthes.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].plinthes.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.fenetres.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.fenetres.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.fenetres.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.fenetres.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].fenetres.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.portes.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.portes.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.portes.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.portes.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].portes.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                          <div className="flex items-center space-x-2 mb-2">
                            <Checkbox 
                              id={`pieces.${pieceIndex}.chauffage.testable`} 
                              checked={piece.chauffage.testable || false}
                              onCheckedChange={(checked) => {
                                const newPieces = [...formData.pieces];
                                newPieces[pieceIndex].chauffage.testable = checked === true;
                                updateFormField("pieces", newPieces);
                              }}
                            />
                            <Label htmlFor={`pieces.${pieceIndex}.chauffage.testable`} className="text-sm font-medium">
                              Installation testable
                            </Label>
                          </div>

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
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.chauffage.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Très bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.chauffage.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Bon état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.chauffage.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "État d'usage";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                className={`min-w-0 h-auto py-1.5 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium rounded ${piece.chauffage.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                  newPieces[pieceIndex].chauffage.etat = "Mauvais état";
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
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
                      
                      {/* Électricité */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Électricité</h3>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Checkbox 
                              id={`pieces.${pieceIndex}.electricite.testable`} 
                              checked={piece.electricite?.testable || false}
                              onCheckedChange={(checked) => {
                                const newPieces = [...formData.pieces];
                                if (!newPieces[pieceIndex].electricite) {
                                  newPieces[pieceIndex].electricite = {
                                    testable: checked === true,
                                    prisesMurales: { nombre: "0", etat: "", observations: "" },
                                    prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                    interrupteurs: { nombre: "0", etat: "", observations: "" },
                                    observations: ""
                                  };
                                } else {
                                  newPieces[pieceIndex].electricite.testable = checked === true;
                                }
                                updateFormField("pieces", newPieces);
                              }}
                            />
                            <Label htmlFor={`pieces.${pieceIndex}.electricite.testable`} className="text-sm font-medium">
                              Installation testable
                            </Label>
                          </div>

                          {/* Prises murales */}
                          <div className="border-t pt-3">
                            <h4 className="text-sm font-medium mb-2">Prises murales</h4>
                            <div className="space-y-3">
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesMurales.nombre`} className="text-xs font-medium">
                                  Nombre
                            </Label>
                            <Input
                              type="number"
                                  id={`pieces.${pieceIndex}.electricite.prisesMurales.nombre`}
                                  name={`pieces.${pieceIndex}.electricite.prisesMurales.nombre`}
                                  value={piece.electricite?.prisesMurales?.nombre || "0"}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: e.target.value, etat: "", observations: "" },
                                        prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                        interrupteurs: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                      newPieces[pieceIndex].electricite.prisesMurales = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].electricite.prisesMurales.nombre = e.target.value;
                                    }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesMurales.etat`} className="text-xs font-medium">
                              État
                            </Label>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesMurales?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "Très bon état", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                        newPieces[pieceIndex].electricite.prisesMurales = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesMurales.etat = "Très bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesMurales?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "Bon état", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                        newPieces[pieceIndex].electricite.prisesMurales = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesMurales.etat = "Bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesMurales?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "État d'usage", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                        newPieces[pieceIndex].electricite.prisesMurales = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesMurales.etat = "État d'usage";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesMurales?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                        newPieces[pieceIndex].electricite.prisesMurales = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesMurales.etat = "Mauvais état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesMurales.observations`} className="text-xs font-medium">
                              Observations
                            </Label>
                            <Textarea
                                  id={`pieces.${pieceIndex}.electricite.prisesMurales.observations`}
                                  name={`pieces.${pieceIndex}.electricite.prisesMurales.observations`}
                                  value={piece.electricite?.prisesMurales?.observations || ""}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: "0", etat: "", observations: e.target.value },
                                        prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                        interrupteurs: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.prisesMurales) {
                                      newPieces[pieceIndex].electricite.prisesMurales = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].electricite.prisesMurales.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les prises murales"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Prises RJ45 */}
                          <div className="border-t pt-3">
                            <h4 className="text-sm font-medium mb-2">Prises RJ45</h4>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesRJ45.nombre`} className="text-xs font-medium">
                                  Nombre
                                </Label>
                                <Input
                                  type="number"
                                  id={`pieces.${pieceIndex}.electricite.prisesRJ45.nombre`}
                                  name={`pieces.${pieceIndex}.electricite.prisesRJ45.nombre`}
                                  value={piece.electricite?.prisesRJ45?.nombre || "0"}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: "0", etat: "", observations: "" },
                                        prisesRJ45: { nombre: e.target.value, etat: "", observations: "" },
                                        interrupteurs: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                      newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].electricite.prisesRJ45.nombre = e.target.value;
                                    }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                                  min="0"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesRJ45.etat`} className="text-xs font-medium">
                                  État
                                </Label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesRJ45?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "Très bon état", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                        newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesRJ45.etat = "Très bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Très bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesRJ45?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "Bon état", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                        newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesRJ45.etat = "Bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesRJ45?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "État d'usage", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                        newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesRJ45.etat = "État d'usage";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Usage
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.prisesRJ45?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                        newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.prisesRJ45.etat = "Mauvais état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Mauvais
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.prisesRJ45.observations`} className="text-xs font-medium">
                                  Observations
                                </Label>
                                <Textarea
                                  id={`pieces.${pieceIndex}.electricite.prisesRJ45.observations`}
                                  name={`pieces.${pieceIndex}.electricite.prisesRJ45.observations`}
                                  value={piece.electricite?.prisesRJ45?.observations || ""}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: "0", etat: "", observations: "" },
                                        prisesRJ45: { nombre: "0", etat: "", observations: e.target.value },
                                        interrupteurs: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.prisesRJ45) {
                                      newPieces[pieceIndex].electricite.prisesRJ45 = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].electricite.prisesRJ45.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les prises RJ45"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Interrupteurs */}
                          <div className="border-t pt-3">
                            <h4 className="text-sm font-medium mb-2">Interrupteurs</h4>
                            <div className="space-y-3">
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.interrupteurs.nombre`} className="text-xs font-medium">
                                  Nombre
                            </Label>
                            <Input
                              type="number"
                                  id={`pieces.${pieceIndex}.electricite.interrupteurs.nombre`}
                                  name={`pieces.${pieceIndex}.electricite.interrupteurs.nombre`}
                                  value={piece.electricite?.interrupteurs?.nombre || "0"}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: "0", etat: "", observations: "" },
                                        prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                        interrupteurs: { nombre: e.target.value, etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                      newPieces[pieceIndex].electricite.interrupteurs = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].electricite.interrupteurs.nombre = e.target.value;
                                    }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.interrupteurs.etat`} className="text-xs font-medium">
                              État
                            </Label>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.interrupteurs?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "Très bon état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                        newPieces[pieceIndex].electricite.interrupteurs = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.interrupteurs.etat = "Très bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.interrupteurs?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "Bon état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                        newPieces[pieceIndex].electricite.interrupteurs = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.interrupteurs.etat = "Bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.interrupteurs?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "État d'usage", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                        newPieces[pieceIndex].electricite.interrupteurs = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.interrupteurs.etat = "État d'usage";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.electricite?.interrupteurs?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].electricite) {
                                        newPieces[pieceIndex].electricite = {
                                          testable: false,
                                          prisesMurales: { nombre: "0", etat: "", observations: "" },
                                          prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                          interrupteurs: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                        newPieces[pieceIndex].electricite.interrupteurs = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].electricite.interrupteurs.etat = "Mauvais état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.electricite.interrupteurs.observations`} className="text-xs font-medium">
                              Observations
                            </Label>
                            <Textarea
                                  id={`pieces.${pieceIndex}.electricite.interrupteurs.observations`}
                                  name={`pieces.${pieceIndex}.electricite.interrupteurs.observations`}
                                  value={piece.electricite?.interrupteurs?.observations || ""}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].electricite) {
                                      newPieces[pieceIndex].electricite = {
                                        testable: false,
                                        prisesMurales: { nombre: "0", etat: "", observations: "" },
                                        prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                        interrupteurs: { nombre: "0", etat: "", observations: e.target.value },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].electricite.interrupteurs) {
                                      newPieces[pieceIndex].electricite.interrupteurs = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].electricite.interrupteurs.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les interrupteurs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Observations générales électricité */}
                          <div className="border-t pt-3">
                            <div className="space-y-2">
                              <Label htmlFor={`pieces.${pieceIndex}.electricite.observations`} className="text-sm font-medium">
                                Observations générales sur l'électricité
                              </Label>
                              <Textarea
                                id={`pieces.${pieceIndex}.electricite.observations`}
                                name={`pieces.${pieceIndex}.electricite.observations`}
                                value={piece.electricite?.observations || ""}
                                onChange={(e) => {
                                  const newPieces = [...formData.pieces];
                                  if (!newPieces[pieceIndex].electricite) {
                                    newPieces[pieceIndex].electricite = {
                                      testable: false,
                                      prisesMurales: { nombre: "0", etat: "", observations: "" },
                                      prisesRJ45: { nombre: "0", etat: "", observations: "" },
                                      interrupteurs: { nombre: "0", etat: "", observations: "" },
                                      observations: e.target.value
                                    };
                                  } else {
                                    newPieces[pieceIndex].electricite.observations = e.target.value;
                                  }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                                placeholder="Observations générales sur l'installation électrique"
                            />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Luminaires */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Luminaires</h3>
                        <div className="space-y-4">
                          {/* Spots */}
                          <div className="border-b pb-3">
                            <h4 className="text-sm font-medium mb-2">Spots</h4>
                            <div className="space-y-3">
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.spots.nombre`} className="text-xs font-medium">
                                  Nombre
                            </Label>
                            <Input
                              type="number"
                                  id={`pieces.${pieceIndex}.luminaires.spots.nombre`}
                                  name={`pieces.${pieceIndex}.luminaires.spots.nombre`}
                                  value={piece.luminaires?.spots?.nombre || "0"}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: e.target.value, etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.spots) {
                                      newPieces[pieceIndex].luminaires.spots = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].luminaires.spots.nombre = e.target.value;
                                    }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                              min="0"
                            />
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.spots.etat`} className="text-xs font-medium">
                              État
                            </Label>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.spots?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "Très bon état", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.spots) {
                                        newPieces[pieceIndex].luminaires.spots = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.spots.etat = "Très bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Très bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.spots?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "Bon état", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.spots) {
                                        newPieces[pieceIndex].luminaires.spots = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.spots.etat = "Bon état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Bon
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.spots?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "État d'usage", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.spots) {
                                        newPieces[pieceIndex].luminaires.spots = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.spots.etat = "État d'usage";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Usage
                              </Button>
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.spots?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                onClick={() => {
                                  const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.spots) {
                                        newPieces[pieceIndex].luminaires.spots = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.spots.etat = "Mauvais état";
                                      }
                                  updateFormField("pieces", newPieces);
                                }}
                              >
                                Mauvais
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.spots.observations`} className="text-xs font-medium">
                              Observations
                            </Label>
                            <Textarea
                                  id={`pieces.${pieceIndex}.luminaires.spots.observations`}
                                  name={`pieces.${pieceIndex}.luminaires.spots.observations`}
                                  value={piece.luminaires?.spots?.observations || ""}
                              onChange={(e) => {
                                const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: e.target.value },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.spots) {
                                      newPieces[pieceIndex].luminaires.spots = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].luminaires.spots.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les spots"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Suspensions */}
                          <div className="border-b pb-3">
                            <h4 className="text-sm font-medium mb-2">Suspensions</h4>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.suspensions.nombre`} className="text-xs font-medium">
                                  Nombre
                                </Label>
                                <Input
                                  type="number"
                                  id={`pieces.${pieceIndex}.luminaires.suspensions.nombre`}
                                  name={`pieces.${pieceIndex}.luminaires.suspensions.nombre`}
                                  value={piece.luminaires?.suspensions?.nombre || "0"}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: e.target.value, etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                      newPieces[pieceIndex].luminaires.suspensions = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].luminaires.suspensions.nombre = e.target.value;
                                    }
                                updateFormField("pieces", newPieces);
                              }}
                              className="w-full text-sm"
                                  min="0"
                            />
                          </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.suspensions.etat`} className="text-xs font-medium">
                                  État
                                </Label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.suspensions?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "Très bon état", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                        newPieces[pieceIndex].luminaires.suspensions = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.suspensions.etat = "Très bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Très bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.suspensions?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "Bon état", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                        newPieces[pieceIndex].luminaires.suspensions = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.suspensions.etat = "Bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.suspensions?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "État d'usage", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                        newPieces[pieceIndex].luminaires.suspensions = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.suspensions.etat = "État d'usage";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Usage
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.suspensions?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                        newPieces[pieceIndex].luminaires.suspensions = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.suspensions.etat = "Mauvais état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Mauvais
                                  </Button>
                        </div>
                      </div>
                      
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.suspensions.observations`} className="text-xs font-medium">
                                  Observations
                                </Label>
                                <Textarea
                                  id={`pieces.${pieceIndex}.luminaires.suspensions.observations`}
                                  name={`pieces.${pieceIndex}.luminaires.suspensions.observations`}
                                  value={piece.luminaires?.suspensions?.observations || ""}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: e.target.value },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.suspensions) {
                                      newPieces[pieceIndex].luminaires.suspensions = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].luminaires.suspensions.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les suspensions"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Dalles lumineuses */}
                          <div className="border-b pb-3">
                            <h4 className="text-sm font-medium mb-2">Dalles lumineuses</h4>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.dallesLumineuses.nombre`} className="text-xs font-medium">
                                  Nombre
                                </Label>
                                <Input
                                  type="number"
                                  id={`pieces.${pieceIndex}.luminaires.dallesLumineuses.nombre`}
                                  name={`pieces.${pieceIndex}.luminaires.dallesLumineuses.nombre`}
                                  value={piece.luminaires?.dallesLumineuses?.nombre || "0"}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: e.target.value, etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                      newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].luminaires.dallesLumineuses.nombre = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-sm"
                                  min="0"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.dallesLumineuses.etat`} className="text-xs font-medium">
                                  État
                                </Label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              <Button
                                type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.dallesLumineuses?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "Très bon état", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses.etat = "Très bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Très bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.dallesLumineuses?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "Bon état", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses.etat = "Bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.dallesLumineuses?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "État d'usage", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses.etat = "État d'usage";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Usage
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.dallesLumineuses?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          neons: { nombre: "0", etat: "", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.dallesLumineuses.etat = "Mauvais état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Mauvais
                              </Button>
                                </div>
                            </div>
                            
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.dallesLumineuses.observations`} className="text-xs font-medium">
                                  Observations
                                </Label>
                        <Textarea
                                  id={`pieces.${pieceIndex}.luminaires.dallesLumineuses.observations`}
                                  name={`pieces.${pieceIndex}.luminaires.dallesLumineuses.observations`}
                                  value={piece.luminaires?.dallesLumineuses?.observations || ""}
                          onChange={(e) => {
                            const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: e.target.value },
                                        neons: { nombre: "0", etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.dallesLumineuses) {
                                      newPieces[pieceIndex].luminaires.dallesLumineuses = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].luminaires.dallesLumineuses.observations = e.target.value;
                                    }
                            updateFormField("pieces", newPieces);
                          }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les dalles lumineuses"
                        />
                              </div>
                            </div>
                      </div>
                      
                          {/* Néons */}
                          <div className="border-b pb-3">
                            <h4 className="text-sm font-medium mb-2">Néons</h4>
                            <div className="space-y-3">
                      <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.neons.nombre`} className="text-xs font-medium">
                                  Nombre
                                </Label>
                                <Input
                                  type="number"
                                  id={`pieces.${pieceIndex}.luminaires.neons.nombre`}
                                  name={`pieces.${pieceIndex}.luminaires.neons.nombre`}
                                  value={piece.luminaires?.neons?.nombre || "0"}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: e.target.value, etat: "", observations: "" },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.neons) {
                                      newPieces[pieceIndex].luminaires.neons = { nombre: e.target.value, etat: "", observations: "" };
                                    } else {
                                      newPieces[pieceIndex].luminaires.neons.nombre = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-sm"
                                  min="0"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.neons.etat`} className="text-xs font-medium">
                                  État
                                </Label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.neons?.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "Très bon état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.neons) {
                                        newPieces[pieceIndex].luminaires.neons = { nombre: "0", etat: "Très bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.neons.etat = "Très bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Très bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.neons?.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "Bon état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.neons) {
                                        newPieces[pieceIndex].luminaires.neons = { nombre: "0", etat: "Bon état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.neons.etat = "Bon état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Bon
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.neons?.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "État d'usage", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.neons) {
                                        newPieces[pieceIndex].luminaires.neons = { nombre: "0", etat: "État d'usage", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.neons.etat = "État d'usage";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Usage
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${piece.luminaires?.neons?.etat === "Mauvais état" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                    onClick={() => {
                                      const newPieces = [...formData.pieces];
                                      if (!newPieces[pieceIndex].luminaires) {
                                        newPieces[pieceIndex].luminaires = {
                                          spots: { nombre: "0", etat: "", observations: "" },
                                          suspensions: { nombre: "0", etat: "", observations: "" },
                                          dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                          neons: { nombre: "0", etat: "Mauvais état", observations: "" },
                                          observations: ""
                                        };
                                      } else if (!newPieces[pieceIndex].luminaires.neons) {
                                        newPieces[pieceIndex].luminaires.neons = { nombre: "0", etat: "Mauvais état", observations: "" };
                                      } else {
                                        newPieces[pieceIndex].luminaires.neons.etat = "Mauvais état";
                                      }
                                      updateFormField("pieces", newPieces);
                                    }}
                                  >
                                    Mauvais
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`pieces.${pieceIndex}.luminaires.neons.observations`} className="text-xs font-medium">
                                  Observations
                                </Label>
                                <Textarea
                                  id={`pieces.${pieceIndex}.luminaires.neons.observations`}
                                  name={`pieces.${pieceIndex}.luminaires.neons.observations`}
                                  value={piece.luminaires?.neons?.observations || ""}
                                  onChange={(e) => {
                                    const newPieces = [...formData.pieces];
                                    if (!newPieces[pieceIndex].luminaires) {
                                      newPieces[pieceIndex].luminaires = {
                                        spots: { nombre: "0", etat: "", observations: "" },
                                        suspensions: { nombre: "0", etat: "", observations: "" },
                                        dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                        neons: { nombre: "0", etat: "", observations: e.target.value },
                                        observations: ""
                                      };
                                    } else if (!newPieces[pieceIndex].luminaires.neons) {
                                      newPieces[pieceIndex].luminaires.neons = { nombre: "0", etat: "", observations: e.target.value };
                                    } else {
                                      newPieces[pieceIndex].luminaires.neons.observations = e.target.value;
                                    }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-xs"
                                  placeholder="Observations sur les néons"
                                />
                          </div>
                            </div>
                          </div>

                          {/* Observations générales luminaires */}
                          <div className="border-t pt-3 mt-3">
                            <div className="space-y-2">
                              <Label htmlFor={`pieces.${pieceIndex}.luminaires.observations`} className="text-sm font-medium">
                                Observations générales sur les luminaires
                              </Label>
                              <Textarea
                                id={`pieces.${pieceIndex}.luminaires.observations`}
                                name={`pieces.${pieceIndex}.luminaires.observations`}
                                value={piece.luminaires?.observations || ""}
                                onChange={(e) => {
                                  const newPieces = [...formData.pieces];
                                  if (!newPieces[pieceIndex].luminaires) {
                                    newPieces[pieceIndex].luminaires = {
                                      spots: { nombre: "0", etat: "", observations: "" },
                                      suspensions: { nombre: "0", etat: "", observations: "" },
                                      dallesLumineuses: { nombre: "0", etat: "", observations: "" },
                                      neons: { nombre: "0", etat: "", observations: "" },
                                      observations: e.target.value
                                    };
                                  } else {
                                    newPieces[pieceIndex].luminaires.observations = e.target.value;
                                  }
                                    updateFormField("pieces", newPieces);
                                  }}
                                  className="w-full text-sm"
                                placeholder="Observations générales sur les luminaires"
                                />
                              </div>
                            </div>
                          </div>
                      </div>

                      {/* Équipements personnalisés */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h3 className="text-base font-medium mb-3">Autres éléments</h3>
                        <div className="space-y-4">
                          {/* Liste des équipements existants */}
                          {piece.equipements && piece.equipements.length > 0 && (
                            <div className="space-y-4 mb-4">
                              {piece.equipements.map((equipment, equipIndex) => (
                                <div key={equipment.id} className="border rounded-md p-3 relative">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                    onClick={() => handleRemoveEquipment(pieceIndex, equipIndex)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipIndex}.nom`} className="text-sm font-medium">
                                        Nom de l'élément
                                      </Label>
                                      <Input
                                        type="text"
                                        id={`pieces.${pieceIndex}.equipements.${equipIndex}.nom`}
                                        value={equipment.nom || ""}
                                        onChange={(e) => {
                                          const newPieces = [...formData.pieces];
                                          newPieces[pieceIndex].equipements[equipIndex].nom = e.target.value;
                                          updateFormField("pieces", newPieces);
                                        }}
                                        className="mt-1"
                                        placeholder="Ex: Radiateur, Climatiseur, etc."
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipIndex}.nature`} className="text-sm font-medium">
                                        Nature
                                      </Label>
                                      <Input
                                        type="text"
                                        id={`pieces.${pieceIndex}.equipements.${equipIndex}.nature`}
                                        value={equipment.nature || ""}
                                        onChange={(e) => {
                                          const newPieces = [...formData.pieces];
                                          if (!newPieces[pieceIndex].equipements[equipIndex].nature) {
                                            newPieces[pieceIndex].equipements[equipIndex].nature = e.target.value;
                                          } else {
                                            newPieces[pieceIndex].equipements[equipIndex].nature = e.target.value;
                                          }
                                          updateFormField("pieces", newPieces);
                                        }}
                                        className="mt-1"
                                        placeholder="Ex: Acier, Plastique, Bois, etc."
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipIndex}.etat`} className="text-sm font-medium">
                                        État
                                      </Label>
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                                        <Button
                                          type="button"
                                          className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${equipment.etat === "Très bon état" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                          onClick={() => {
                                            const newPieces = [...formData.pieces];
                                            newPieces[pieceIndex].equipements[equipIndex].etat = "Très bon état";
                                            updateFormField("pieces", newPieces);
                                          }}
                                        >
                                          Très bon
                                        </Button>
                                        <Button
                                          type="button"
                                          className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${equipment.etat === "Bon état" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                          onClick={() => {
                                            const newPieces = [...formData.pieces];
                                            newPieces[pieceIndex].equipements[equipIndex].etat = "Bon état";
                                            updateFormField("pieces", newPieces);
                                          }}
                                        >
                                          Bon
                                        </Button>
                                        <Button
                                          type="button"
                                          className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${equipment.etat === "État d'usage" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                          onClick={() => {
                                            const newPieces = [...formData.pieces];
                                            newPieces[pieceIndex].equipements[equipIndex].etat = "État d'usage";
                                            updateFormField("pieces", newPieces);
                                          }}
                                        >
                                          État d'usage
                                        </Button>
                                        <Button
                                          type="button"
                                          className={`min-w-0 h-auto py-1 px-1.5 text-[10px] font-medium rounded ${equipment.etat === "À rénover" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                                          onClick={() => {
                                            const newPieces = [...formData.pieces];
                                            newPieces[pieceIndex].equipements[equipIndex].etat = "À rénover";
                                            updateFormField("pieces", newPieces);
                                          }}
                                        >
                                          À rénover
                        </Button>
                                      </div>
                      </div>
                      
                                    <div>
                                      <Label htmlFor={`pieces.${pieceIndex}.equipements.${equipIndex}.observations`} className="text-sm font-medium">
                                        Observations
                                      </Label>
                        <Textarea
                                        id={`pieces.${pieceIndex}.equipements.${equipIndex}.observations`}
                                        value={equipment.observations || ""}
                          onChange={(e) => {
                            const newPieces = [...formData.pieces];
                                          newPieces[pieceIndex].equipements[equipIndex].observations = e.target.value;
                            updateFormField("pieces", newPieces);
                          }}
                                        className="mt-1"
                                        placeholder="Observations sur l'élément..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Bouton pour ajouter un nouvel équipement */}
                          <Button
                            type="button"
                            onClick={() => handleAddEquipment(pieceIndex)}
                            className="w-full flex items-center justify-center"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un élément
                          </Button>
                        </div>
                      </div>
                      
                      {/* Photos de la pièce */}
                      <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
                        <h3 className="text-base font-medium mb-3">Photos de la pièce</h3>
                        <div className="space-y-4">
                          {/* Affichage des photos existantes */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {(piece.photos || []).map((photo, index) => (
                              <div key={`piece-${pieceIndex}-photo-${index}`} className="relative">
                              <Image
                                src={
                                  typeof photo === 'string' 
                                    ? photo 
                                    : ((photo as any)?.type === 'base64_metadata' || (photo as any)?.type === 'file_metadata') 
                                      ? ((photo as any)?.downloadUrl 
                                        ? (photo as any).downloadUrl 
                                          : (photo as any)?.preview 
                                            ? (photo as any).preview
                                            : '')
                                        : URL.createObjectURL(photo)
                                  }
                                  alt={`Photo ${index + 1}`}
                                  width={100}
                                  height={100}
                                  className="w-full h-24 object-cover rounded-md"
                                onError={(e) => handleImageError(e, photo)}
                              />
                                <Button
                                type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-5 w-5 rounded-full"
                                  onClick={() => {
                                    const newPieces = [...formData.pieces];
                                    if (newPieces[pieceIndex].photos) {
                                      newPieces[pieceIndex].photos = newPieces[pieceIndex].photos.filter((_, i) => i !== index);
                                      updateFormField("pieces", newPieces);
                                    }
                                  }}
                              >
                                <X className="h-3 w-3" />
                                </Button>
                            </div>
                          ))}
                          </div>
                          
                          {/* Upload de nouvelles photos */}
                          <div>
                            <Label
                              htmlFor={`piece-${pieceIndex}-photos-upload`}
                              className="cursor-pointer flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-md hover:border-primary"
                            >
                              <div className="flex flex-col items-center space-y-1">
                                <Camera className="h-6 w-6 text-gray-400" />
                                <span className="text-xs text-gray-500">Ajouter des photos</span>
                              </div>
                              <Input
                                id={`piece-${pieceIndex}-photos-upload`}
                                type="file"
                                multiple
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    // Utiliser handlePhotoUpload pour un traitement cohérent des photos
                                    handlePhotoUpload(`pieces.${pieceIndex}.photos`, e);
                                  }
                                }}
                              />
                            </Label>
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
          
          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end sticky bottom-0 bg-white p-4 rounded-xl shadow-md border border-gray-100 z-10">
            <Button 
              type="button" 
              onClick={handleGeneratePDF}
              className="bg-[#DC0032] hover:bg-[#DC0032]/90 text-white font-medium py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <FileText className="h-5 w-5" />
              <span>Générer le rapport</span>
            </Button>
            <Button 
              type="submit" 
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <Save className="h-5 w-5" />
              <span>Enregistrer</span>
            </Button>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 sm:pt-6 px-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
              disabled={activeTab === 0}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm hover:shadow rounded-lg px-5 py-2.5 transition-all duration-200"
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
                className="bg-[#DC0032] hover:bg-[#DC0032]/90 text-white shadow-sm hover:shadow rounded-lg px-5 py-2.5 transition-all duration-200"
              >
                Suivant
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow rounded-lg px-5 py-2.5 transition-all duration-200 flex items-center gap-2"
                onClick={(e) => {
                  // Vérification supplémentaire avant soumission
                  console.log("Bouton Terminer cliqué");
                }}
              >
                <Save className="h-4 w-4" />
                Terminer
              </Button>
            )}
                            </div>
        </form>
                          </div>
                        </div>
  )
} 