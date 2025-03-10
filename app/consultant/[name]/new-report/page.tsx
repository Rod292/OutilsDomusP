"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
// Remplacer l'import direct par une vérification conditionnelle
// import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/app/lib/firebase"
import { NavigationTabs } from "@/app/components/navigation-tabs"
import { Header } from "@/app/components/header"
import { ProgressBar } from "@/app/components/progress-bar"
import { EtatDesLieuxForm } from "@/app/components/etat-des-lieux-form"
import { RapportPreview } from "@/app/components/rapport-preview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Download, Copy } from "lucide-react"
import { collection, query, where, getDocs, getDocsFromServer, addDoc, updateDoc, deleteDoc, doc, Firestore, orderBy, limit } from "firebase/firestore"
import { FirebaseError } from "firebase/app"
import { generateEtatDesLieuxPDF } from "@/app/utils/generateEtatDesLieuxPDF"
import { sanitizeReportDataForFirestore } from "@/app/utils/formatDataForStorage"
import { toast } from "@/components/ui/use-toast"

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

export default function NewReportPage({ params }: { params: { name: string } }) {
  const [activeTab, setActiveTab] = useState<"form" | "preview" | "recent">("form")
  const [progress, setProgress] = useState(0)
  const [rapport, setRapport] = useState<string | null>(null)
  const [formData, setFormData] = useState(null)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<any[]>([])
  const router = useRouter()
  
  // Remplacer useAuthState par une gestion manuelle de l'état utilisateur
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const consultantName = params.name.replace("-", " ")

  // Ne pas vérifier auth.currentUser ici car auth pourrait ne pas être initialisé
  // if (auth.currentUser === null) {
  //   router.push("/")
  // }

  // Effet pour vérifier l'authentification
  useEffect(() => {
    if (!auth) {
      console.error("La référence à auth est null")
      router.push("/")
      return
    }

    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setLoading(false)
      setUser(authUser)
      
      if (!authUser) {
        router.push("/")
      } else {
        fetchRecentReports()
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchRecentReports = async () => {
    // Vérifier que auth et db ne sont pas null
    if (!auth || !db) {
      console.error("La référence à auth ou db est null")
      return
    }

    try {
      console.log("Récupération des rapports récents...")
      const reportsRef = collection(db as Firestore, "reports")
      
      // Créer une requête pour obtenir les rapports du consultant actuel
      // Attention, tous les champs utilisés dans orderBy doivent être indexés et présents
      // Pour éviter les erreurs avec les anciens rapports sans lastUpdated, 
      // on utilise uniquement where puis on trie manuellement
      const q = query(
        reportsRef, 
        where("consultant", "==", consultantName)
      )
      
      // Forcer la récupération des données fraîches depuis le serveur
      // en désactivant explicitement le cache pour cette requête
      const querySnapshot = await getDocsFromServer(q)
      
      console.log("Nombre de rapports récupérés de Firestore:", querySnapshot.size)
      
      const reports: RecentReport[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Rapport trouvé - ID: ${doc.id}, Titre: ${data.title}, Date: ${data.date}, MàJ: ${data.lastUpdated || 'N/A'}`);
        reports.push({ id: doc.id, ...data } as RecentReport)
      })

      // Tri par date de dernière mise à jour (si disponible) ou par date de création
      // pour assurer le bon fonctionnement même avec d'anciens rapports
      reports.sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : new Date(a.date).getTime();
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      })

      console.log("Nombre total de rapports après tri:", reports.length)
      setRecentReports(reports)
    } catch (error) {
      console.error("Erreur lors de la récupération des rapports récents:", error)
    }
  }

  const handleTabChange = (tab: "form" | "preview" | "recent") => {
    if (tab === "form" && activeTab !== "form") {
      setFormData(null)
      setEditingReportId(null)
    }
    if (tab === "recent") {
      fetchRecentReports()
    }
    setActiveTab(tab)
  }

  const handleEditReport = (report: any) => {
    setFormData(report.data)
    setEditingReportId(report.id)
    setActiveTab("form")
  }

  const handleRapportGenerated = async (rapportHtml: string, data: any) => {
    console.log("======= RAPPORT GÉNÉRÉ =======")
    console.log("Données reçues:", data)
    console.log("Navigation vers l'onglet Preview")
    
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
      console.log("Nombre de pièces après nettoyage:", sanitizedData.pieces.length)
      
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
        
        // Naviguer vers l'onglet des rapports récents après la sauvegarde
        // que ce soit pour une création ou une modification
        console.log("Navigation vers l'onglet des rapports récents");
        setActiveTab("recent");
        
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

  const handleProgressUpdate = (value: number) => {
    setProgress(value)
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
    console.log("Chargement du rapport pour édition:", report.id);
    
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
      
      console.log("Rapport corrigé et prêt pour l'édition");
      setFormData(migratedData);
      setEditingReportId(report.id);
      setActiveTab("form");
    } catch (error) {
      console.error("Erreur lors de la préparation du rapport pour l'édition:", error);
      alert("Une erreur est survenue lors du chargement du rapport. Veuillez réessayer.");
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ProgressBar value={typeof progress === 'number' ? progress : 0} />
      <NavigationTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Contenu principal avec un léger zoom pour optimiser l'espace */}
      <main className="mobile-zoom w-full px-0 sm:px-2 pt-4 pb-16">
        {activeTab === "form" && (
          <div className="max-w-full">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 px-1">Nouvel état des lieux</h1>
            <div className="w-full">
              <EtatDesLieuxForm
                onRapportGenerated={handleRapportGenerated}
                initialData={formData}
                onProgressUpdate={handleProgressUpdate}
                consultantName={consultantName}
                editMode={!!editingReportId}
              />
            </div>
          </div>
        )}
        
        {activeTab === "preview" && (
          <div className="max-w-full">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 px-1">Aperçu du rapport</h1>
            {rapport ? (
              <div key={JSON.stringify(formData)}>
                <RapportPreview 
                  formData={formData} 
                />
              </div>
            ) : (
              <div className="p-4 bg-white rounded-lg shadow text-center mx-1">
                <p className="text-gray-500">Générez d'abord un rapport pour voir l'aperçu</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "recent" && (
          <div className="max-w-full">
            {/* Plus d'espacement pour le titre des rapports récents */}
            <h1 className="text-2xl font-bold mb-6 text-gray-800 mt-6 px-1">États des lieux récents</h1>
            
            {recentReports.length > 0 ? (
              <div className="space-y-4 px-1">
                {recentReports.map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg font-bold">{report.title}</CardTitle>
                      <CardDescription>
                        Créé le {new Date(report.date).toLocaleDateString("fr-FR")}
                        {report.lastUpdated && ` - Modifié le ${new Date(report.lastUpdated).toLocaleDateString("fr-FR")}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(report)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Télécharger</span>
                        </Button>
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDuplicate(report)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Dupliquer</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(report)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Modifier</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(report.id)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-white rounded-lg shadow text-center mx-1">
                <p className="text-gray-500">Aucun état des lieux récent</p>
              </div>
            )}
          </div>
        )}
      </main>
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
    count += 7 // dateSignature, dateEntree, dateSortie, dureeContrat, montantLoyer, montantCharges, montantDepotGarantie
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
    if (data.contrat.dateSortie && data.contrat.dateSortie.trim() !== "") count++
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

