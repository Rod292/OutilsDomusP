"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { isTestMode } from "@/app/utils/docuseal"
import { DocuSealEmbed } from "./docuseal-embed"

interface SignatureConfigModalProps {
  isOpen: boolean
  onClose: () => void
  templateId?: string
  submissionId?: string
  onComplete?: (data: any) => void
  isEditMode?: boolean
  numericTemplateId?: string
}

// Interface simplifiée car on n'a plus besoin des emails
export interface SignatureConfigData {}

export function SignatureConfigModal({ 
  isOpen, 
  onClose,
  templateId,
  submissionId,
  onComplete,
  isEditMode = false,
  numericTemplateId
}: SignatureConfigModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ajouter un effet pour vérifier les identifiants
  useEffect(() => {
    if (isOpen) {
      console.log("SignatureConfigModal ouvert avec les identifiants:", {
        templateId,
        submissionId,
        isEditMode,
        numericTemplateId
      });

      // Vérifier que les identifiants nécessaires sont présents
      if (isEditMode && !templateId && !numericTemplateId) {
        console.error("Mode édition activé mais aucun identifiant de template fourni");
        setError("Aucun identifiant de template disponible. Veuillez d'abord générer un document.");
      } else {
        setError(null);
      }
    }
  }, [isOpen, templateId, submissionId, isEditMode, numericTemplateId]);

  const handleComplete = (data: any) => {
    console.log("Document signé avec succès:", data)
    if (onComplete) onComplete(data)
    
    // Fermer après un court délai
    setTimeout(() => onClose(), 1500)
  }

  const handleError = (error: any) => {
    console.error("Erreur DocuSeal:", error)
    setError("Une erreur est survenue lors de la configuration de signature")
    toast({
      title: "Erreur",
      description: "Une erreur est survenue lors de la configuration de signature",
      variant: "destructive"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="max-w-6xl min-w-[80vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>
            {isEditMode 
              ? "Configurer le modèle de signature" 
              : "Configurer la signature électronique"}
          </DialogTitle>
        </DialogHeader>
        
        {isTestMode() && (
          <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700 mx-4 mb-2">
            Vous êtes en mode test. Les signatures générées ne seront pas juridiquement valides.
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-destructive/10 p-4 rounded-md border border-destructive max-w-md">
                <h3 className="font-semibold text-destructive mb-2">Erreur de configuration</h3>
                <p className="text-sm">{error}</p>
              </div>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={onClose}
              >
                Fermer
              </Button>
            </div>
          ) : (
            <DocuSealEmbed 
              templateId={templateId}
              submissionId={submissionId}
              onComplete={handleComplete}
              onError={handleError}
              height="100%"
              isBuilder={isEditMode}
              numericTemplateId={numericTemplateId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 