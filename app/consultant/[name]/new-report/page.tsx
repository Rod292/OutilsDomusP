"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/app/components/header"
import { ProgressBar } from "@/app/components/progress-bar"
import { NavigationTabs } from "@/app/components/navigation-tabs"
import { EtatDesLieuxForm } from "@/app/components/etat-des-lieux-form"
import { RapportPreview } from "@/app/components/rapport-preview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Download, Copy, Send } from "lucide-react"
import { db, auth } from "@/app/lib/firebase"
import { collection, query, where, getDocs, getDocsFromServer, addDoc, updateDoc, deleteDoc, doc, Firestore, orderBy, limit } from "firebase/firestore"
import { FirebaseError } from "firebase/app"
import { generateEtatDesLieuxPDF } from "@/app/utils/generateEtatDesLieuxPDF"
import { sanitizeReportDataForFirestore } from "@/app/utils/formatDataForStorage"
import { toast } from "@/components/ui/use-toast"
import { getDocuSealURL, uploadDocument } from "@/app/utils/docuseal"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { SignatureConfigModal } from "@/app/components/signature-config-modal"
import generatePDFFromData from "@/app/utils/generatePDF"

interface RecentReport {
  id: string
  title: string
  date: string
  consultant: string
  lastUpdated?: string
  data: any
}

// Définir l'interface pour les props de RapportPreview pour corriger l'erreur de type
interface RapportPreviewProps {
  formData: any
}

export default function NewReportPage() {
  const router = useRouter()
  const { name } = useParams()
  const consultantName = decodeURIComponent(name as string)
  
  // Log pour vérifier que le nom du consultant est correctement récupéré
  console.log("Nom du consultant récupéré des paramètres:", consultantName)
  
  const [activeTab, setActiveTab] = useState<"form" | "preview" | "recent">("form")
  const [progress, setProgress] = useState(0)
  const [rapport, setRapport] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [loadingReports, setLoadingReports] = useState(true)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [activeTemplateId, setActiveTemplateId] = useState("")
  const [activeReportId, setActiveReportId] = useState("")
  
  // Référence pour le timer de rafraîchissement automatique
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Vérifier que auth n'est pas null
    if (!auth) {
      console.error("La référence à auth est null")
      router.push("/")
      return
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/")
      } else {
        fetchRecentReports()
      }
    })

    return () => unsubscribe()
  }, [router])

  // Fonction pour charger les rapports récents
  const fetchRecentReports = async () => {
    // Vérifier que auth et db ne sont pas null
    if (!auth) {
      console.error("La référence à auth est null")
      return
    }

    const user = auth.currentUser
    if (!user) {
      console.log("No user logged in, cannot fetch reports")
      setLoadingReports(false)
      return
    }

    // Vérifier que db n'est pas null
    if (!db) {
      console.error("La référence à Firestore est null")
      return
    }

    try {
      setLoadingReports(true)
      console.log("Récupération des rapports récents pour le consultant:", consultantName)
      const reportsRef = collection(db as Firestore, "reports")
      
      // Créer une requête qui filtre uniquement par nom de consultant
      // Cela permet à n'importe quel utilisateur de voir les rapports d'un consultant spécifique
      const q = query(
        reportsRef, 
        where("consultant", "==", consultantName)
        // Ne plus filtrer par userId pour permettre à tous les utilisateurs d'accéder aux rapports
        // orderBy retiré temporairement jusqu'à la création de l'index
      )
      
      // Forcer la récupération des données fraîches depuis le serveur
      const querySnapshot = await getDocsFromServer(q)
      
      console.log("Nombre de rapports récupérés de Firestore:", querySnapshot.size)
      
      const reports: RecentReport[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Rapport trouvé - ID: ${doc.id}, Titre: ${data.title}, Consultant: ${data.consultant}, Date: ${data.date}, MàJ: ${data.lastUpdated || 'N/A'}`);
        reports.push({ id: doc.id, ...data } as RecentReport)
      })
      
      // Tri manuel par date de mise à jour décroissante
      reports.sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return dateB - dateA;
      });
      
      // Limiter le nombre de rapports affichés
      const limitedReports = reports.slice(0, 20);
      
      setRecentReports(limitedReports)
      setLoadingReports(false)
    } catch (error) {
      console.error("Erreur lors de la récupération des rapports récents:", error)
      setLoadingReports(false)
    }
  }
  
  // Configurer le rafraîchissement périodique des rapports
  useEffect(() => {
    // Charger les rapports au chargement initial
    fetchRecentReports()
    
    // Configurer un timer pour rafraîchir les rapports toutes les 10 secondes
    refreshTimerRef.current = setInterval(() => {
      console.log("Rafraîchissement automatique des rapports récents...")
      fetchRecentReports()
    }, 10000) // 10 secondes
    
    // Nettoyer le timer lors du démontage du composant
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [consultantName])  // Se déclenche quand le nom du consultant change

  const handleRapportGenerated = async (rapportHtml: string, data: any) => {
    console.log("======= RAPPORT GÉNÉRÉ =======")
    console.log("Données reçues:", data)
    console.log("Navigation vers l'onglet Preview")
    
    // S'assurer que data a les propriétés requises avant de continuer
    if (!data.pieces) {
      console.log("Propriété pieces manquante, initialisation avec un tableau vide")
      data.pieces = []
    }
    
    if (!data.compteurs) {
      console.log("Propriété compteurs manquante, initialisation")
      data.compteurs = {
        eau: { presence: false, photos: [] },
        electricite: { presence: false, photos: [] },
        gaz: { presence: false, photos: [] }
      }
    }
    
    setRapport(rapportHtml)
    setFormData(data)
    setActiveTab("preview")

    // Vérifier que auth n'est pas null
    if (!auth) {
      console.error("La référence à auth est null")
      toast({
        title: "Erreur",
        description: "Erreur d'authentification, impossible de sauvegarder le rapport.",
        variant: "destructive",
      })
      return
    }

    const user = auth.currentUser
    if (!user) {
      console.log("Aucun utilisateur connecté, impossible de sauvegarder le rapport")
      return
    }

    try {
      let reportId: string
      
      // Nettoyage et préparation des données pour Firestore
      console.log("Début de la préparation des données pour Firestore")
      const cleanedData = JSON.parse(JSON.stringify(data))
      
      // Vérifier les données des pièces avant sauvegarde
      console.log("Données des pièces avant sauvegarde:", data.pieces)
      
      // S'assurer que data.pieces est un tableau avant d'accéder à length
      if (Array.isArray(data.pieces)) {
        console.log("Nombre de pièces:", data.pieces.length)
        
        // Vérifier les photos de chaque pièce
        data.pieces.forEach((piece: any, index: number) => {
          console.log(`Pièce ${index + 1}: ${piece.nom || 'Sans nom'}`)
          if (piece.photos && Array.isArray(piece.photos)) {
            console.log(`  - Nombre de photos: ${piece.photos.length}`)
            piece.photos.forEach((photo: any, photoIndex: number) => {
              console.log(`  - Photo ${photoIndex + 1}: Type=${typeof photo}`)
              if (typeof photo === 'object' && photo !== null) {
                console.log(`    - Propriétés: ${Object.keys(photo).join(', ')}`)
              }
            })
          } else {
            console.log(`  - Pas de photos ou format invalide: ${typeof piece.photos}`)
          }
        })
      } else {
        console.warn("data.pieces n'est pas un tableau valide - type:", typeof data.pieces)
      }
      
      // Fonction récursive pour nettoyer les objets complexes qui pourraient causer des problèmes avec Firestore
      const sanitizeForFirestore = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        
        // Si c'est un objet Date, convertir en string ISO
        if (obj instanceof Date) return obj.toISOString();
        
        // Si c'est un File, on ne peut pas le stocker directement
        if (obj instanceof File) return {
          name: obj.name,
          size: obj.size,
          type: obj.type,
          lastModified: obj.lastModified
        };
        
        // Si c'est un tableau, sanitize chaque élément
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeForFirestore(item));
        }
        
        // Si c'est un objet, sanitize ses propriétés
        if (typeof obj === 'object') {
          const result: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeForFirestore(value);
          }
          return result;
        }
        
        // Valeurs primitives
        return obj;
      };
      
      // Utiliser la fonction dédiée au nettoyage des rapports
      console.log("Appel de la fonction sanitizeReportDataForFirestore")
      const sanitizedData = await sanitizeReportDataForFirestore(cleanedData);
      console.log("Données nettoyées avec succès")
      
      // Vérifier les données après nettoyage
      console.log("Vérification des données après nettoyage:")
      
      // S'assurer que les pieces existent toujours après nettoyage
      if (!sanitizedData.pieces || !Array.isArray(sanitizedData.pieces)) {
        console.warn("Les pièces sont manquantes ou invalides après nettoyage, initialisation avec un tableau vide")
        sanitizedData.pieces = []
      } else {
        console.log("Nombre de pièces après nettoyage:", sanitizedData.pieces.length)
      }
      
      // S'assurer que les compteurs existent après nettoyage
      if (!sanitizedData.compteurs || typeof sanitizedData.compteurs !== 'object') {
        console.warn("Les compteurs sont manquants ou invalides après nettoyage, initialisation")
        sanitizedData.compteurs = {
          eau: { presence: false, photos: [] },
          electricite: { presence: false, photos: [] },
          gaz: { presence: false, photos: [] }
        }
      }
      
      const reportData = {
        userId: user.uid,
        title: data.adresseBien 
          ? `${data.adresseBien}${data.codePostalBien && data.villeBien ? `, ${data.codePostalBien} ${data.villeBien}` : ''}`
          : "Adresse non spécifiée",
        date: new Date().toISOString(),
        consultant: consultantName,
        data: sanitizedData,
        lastUpdated: new Date().toISOString(),
      }
      
      console.log("Données préparées pour Firestore:", {
        ...reportData,
        data: "... données omises pour la concision ...",
        consultant: reportData.consultant // Log spécifique pour vérifier le consultant
      })
      console.log("Préparation des données pour Firestore terminée")
      console.log("Tentative de sauvegarde dans Firestore...")

      // Vérifier que db n'est pas null
      if (!db) {
        console.error("La référence à Firestore est null")
        throw new Error("La référence à Firestore est null")
      }

      if (editingReportId) {
        console.log("Mise à jour d'un rapport existant:", editingReportId)
        const reportRef = doc(db as Firestore, "reports", editingReportId)
        await updateDoc(reportRef, reportData)
        reportId = editingReportId
        console.log("Rapport mis à jour avec succès")
      } else {
        console.log("Création d'un nouveau rapport")
        const docRef = await addDoc(collection(db as Firestore, "reports"), reportData)
        reportId = docRef.id
        console.log("Nouveau rapport créé avec succès, ID:", reportId)
      }

      toast({
        title: "Rapport enregistré",
        description: "Le rapport a été enregistré avec succès. Redirection vers la liste des rapports récents...",
      })

      // Mettre à jour la liste des rapports récents
      setTimeout(() => {
        console.log("==== MISE À JOUR POST-SAUVEGARDE ====");
        console.log(`ID du rapport: ${reportId}`);
        console.log(`Type de rapport: ${editingReportId ? 'Modifié' : 'Nouveau'}`);
        console.log(`Titre du rapport: ${reportData.title}`);
        console.log(`Date de dernière mise à jour: ${reportData.lastUpdated}`);
        
        console.log("Actualisation de la liste des rapports récents...");
        fetchRecentReports();
        
        // Ne pas naviguer automatiquement vers l'onglet des rapports récents après la sauvegarde
        // mais rester sur l'onglet preview comme demandé par l'utilisateur
        console.log("Reste sur l'onglet preview");
        
        // Réinitialiser le mode d'édition
        if (editingReportId) {
          setEditingReportId(null);
        }
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du rapport:", error)
      
      // Afficher plus de détails sur l'erreur
      if (error instanceof FirebaseError) {
        console.error("Firebase error saving report:", error.code, error.message)
        console.error("Détails de l'erreur Firebase:", error)
      } else {
        console.error("Détails de l'erreur:", error)
      }
      
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du rapport.",
        variant: "destructive",
      })
    }
  }

  const handleProgressUpdate = (data: any) => {
    if (!data) return setProgress(0)
    const totalFields = countTotalFields(data)
    const filledFields = countFilledFields(data)
    const newProgress = Math.round((filledFields / totalFields) * 100)
    setProgress(newProgress)
  }

  const handleDelete = async (id: string) => {
    // Vérifier que db n'est pas null
    if (!db) {
      console.error("La référence à Firestore est null")
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rapport, problème de connexion à la base de données.",
        variant: "destructive",
      })
      return
    }

    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet état des lieux ?")) {
      await deleteDoc(doc(db as Firestore, "reports", id))
      fetchRecentReports()
    }
  }

  const handleDuplicate = (report: RecentReport) => {
    console.log("Duplication du rapport:", report.id);
    
    // Vérification de sécurité pour les données
    try {
      // Vérifier si le rapport contient des données
      if (!report.data) {
        console.error("Erreur: Les données du rapport sont manquantes");
        return;
      }
      
      // Copie profonde pour ne pas modifier les originaux
      const safeData = JSON.parse(JSON.stringify(report.data));
      
      // Migration des anciens rapports vers le nouveau format
      const migratedData = migrateReportData(safeData);
      
      console.log("Rapport copié et prêt pour l'édition");
      setFormData(migratedData);
      // Ne pas définir l'ID d'édition pour créer un nouveau rapport
      setEditingReportId(null);
      setActiveTab("form");
      
      toast({
        title: "Rapport dupliqué",
        description: "Vous modifiez une copie de l'état des lieux. Un nouveau rapport sera créé lors de l'enregistrement.",
      });
    } catch (error) {
      console.error("Erreur lors de la duplication du rapport:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la duplication du rapport.",
        variant: "destructive",
      });
    }
  }

  const handleEdit = (report: RecentReport) => {
    // Utiliser la nouvelle fonction handleEditReport pour la cohérence
    handleEditReport(report);
  }

  /**
   * Fonction pour migrer les anciens formats de rapports vers le nouveau format
   * Corrige les problèmes de structure qui pourraient causer des erreurs
   */
  function migrateReportData(data: any): any {
    console.log("Migration des données du rapport...");
    
    // Vérifier que les pièces existent et sont un tableau
    if (!data.pieces) {
      console.warn("Migration: Création d'un tableau de pièces vide");
      data.pieces = [];
    } else if (!Array.isArray(data.pieces)) {
      console.warn("Migration: Conversion des pièces en tableau");
      try {
        // Si c'est un objet, convertir en tableau
        data.pieces = Object.values(data.pieces);
      } catch (e) {
        console.error("Migration: Erreur lors de la conversion des pièces en tableau:", e);
        data.pieces = [];
      }
    }
    
    // Vérifier et migrer chaque pièce
    if (Array.isArray(data.pieces)) {
      data.pieces = data.pieces.map((piece: any, index: number) => {
        // Si la pièce n'est pas un objet, créer un objet vide
        if (!piece || typeof piece !== 'object') {
          console.warn(`Migration: Pièce ${index} n'est pas un objet valide`);
          return {
            nom: `Pièce ${index + 1}`,
            etat: {},
            photos: []
          };
        }
        
        // S'assurer que le nom est défini
        if (!piece.nom) {
          piece.nom = `Pièce ${index + 1}`;
        }
        
        // Vérifier que l'état existe
        if (!piece.etat || typeof piece.etat !== 'object') {
          console.warn(`Migration: Création d'un objet état pour la pièce ${index}`);
          piece.etat = {};
        }
        
        // Vérifier que photos est un tableau
        if (!piece.photos) {
          console.warn(`Migration: Création d'un tableau photos vide pour la pièce ${index}`);
          piece.photos = [];
        } else if (!Array.isArray(piece.photos)) {
          console.warn(`Migration: Conversion des photos en tableau pour la pièce ${index}`);
          try {
            // Tenter de convertir en tableau si c'est un objet
            piece.photos = Object.values(piece.photos);
          } catch (e) {
            console.error(`Migration: Erreur lors de la conversion des photos:`, e);
            piece.photos = [];
          }
        }
        
        // Filtrer les photos nulles ou non valides
        if (Array.isArray(piece.photos)) {
          piece.photos = piece.photos.filter((photo: any) => photo !== null && photo !== undefined);
        }
        
        return piece;
      });
    }
    
    // Vérifier les compteurs
    if (!data.compteurs || typeof data.compteurs !== 'object') {
      console.warn("Migration: Création d'un objet compteurs");
      data.compteurs = {
        eau: { presence: false },
        electricite: { presence: false },
        gaz: { presence: false }
      };
    } else {
      // S'assurer que tous les types de compteurs existent
      ['eau', 'electricite', 'gaz'].forEach(type => {
        if (!data.compteurs[type]) {
          data.compteurs[type] = { presence: false };
        } else if (typeof data.compteurs[type] !== 'object') {
          data.compteurs[type] = { presence: false };
        }
        
        // Vérifier que photos est un tableau
        if (data.compteurs[type].photos && !Array.isArray(data.compteurs[type].photos)) {
          try {
            data.compteurs[type].photos = Object.values(data.compteurs[type].photos);
          } catch (e) {
            console.error(`Migration: Erreur avec les photos du compteur ${type}:`, e);
            data.compteurs[type].photos = [];
          }
        }
      });
    }
    
    console.log("Migration terminée avec succès");
    return data;
  }

  const handleDownloadPDF = async (report: RecentReport) => {
    try {
      const reportData = report.data;
      const adresseBien = reportData.adresseBien || '';
      const villeBien = reportData.villeBien || '';
      const codePostalBien = reportData.codePostalBien || '';
      
      const adresseFormatee = adresseBien 
        ? `${adresseBien}${codePostalBien && villeBien ? `-${codePostalBien}-${villeBien}` : ''}`
        : "adresse-non-specifiee";
        
      const filename = `etat-des-lieux-${reportData.typeEtatDesLieux || 'entree'}-${adresseFormatee.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
      
      await generateEtatDesLieuxPDF(report.data, {
        filename: filename,
        openInNewTab: false
      })
      
      console.log("PDF downloaded successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Une erreur est survenue lors de la génération du PDF")
    }
  }

  // Ajouter cette fonction pour gérer l'ouverture de DocuSeal
  const handleOpenDocuSeal = (report: RecentReport) => {
    console.log("Ouverture de la modal de signature pour le rapport:", report.id)
    setActiveReportId(report.id)
    setIsSignatureModalOpen(true)
  }

  // Fonction pour télécharger le rapport en PDF et l'envoyer à DocuSeal
  const handleUploadReportPDF = async (report: RecentReport) => {
    try {
      console.log("Génération du PDF pour DocuSeal...")
      const pdfBlob = await generatePDFFromData(report.data)
      
      // Créer un fichier à partir du blob
      const file = new File([pdfBlob], `${report.data.title || 'Etat des lieux'}.pdf`, { type: 'application/pdf' })
      
      // Télécharger le document vers DocuSeal
      console.log("Téléchargement du PDF vers DocuSeal...")
      const response = await uploadDocument(activeTemplateId, file)
      console.log("Document téléchargé avec succès:", response)
      
      return response
    } catch (error) {
      console.error("Erreur lors du téléchargement du document:", error)
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document vers DocuSeal",
        variant: "destructive"
      })
      throw error
    }
  }

  // Fonction pour charger un rapport à éditer
  const handleEditReport = async (report: RecentReport) => {
    try {
      console.log("Chargement du rapport pour édition - ID:", report.id);

      // Ajouter explicitement l'ID comme propriété _id pour l'édition
      const reportData = {
        ...report.data,
        _id: report.id,  // Ajouter l'ID explicite pour l'édition
        _consultant: report.consultant || consultantName
      };

      console.log("Structure du rapport chargé:", Object.keys(reportData).join(', '));
      
      // Passer à l'onglet formulaire avec les données préchargées
      setFormData(reportData);
      setEditingReportId(report.id);
      setActiveTab("form");
      
      toast({
        title: "Rapport chargé",
        description: "Vous pouvez maintenant continuer l'édition de ce rapport.",
      });
    } catch (error) {
      console.error("Erreur lors du chargement du rapport:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger ce rapport pour édition.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-col flex-grow">
        <ProgressBar value={progress} />
        
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === "form" && (
          <div className="flex-grow main-content">
            <EtatDesLieuxForm
              onRapportGenerated={handleRapportGenerated}
              initialData={formData}
              onProgressUpdate={handleProgressUpdate}
              consultantName={consultantName}
              editMode={!!editingReportId}
            />
          </div>
        )}
        
        {activeTab === "preview" && rapport && (
          <div className="flex-grow main-content">
            <RapportPreview formData={formData} />
          </div>
        )}
        
        {activeTab === "recent" && (
          <div className="flex-grow p-4 main-content">
            <div className="grid grid-cols-1 gap-4">
              {loadingReports ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">Chargement des rapports...</p>
                  </CardContent>
                </Card>
              ) : recentReports.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">Aucun rapport récent</p>
                  </CardContent>
                </Card>
              ) : (
                recentReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{report.title || "Sans titre"}</CardTitle>
                          <CardDescription>
                            Créé le {formatDate(report.date)}
                            {report.lastUpdated && ` • Modifié le ${formatDate(report.lastUpdated)}`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(report.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(report)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDuplicate(report)}
                            className="h-8 w-8"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDocuSeal(report)}
                            className="h-8 w-8"
                            title="Configurer signatures"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadPDF(report)}
                            className="h-8 w-8"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {`${calculateCompletionPercentage(report.data)}% complété`}
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEdit(report)}
                          className="btn-mobile-friendly"
                        >
                          Continuer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de configuration des signatures */}
      <SignatureConfigModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        templateId={activeTemplateId}
        onComplete={(data: any) => {
          console.log("Signature complétée:", data)
          toast({
            title: "Signature configurée",
            description: "La demande de signature a été envoyée avec succès",
          })
        }}
      />
    </div>
  )
}

function countTotalFields(data: any): number {
  if (!data) return 0
  let count = 0

  // Informations générales
  count += 4 // typeEtatDesLieux, dateEtatDesLieux, typeBien, adresseBien
  
  // Informations sur le bien
  if (data.adresseBien) count++
  if (data.codePostalBien) count++
  if (data.villeBien) count++

  // Bailleur
  if (data.bailleur) {
    count += 7 // nom, prenom, adresse, codePostal, ville, telephone, email
  }

  // Locataire
  if (data.locataire) {
    count += 4 // nom, prenom, telephone, email
  }
  
  // Mandataire
  if (data.mandataire && data.mandataire.present) {
    count += 3 // nom, adresse, telephone
  }
  
  // Contrat
  if (data.contrat) {
    count += 6 // dateSignature, dateEntree, dureeContrat, montantLoyer, montantCharges, montantDepotGarantie
  }
  
  // Éléments remis
  if (data.elements) {
    if (data.elements.cles) count += 2 // nombre, detail
    if (data.elements.badges) count += 2 // nombre, detail
    if (data.elements.telecommandes) count += 2 // nombre, detail
  }
  
  // Compteurs
  if (data.compteurs) {
    if (data.compteurs.eau && data.compteurs.eau.presence) count += 4 // numero, releve, localisation, observations
    if (data.compteurs.electricite && data.compteurs.electricite.presence) count += 5 // numero, releve, puissance, localisation, observations
    if (data.compteurs.gaz && data.compteurs.gaz.presence) count += 4 // numero, releve, localisation, observations
  }
  
  // Pièces
  if (data.pieces) {
    data.pieces.forEach((piece: any) => {
      count += 10 // nom, photos, observations + 7 éléments (sols, murs, plafonds, etc.)
      
      // Caractéristiques de la pièce
      if (piece.sols) count += 3 // nature, etat, observations
      if (piece.murs) count += 3 // nature, etat, observations
      if (piece.plafonds) count += 3 // nature, etat, observations
      if (piece.plinthes) count += 3 // nature, etat, observations
      if (piece.fenetres) count += 3 // nature, etat, observations
      if (piece.portes) count += 3 // nature, etat, observations
      if (piece.chauffage) count += 3 // nature, etat, observations
      if (piece.prises) count += 3 // nombre, etat, observations
      if (piece.interrupteurs) count += 3 // nombre, etat, observations
      
      // Équipements
      if (piece.equipements) {
        piece.equipements.forEach((equipement: any) => {
          count += 3 // nom, etat, observations
        })
      }
    })
  }
  
  // Extérieur
  if (data.exterieur) {
    if (data.exterieur.jardin && data.exterieur.jardin.presence) count += 2 // etat, observations
    if (data.exterieur.terrasse && data.exterieur.terrasse.presence) count += 2 // etat, observations
    if (data.exterieur.balcon && data.exterieur.balcon.presence) count += 2 // etat, observations
    if (data.exterieur.garage && data.exterieur.garage.presence) count += 2 // etat, observations
    if (data.exterieur.parking && data.exterieur.parking.presence) count += 2 // etat, observations
    if (data.exterieur.cave && data.exterieur.cave.presence) count += 2 // etat, observations
  }
  
  // Observations générales
  if (data.observationsGenerales) count++
  
  // Signatures
  if (data.signatures) {
    if (data.signatures.bailleur) count++
    if (data.signatures.locataire) count++
    if (data.signatures.mandataire) count++
  }

  return count
}

function countFilledFields(data: any): number {
  if (!data) return 0
  let count = 0

  // Informations générales
  if (data.typeEtatDesLieux && data.typeEtatDesLieux.trim() !== "") count++
  if (data.dateEtatDesLieux && data.dateEtatDesLieux.trim() !== "") count++
  if (data.typeBien && Array.isArray(data.typeBien) && data.typeBien.length > 0) count++
  if (data.adresseBien && data.adresseBien.trim() !== "") count++
  if (data.codePostalBien && data.codePostalBien.trim() !== "") count++
  if (data.villeBien && data.villeBien.trim() !== "") count++

  // Bailleur
  if (data.bailleur) {
    if (data.bailleur.nom && data.bailleur.nom.trim() !== "") count++
    if (data.bailleur.prenom && data.bailleur.prenom.trim() !== "") count++
    if (data.bailleur.adresse && data.bailleur.adresse.trim() !== "") count++
    if (data.bailleur.codePostal && data.bailleur.codePostal.trim() !== "") count++
    if (data.bailleur.ville && data.bailleur.ville.trim() !== "") count++
    if (data.bailleur.telephone && data.bailleur.telephone.trim() !== "") count++
    if (data.bailleur.email && data.bailleur.email.trim() !== "") count++
  }

  // Locataire
  if (data.locataire) {
    if (data.locataire.nom && data.locataire.nom.trim() !== "") count++
    if (data.locataire.prenom && data.locataire.prenom.trim() !== "") count++
    if (data.locataire.telephone && data.locataire.telephone.trim() !== "") count++
    if (data.locataire.email && data.locataire.email.trim() !== "") count++
  }
  
  // Mandataire
  if (data.mandataire && data.mandataire.present) {
    if (data.mandataire.nom && data.mandataire.nom.trim() !== "") count++
    if (data.mandataire.adresse && data.mandataire.adresse.trim() !== "") count++
    if (data.mandataire.telephone && data.mandataire.telephone.trim() !== "") count++
  }
  
  // Contrat
  if (data.contrat) {
    if (data.contrat.dateSignature && data.contrat.dateSignature.trim() !== "") count++
    if (data.contrat.dateEntree && data.contrat.dateEntree.trim() !== "") count++
    if (data.contrat.dureeContrat && data.contrat.dureeContrat.trim() !== "") count++
    if (data.contrat.montantLoyer && data.contrat.montantLoyer.trim() !== "") count++
    if (data.contrat.montantCharges && data.contrat.montantCharges.trim() !== "") count++
    if (data.contrat.montantDepotGarantie && data.contrat.montantDepotGarantie.trim() !== "") count++
  }
  
  // Éléments remis
  if (data.elements) {
    if (data.elements.cles) {
      if (data.elements.cles.nombre && data.elements.cles.nombre.trim() !== "") count++
      if (data.elements.cles.detail && data.elements.cles.detail.trim() !== "") count++
    }
    if (data.elements.badges) {
      if (data.elements.badges.nombre && data.elements.badges.nombre.trim() !== "") count++
      if (data.elements.badges.detail && data.elements.badges.detail.trim() !== "") count++
    }
    if (data.elements.telecommandes) {
      if (data.elements.telecommandes.nombre && data.elements.telecommandes.nombre.trim() !== "") count++
      if (data.elements.telecommandes.detail && data.elements.telecommandes.detail.trim() !== "") count++
    }
  }
  
  // Compteurs
  if (data.compteurs) {
    if (data.compteurs.eau && data.compteurs.eau.presence) {
      if (data.compteurs.eau.numero && data.compteurs.eau.numero.trim() !== "") count++
      if (data.compteurs.eau.releve && data.compteurs.eau.releve.trim() !== "") count++
      if (data.compteurs.eau.localisation && data.compteurs.eau.localisation.trim() !== "") count++
      if (data.compteurs.eau.observations && data.compteurs.eau.observations.trim() !== "") count++
    }
    if (data.compteurs.electricite && data.compteurs.electricite.presence) {
      if (data.compteurs.electricite.numero && data.compteurs.electricite.numero.trim() !== "") count++
      if (data.compteurs.electricite.releve && data.compteurs.electricite.releve.trim() !== "") count++
      if (data.compteurs.electricite.puissance && data.compteurs.electricite.puissance.trim() !== "") count++
      if (data.compteurs.electricite.localisation && data.compteurs.electricite.localisation.trim() !== "") count++
      if (data.compteurs.electricite.observations && data.compteurs.electricite.observations.trim() !== "") count++
    }
    if (data.compteurs.gaz && data.compteurs.gaz.presence) {
      if (data.compteurs.gaz.numero && data.compteurs.gaz.numero.trim() !== "") count++
      if (data.compteurs.gaz.releve && data.compteurs.gaz.releve.trim() !== "") count++
      if (data.compteurs.gaz.localisation && data.compteurs.gaz.localisation.trim() !== "") count++
      if (data.compteurs.gaz.observations && data.compteurs.gaz.observations.trim() !== "") count++
    }
  }
  
  // Pièces
  if (data.pieces) {
    data.pieces.forEach((piece: any) => {
      if (piece.nom && piece.nom.trim() !== "") count++
      if (piece.observations && piece.observations.trim() !== "") count++
      if (piece.photos && piece.photos.length > 0) count++
      
      // Caractéristiques de la pièce
      if (piece.sols) {
        if (piece.sols.nature && piece.sols.nature.trim() !== "") count++
        if (piece.sols.etat && piece.sols.etat.trim() !== "") count++
        if (piece.sols.observations && piece.sols.observations.trim() !== "") count++
      }
      if (piece.murs) {
        if (piece.murs.nature && piece.murs.nature.trim() !== "") count++
        if (piece.murs.etat && piece.murs.etat.trim() !== "") count++
        if (piece.murs.observations && piece.murs.observations.trim() !== "") count++
      }
      if (piece.plafonds) {
        if (piece.plafonds.nature && piece.plafonds.nature.trim() !== "") count++
        if (piece.plafonds.etat && piece.plafonds.etat.trim() !== "") count++
        if (piece.plafonds.observations && piece.plafonds.observations.trim() !== "") count++
      }
      if (piece.plinthes) {
        if (piece.plinthes.nature && piece.plinthes.nature.trim() !== "") count++
        if (piece.plinthes.etat && piece.plinthes.etat.trim() !== "") count++
        if (piece.plinthes.observations && piece.plinthes.observations.trim() !== "") count++
      }
      if (piece.fenetres) {
        if (piece.fenetres.nature && piece.fenetres.nature.trim() !== "") count++
        if (piece.fenetres.etat && piece.fenetres.etat.trim() !== "") count++
        if (piece.fenetres.observations && piece.fenetres.observations.trim() !== "") count++
      }
      if (piece.portes) {
        if (piece.portes.nature && piece.portes.nature.trim() !== "") count++
        if (piece.portes.etat && piece.portes.etat.trim() !== "") count++
        if (piece.portes.observations && piece.portes.observations.trim() !== "") count++
      }
      if (piece.chauffage) {
        if (piece.chauffage.nature && piece.chauffage.nature.trim() !== "") count++
        if (piece.chauffage.etat && piece.chauffage.etat.trim() !== "") count++
        if (piece.chauffage.observations && piece.chauffage.observations.trim() !== "") count++
      }
      if (piece.prises) {
        if (piece.prises.nombre && piece.prises.nombre.trim() !== "") count++
        if (piece.prises.etat && piece.prises.etat.trim() !== "") count++
        if (piece.prises.observations && piece.prises.observations.trim() !== "") count++
      }
      if (piece.interrupteurs) {
        if (piece.interrupteurs.nombre && piece.interrupteurs.nombre.trim() !== "") count++
        if (piece.interrupteurs.etat && piece.interrupteurs.etat.trim() !== "") count++
        if (piece.interrupteurs.observations && piece.interrupteurs.observations.trim() !== "") count++
      }
      
      // Équipements
      if (piece.equipements) {
        piece.equipements.forEach((equipement: any) => {
          if (equipement.nom && equipement.nom.trim() !== "") count++
          if (equipement.etat && equipement.etat.trim() !== "") count++
          if (equipement.observations && equipement.observations.trim() !== "") count++
        })
      }
    })
  }
  
  // Extérieur
  if (data.exterieur) {
    if (data.exterieur.jardin && data.exterieur.jardin.presence) {
      if (data.exterieur.jardin.etat && data.exterieur.jardin.etat.trim() !== "") count++
      if (data.exterieur.jardin.observations && data.exterieur.jardin.observations.trim() !== "") count++
    }
    if (data.exterieur.terrasse && data.exterieur.terrasse.presence) {
      if (data.exterieur.terrasse.etat && data.exterieur.terrasse.etat.trim() !== "") count++
      if (data.exterieur.terrasse.observations && data.exterieur.terrasse.observations.trim() !== "") count++
    }
    if (data.exterieur.balcon && data.exterieur.balcon.presence) {
      if (data.exterieur.balcon.etat && data.exterieur.balcon.etat.trim() !== "") count++
      if (data.exterieur.balcon.observations && data.exterieur.balcon.observations.trim() !== "") count++
    }
    if (data.exterieur.garage && data.exterieur.garage.presence) {
      if (data.exterieur.garage.etat && data.exterieur.garage.etat.trim() !== "") count++
      if (data.exterieur.garage.observations && data.exterieur.garage.observations.trim() !== "") count++
    }
    if (data.exterieur.parking && data.exterieur.parking.presence) {
      if (data.exterieur.parking.etat && data.exterieur.parking.etat.trim() !== "") count++
      if (data.exterieur.parking.observations && data.exterieur.parking.observations.trim() !== "") count++
    }
    if (data.exterieur.cave && data.exterieur.cave.presence) {
      if (data.exterieur.cave.etat && data.exterieur.cave.etat.trim() !== "") count++
      if (data.exterieur.cave.observations && data.exterieur.cave.observations.trim() !== "") count++
    }
  }
  
  // Observations générales
  if (data.observationsGenerales && data.observationsGenerales.trim() !== "") count++
  
  // Signatures
  if (data.signatures) {
    if (data.signatures.bailleur) count++
    if (data.signatures.locataire) count++
    if (data.signatures.mandataire) count++
  }

  return count
}

// Fonction pour calculer le pourcentage de complétion d'un rapport
function calculateCompletionPercentage(data: any): number {
  const totalFields = countTotalFields(data);
  const filledFields = countFilledFields(data);
  return Math.round((filledFields / totalFields) * 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
}

