"use client"

import { useEffect, useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { DocusealBuilder, DocusealForm } from "@docuseal/react"

interface DocuSealEmbedProps {
  templateId?: string
  submissionId?: string
  onComplete?: (data: any) => void
  onError?: (error: any) => void
  height?: string
  email?: string
  // Nouveau paramètre pour déterminer si on utilise le builder ou le form
  isBuilder?: boolean
  // Nouveau paramètre pour l'ID numérique du template (pour le Builder)
  numericTemplateId?: string
}

export function DocuSealEmbed({
  templateId,
  submissionId,
  onComplete,
  onError,
  height = "800px",
  email = "agencebrest@arthurloydbretagne.fr", // Pré-remplir avec l'email par défaut
  isBuilder = false,  // Par défaut, utiliser le formulaire simple
  numericTemplateId  // ID numérique pour le Builder
}: DocuSealEmbedProps) {
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isBuilder)
  
  // Déterminer la source en fonction du type (template ou soumission)
  const src = submissionId 
    ? `https://docuseal.com/s/${submissionId}`
    : templateId
      ? `https://docuseal.com/d/${templateId}`
      : null;
  
  // Récupérer le token JWT si on est en mode builder
  useEffect(() => {
    if (!isBuilder) return;
    
    const fetchToken = async () => {
      try {
        setIsLoading(true);
        // Utiliser l'ID numérique pour le builder si disponible
        const idToUse = numericTemplateId || templateId;
        
        // S'assurer que nous passons toujours un ID existant pour éditer un template existant
        if (!idToUse) {
          console.error("Tentative d'ouverture du builder sans identifiant", {
            numericTemplateId,
            templateId,
            isBuilder
          });
          throw new Error("Aucun identifiant de template fourni pour le mode édition");
        }
        
        // Ajout d'un paramètre pour indiquer si nous avons un template existant
        // Ajouter un paramètre edit=true pour forcer le mode édition
        const url = `/api/docuseal-token?templateId=${idToUse}&edit=true`;
          
        console.log("Récupération du token avec URL:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Impossible de récupérer le token d'authentification");
        }
        
        const data = await response.json();
        console.log("Token reçu pour DocuSeal Builder avec les données:", 
          { tokenExists: !!data.token, templateIdProvided: !!idToUse });
        
        if (!data.token) {
          throw new Error("Le token reçu est invalide ou vide");
        }
        
        setToken(data.token);
        
        // Ajouter un gestionnaire d'événement global pour capturer l'événement de complétion
        // car DocusealBuilder n'accepte pas de prop onComplete
        window.addEventListener('message', function messageHandler(event) {
          if (event.data && event.data.type === 'docuseal:template_completed') {
            console.log('DocuSealEmbed: Template configuré via message', event.data);
            
            if (onComplete) {
              onComplete(event.data);
            }
            
            toast({
              title: "Configuration terminée",
              description: "Le modèle a été configuré avec succès",
            });
            
            // Nettoyer l'écouteur après utilisation
            window.removeEventListener('message', messageHandler);
          }
        });
      } catch (err) {
        console.error("Erreur lors de la récupération du token:", err);
        setError("Erreur d'authentification avec DocuSeal");
        if (onError) onError({ message: "Erreur d'authentification" });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchToken();
    
    // Nettoyage des écouteurs lors du démontage
    return () => {
      // Les écouteurs de message spécifiques sont nettoyés à la complétion
    };
  }, [isBuilder, onComplete, onError, templateId, numericTemplateId]);
  
  // Si aucune source n'est définie en mode formulaire, afficher une erreur
  useEffect(() => {
    if (isBuilder) return; // Ne pas vérifier en mode builder
    
    if (!src) {
      setError("Erreur de configuration: Aucun identifiant de template ou de soumission fourni");
      if (onError) {
        onError({ message: "Aucun identifiant de template ou de soumission fourni" });
      }
    } else {
      setError(null);
    }
  }, [src, onError, isBuilder]);
  
  // Gestionnaire pour l'événement complete (uniquement pour DocusealForm)
  const handleComplete = (data: any) => {
    console.log("DocuSealEmbed: Formulaire complété", data);
    
    if (onComplete) {
      onComplete(data);
    }
    
    toast({
      title: "Signature terminée",
      description: "Le document a été signé avec succès",
    });
  };
  
  // Gestion des erreurs globales
  useEffect(() => {
    // Fonction pour intercepter les erreurs globales liées au chargement de l'iframe
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message.includes("docuseal") || event.message.includes("iframe")) {
        console.error("DocuSealEmbed: Erreur globale interceptée", event);
        setError("Erreur lors du chargement de l'interface DocuSeal. Vérifiez votre connexion et les identifiants.");
        
        if (onError) {
          onError({ message: event.message });
        }
        
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement de DocuSeal",
          variant: "destructive"
        });
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, [onError]);
  
  // Ajouter des styles CSS pour s'assurer que l'iframe est correctement dimensionné
  useEffect(() => {
    if (isBuilder && token) {
      // Les iframes dans DocuSeal peuvent parfois avoir besoin d'ajustements CSS
      const adjustDocusealStyles = () => {
        try {
          // Trouver tous les iframes dans le composant
          const iframes = document.querySelectorAll('.docuseal-builder iframe');
          
          if (iframes && iframes.length > 0) {
            console.log(`Ajustement des styles pour ${iframes.length} iframes DocuSeal`);
            
            iframes.forEach((iframe: any) => {
              // S'assurer que l'iframe permet le défilement
              if (iframe.style) {
                iframe.style.height = '100%';
                iframe.style.width = '100%';
                iframe.style.overflow = 'auto';
                iframe.style.display = 'block';
                iframe.style.border = 'none';
              }
              
              // Si possible, ajuster le contenu de l'iframe aussi
              try {
                if (iframe.contentDocument) {
                  const iframeBody = iframe.contentDocument.body;
                  if (iframeBody) {
                    iframeBody.style.overflow = 'auto';
                  }
                }
              } catch (e) {
                // Les erreurs cross-origin peuvent se produire ici, ignorer
                console.log('Impossible d\'accéder au contenu de l\'iframe (cross-origin)');
              }
            });
          }
        } catch (e) {
          console.error('Erreur lors de l\'ajustement des styles DocuSeal:', e);
        }
      };
      
      // Appliquer les ajustements après un court délai
      const timer = setTimeout(adjustDocusealStyles, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isBuilder, token]);
  
  // Afficher un chargement pendant la récupération du token
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center" style={{ minHeight: height }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            Chargement de l'interface {isBuilder ? "d'édition" : "de signature"}...
          </p>
        </div>
      </div>
    );
  }
  
  // Si on est en mode builder et qu'on n'a pas de token, afficher une erreur
  if (isBuilder && !token) {
    return (
      <div className="w-full flex items-center justify-center bg-destructive/10 p-4 rounded-md border border-destructive" style={{ minHeight: height }}>
        <div className="max-w-md">
          <h3 className="font-semibold text-destructive mb-2">Erreur d'authentification</h3>
          <p className="text-sm">Impossible d'initialiser l'interface d'édition DocuSeal</p>
        </div>
      </div>
    );
  }
  
  // Si aucune source en mode formulaire, ne rien afficher (sauf l'erreur)
  if (!isBuilder && !src) {
    return (
      <div className="w-full flex items-center justify-center bg-destructive/10 p-4 rounded-md border border-destructive" style={{ minHeight: height }}>
        <div className="max-w-md">
          <h3 className="font-semibold text-destructive mb-2">Erreur de configuration</h3>
          <p className="text-sm">Aucun identifiant de template ou de soumission fourni</p>
        </div>
      </div>
    );
  }
  
  console.log("Configuration de DocuSeal:", {
    isBuilder,
    hasTemplateId: !!templateId,
    hasNumericId: !!numericTemplateId,
    hasToken: !!token,
    email
  });
  
  return (
    <div className="w-full relative docuseal-builder" style={{ 
      minHeight: height, 
      width: "100%", 
      maxHeight: "calc(90vh - 150px)",
      overflow: "hidden"  // Contenir les débordements
    }}>
      {isBuilder ? (
        // Interface d'édition complète avec DocusealBuilder
        <DocusealBuilder
          token={token as string}
          style={{ 
            height: "100%", 
            width: "100%",
            border: "none",
            // Améliorer les styles pour assurer que le contenu est scrollable
            display: "block",
            minHeight: height,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "auto"
          }}
        />
      ) : (
        // Formulaire de signature avec DocusealForm
        <DocusealForm
          src={src as string}
          email={email}
          onComplete={handleComplete}
          style={{ 
            height: "100%", 
            width: "100%",
            border: "none",
            // Améliorer les styles pour assurer que le contenu est scrollable
            display: "block",
            minHeight: height,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "auto"
          }}
        />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="bg-destructive/10 p-4 rounded-md border border-destructive max-w-md">
            <h3 className="font-semibold text-destructive mb-2">Erreur de chargement</h3>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
} 