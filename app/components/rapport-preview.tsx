"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { generateEtatDesLieuxPDF } from "@/app/utils/generateEtatDesLieuxPDF"
import { Download, Printer, FileText, ExternalLink, Check, AlertCircle, Edit } from "lucide-react"
import { formatDate, getTypeBienLabel } from "@/app/utils/format-helpers"
import React from "react"

interface RapportPreviewProps {
  formData: any
  onEdit?: () => void
}

export function RapportPreview({ formData, onEdit }: RapportPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [generationSuccess, setGenerationSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validFormData, setValidFormData] = useState<any>(null)

  // Ajout de logs pour déboguer et validation des données
  useEffect(() => {
    console.log("RapportPreview - Données reçues:", formData);
    
    try {
      // Vérifier que formData est un objet valide et non un objet React
      if (formData && typeof formData === 'object' && !React.isValidElement(formData)) {
        // Créer une copie sécurisée des données
        const safeData = JSON.parse(JSON.stringify(formData));
        setValidFormData(safeData);
        console.log("Propriétés de niveau supérieur:", Object.keys(safeData));
        
        // Vérifier les pièces
        if (safeData.pieces) {
          console.log("Nombre de pièces:", safeData.pieces.length);
          if (safeData.pieces.length > 0) {
            console.log("Structure de la première pièce:", Object.keys(safeData.pieces[0]));
            
            // Vérifier la présence de l'objet etat
            if (safeData.pieces[0].etat) {
              console.log("Structure de l'objet etat:", Object.keys(safeData.pieces[0].etat));
            } else {
              console.warn("Attention: L'objet etat est manquant dans la première pièce");
            }
            
            // Vérifier les photos
            if (safeData.pieces[0].photos) {
              console.log("Nombre de photos dans la première pièce:", safeData.pieces[0].photos.length);
              if (safeData.pieces[0].photos.length > 0) {
                console.log("Type de la première photo:", typeof safeData.pieces[0].photos[0]);
              }
            } else {
              console.warn("Attention: L'objet photos est manquant dans la première pièce");
            }
          }
        } else {
          console.warn("Attention: La propriété pieces est absente ou null");
        }
        
        // Vérifier les compteurs
        if (safeData.compteurs) {
          console.log("Structure des compteurs:", Object.keys(safeData.compteurs));
        } else {
          console.warn("Attention: La propriété compteurs est absente ou null");
        }
      } else {
        console.error("formData n'est pas un objet valide:", formData);
        setError("Données de formulaire invalides");
        setValidFormData(null);
      }
    } catch (err) {
      console.error("Erreur lors du traitement des données:", err);
      setError(`Erreur de traitement: ${err instanceof Error ? err.message : "Erreur inconnue"}`);
      setValidFormData(null);
    }
  }, [formData]);

  // Générer le PDF et l'ouvrir dans un nouvel onglet
  const handleOpenPreview = async () => {
    try {
      console.log("Début de la prévisualisation du PDF")
      setLoading(true)
      setError(null)
      
      // Vérification de base des données
      if (!validFormData) {
        throw new Error("Aucune donnée de formulaire disponible")
      }
      
      console.log("Données du formulaire pour la prévisualisation:", {
        typeEtatDesLieux: validFormData.typeEtatDesLieux,
        typeBien: validFormData.typeBien,
        dateEtatDesLieux: validFormData.dateEtatDesLieux
      })
      
      await generateEtatDesLieuxPDF(validFormData, { openInNewTab: true })
      console.log("Prévisualisation du PDF générée avec succès")
      setGenerationSuccess(true)
    } catch (error) {
      console.error("Erreur lors de la prévisualisation du PDF:", error)
      setError(`Erreur de génération: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setLoading(false)
    }
  }

  // Télécharger le PDF
  const handleDownload = async () => {
    try {
      console.log("Début du téléchargement du PDF")
      setLoading(true)
      setError(null)
      
      // Vérification de base des données
      if (!validFormData) {
        throw new Error("Aucune donnée de formulaire disponible")
      }
      
      const filename = `etat-des-lieux-${validFormData.typeEtatDesLieux === 'entree' ? 'entree' : 'sortie'}-${new Date().toISOString().split('T')[0]}.pdf`
      console.log("Nom du fichier PDF:", filename)
      
      console.log("Données du formulaire pour le téléchargement:", {
        typeEtatDesLieux: validFormData.typeEtatDesLieux,
        typeBien: validFormData.typeBien,
        dateEtatDesLieux: validFormData.dateEtatDesLieux
      })
      
      await generateEtatDesLieuxPDF(validFormData, {
        filename: filename,
        openInNewTab: false
      })
      console.log("Téléchargement du PDF généré avec succès")
      setGenerationSuccess(true)
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error)
      setError(`Erreur de génération: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setLoading(false)
    }
  }

  // Simuler un chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Rendu conditionnel pour éviter les erreurs
  if (!validFormData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="p-6 bg-white rounded-lg shadow-md text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Données invalides</h3>
          <p className="text-muted-foreground">
            Les données du rapport sont invalides ou incomplètes. Veuillez regénérer le rapport.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Génération de la prévisualisation...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Vérifier que validFormData existe avant de l'utiliser */}
      {validFormData ? (
        <div className="bg-card rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* En-tête avec titre et boutons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary">
                  {typeof validFormData.typeEtatDesLieux === 'string' 
                    ? `État des lieux ${validFormData.typeEtatDesLieux === 'entree' ? "d'entrée" : "de sortie"}`
                    : "État des lieux"}
                </h2>
                <p className="text-muted-foreground">
                  {typeof validFormData.adresseBien === 'string' ? validFormData.adresseBien : 'Adresse non spécifiée'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleOpenPreview} disabled={loading}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Prévisualiser
                </Button>
                <Button variant="default" size="sm" onClick={handleDownload} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Message de succès après génération */}
            {generationSuccess && !error && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-sm text-green-700">Document généré avec succès</p>
              </div>
            )}

            {/* Prévisualisation du document */}
            <div className="border rounded-lg overflow-hidden bg-white">
              {/* Header du document */}
              <div className="bg-primary h-4"></div>
              
              <div className="p-6">
                {/* Page de garde simulée */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-primary">ÉTAT DES LIEUX</h3>
                  <p className="text-lg font-semibold">
                    {typeof validFormData.typeEtatDesLieux === 'string' 
                      ? (validFormData.typeEtatDesLieux === 'entree' ? 'ENTRÉE' : 'SORTIE')
                      : ''}
                  </p>
                  <div className="w-32 h-1 bg-primary mx-auto my-4"></div>
                  
                  <div className="mt-6 inline-block text-left bg-gray-50 p-4 rounded-md">
                    <p className="font-semibold mb-1">Bien immobilier:</p>
                    <p className="text-sm italic mb-3">
                      {typeof validFormData.typeBien === 'string' 
                        ? getTypeBienLabel(validFormData.typeBien)
                        : 'Non spécifié'}
                    </p>
                    
                    <p className="font-semibold mb-1">Adresse:</p>
                    <p className="text-sm italic mb-3">
                      {typeof validFormData.adresseBien === 'string' ? validFormData.adresseBien : ''}, 
                      {typeof validFormData.codePostalBien === 'string' ? validFormData.codePostalBien : ''} 
                      {typeof validFormData.villeBien === 'string' ? validFormData.villeBien : ''}
                    </p>
                    
                    <p className="font-semibold mb-1">Date:</p>
                    <p className="text-sm italic">
                      {validFormData.dateEtatDesLieux ? formatDate(validFormData.dateEtatDesLieux) : 'Non spécifiée'}
                    </p>
                  </div>
                </div>
                
                {/* Parties concernées */}
                <div className="mb-8">
                  <div className="border rounded-md p-4 bg-gray-50 mb-6">
                    <h4 className="font-semibold text-primary mb-3">Parties concernées</h4>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-primary text-sm">Propriétaire:</p>
                        <p className="text-sm">{validFormData.bailleur?.prenom || ''} {validFormData.bailleur?.nom || ''}</p>
                        <p className="text-xs text-gray-500">{validFormData.bailleur?.adresse || ''}, {validFormData.bailleur?.codePostal || ''} {validFormData.bailleur?.ville || ''}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-primary text-sm">Locataire:</p>
                        <p className="text-sm">{validFormData.locataire?.prenom || ''} {validFormData.locataire?.nom || ''}</p>
                        <p className="text-xs text-gray-500">{validFormData.locataire?.adresse || ''}, {validFormData.locataire?.codePostal || ''} {validFormData.locataire?.ville || ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Aperçu du sommaire */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-primary mb-4">SOMMAIRE</h3>
                  <ol className="list-decimal list-inside ml-4 space-y-2">
                    <li className="flex items-center">
                      <span>RELEVÉS DES COMPTEURS</span>
                      <span className="flex-grow border-b border-dashed border-gray-300 mx-2"></span>
                      <span>3</span>
                    </li>
                    <li className="flex items-center">
                      <span>PIÈCES ET ÉQUIPEMENTS</span>
                      <span className="flex-grow border-b border-dashed border-gray-300 mx-2"></span>
                      <span>4</span>
                    </li>
                    <li className="flex items-center">
                      <span>OBSERVATIONS GÉNÉRALES</span>
                      <span className="flex-grow border-b border-dashed border-gray-300 mx-2"></span>
                      <span>12</span>
                    </li>
                    <li className="flex items-center">
                      <span>SIGNATURES</span>
                      <span className="flex-grow border-b border-dashed border-gray-300 mx-2"></span>
                      <span>15</span>
                    </li>
                  </ol>
                </div>
                
                {/* Aperçu des compteurs */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-primary mb-2">1. RELEVÉS DES COMPTEURS</h3>
                  <div className="h-1 w-full bg-primary mb-4"></div>
                  
                  {validFormData.compteurs?.electricite?.presence && (
                    <div className="mb-4">
                      <h4 className="font-medium text-primary">ÉLECTRICITÉ</h4>
                      <table className="w-full mt-2 border">
                        <thead className="bg-primary text-white">
                          <tr>
                            <th className="py-1 px-2 text-xs text-left">INFORMATION</th>
                            <th className="py-1 px-2 text-xs text-left">DÉTAIL</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-1 px-2 text-xs font-medium bg-gray-50">Numéro du compteur</td>
                            <td className="py-1 px-2 text-xs">{validFormData.compteurs.electricite.numero || 'Non renseigné'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 px-2 text-xs font-medium bg-gray-50">Relevé</td>
                            <td className="py-1 px-2 text-xs">{validFormData.compteurs.electricite.releve || 'Non renseigné'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 px-2 text-xs font-medium bg-gray-50">Localisation</td>
                            <td className="py-1 px-2 text-xs">{validFormData.compteurs.electricite.localisation || 'Non renseigné'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {validFormData.compteurs?.eau?.presence && (
                    <div className="mb-4">
                      <h4 className="font-medium text-primary">EAU</h4>
                      <table className="w-full mt-2 border">
                        <thead className="bg-primary text-white">
                          <tr>
                            <th className="py-1 px-2 text-xs text-left">INFORMATION</th>
                            <th className="py-1 px-2 text-xs text-left">DÉTAIL</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-1 px-2 text-xs font-medium bg-gray-50">Numéro du compteur</td>
                            <td className="py-1 px-2 text-xs">{validFormData.compteurs.eau.numero || 'Non renseigné'}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1 px-2 text-xs font-medium bg-gray-50">Relevé</td>
                            <td className="py-1 px-2 text-xs">{validFormData.compteurs.eau.releve || 'Non renseigné'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Aperçu des pièces */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">2. PIÈCES ET ÉQUIPEMENTS</h3>
                  <div className="h-1 w-full bg-primary mb-4"></div>
                  
                  {validFormData.pieces && validFormData.pieces.length > 0 ? (
                    <>
                      <h4 className="font-medium">2.1 {validFormData.pieces[0].nom || 'Pièce 1'}</h4>
                      <div className="h-0.5 w-full bg-primary mb-4 opacity-30"></div>
                      
                      <table className="w-full mt-2 border text-xs">
                        <thead className="bg-primary text-white">
                          <tr>
                            <th className="py-1 px-2 text-left w-1/4">ÉLÉMENT</th>
                            <th className="py-1 px-2 text-left w-1/4">ÉTAT</th>
                            <th className="py-1 px-2 text-left w-2/4">COMMENTAIRE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Murs', 'Sols', 'Plafond', 'Portes', 'Fenêtres'].map((element, idx) => {
                            const elementKey = element.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const etatValue = validFormData.pieces[0].etat?.[elementKey] || 'Non renseigné';
                            let etatColor = '#4B5563'; // Couleur par défaut
                            
                            // Déterminer la couleur en fonction de l'état
                            if (etatValue.toLowerCase().includes('bon')) {
                              etatColor = '#22c55e'; // Vert
                            } else if (etatValue.toLowerCase().includes('moyen') || etatValue.toLowerCase().includes('usage')) {
                              etatColor = '#f59e0b'; // Orange
                            } else if (etatValue.toLowerCase().includes('mauvais') || etatValue.toLowerCase().includes('remplacer')) {
                              etatColor = '#ef4444'; // Rouge
                            }
                            
                            return (
                              <tr key={idx} className="border-b">
                                <td className="py-1 px-2 font-medium bg-gray-50">{element}</td>
                                <td className="py-1 px-2" style={{ color: etatColor }}>{etatValue}</td>
                                <td className="py-1 px-2">{validFormData.pieces[0].etat?.[`${elementKey}Commentaire`] || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {/* Ajouter des photos si disponibles */}
                      {validFormData?.pieces?.[0]?.photos && Array.isArray(validFormData.pieces[0].photos) && validFormData.pieces[0].photos.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium mb-2">Photos</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {validFormData.pieces[0].photos.slice(0, 2).map((photo: any, idx: number) => {
                              // Déterminer l'URL de la photo en fonction de son type
                              let photoUrl = '';
                              if (typeof photo === 'string') {
                                photoUrl = photo;
                              } else if (photo && typeof photo === 'object') {
                                // Essayer de trouver une URL dans l'objet photo
                                if ('url' in photo) photoUrl = photo.url;
                                else if ('downloadUrl' in photo) photoUrl = photo.downloadUrl;
                                else if ('src' in photo) photoUrl = photo.src;
                                else if ('path' in photo) photoUrl = photo.path;
                              }
                              
                              return (
                                <div key={idx} className="border rounded overflow-hidden h-24 bg-gray-100">
                                  {photoUrl ? (
                                    <img src={photoUrl} alt={`Photo ${idx+1}`} className="object-cover w-full h-full" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <span className="text-xs">Photo non disponible</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm italic text-gray-500">Aucune pièce renseignée</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    (Aperçu simplifié - Le PDF contient toutes les pièces et leurs détails)
                  </p>
                </div>
              </div>
              
              <div className="bg-primary h-0.5 mt-4"></div>
            </div>

            <div className="border rounded-md p-4 bg-muted/30">
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Le document PDF complet inclut :</p>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                    <li>Une page de garde professionnelle</li>
                    <li>Un sommaire détaillé</li>
                    <li>Les relevés de tous les compteurs</li>
                    <li>L'état détaillé de chaque pièce</li>
                    <li>Les photos incluses dans le formulaire</li>
                    <li>Un espace pour les signatures</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-md p-6 max-w-4xl mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Données manquantes</h3>
          <p className="text-muted-foreground">
            Impossible d'afficher l'aperçu car les données sont manquantes ou invalides.
          </p>
        </div>
      )}
    </div>
  )
}

// Note: Les fonctions utilitaires ont été déplacées dans un fichier séparé app/utils/format-helpers.ts 