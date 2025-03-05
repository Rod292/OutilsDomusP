"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EtatSelector } from "./etat-selector"
import { PhotoUpload } from "./photo-upload"
import { ChevronDown, ChevronUp } from "lucide-react"

interface PieceFormProps {
  piece: {
    id: string
    nom: string
    description?: string
    etat: Record<string, string>
    commentaires: Record<string, string>
    commentaireGeneral: string
    photos: Array<string | File>
  }
  index: number
  onFieldUpdate: (index: number, field: string, value: any) => void
  etatOptions: string[]
  onPhotoUpload: (index: number, files: FileList) => void
  onRemovePhoto: (index: number, photoIndex: number) => void
  isOpen: boolean
  onToggle: () => void
}

export function PieceForm({ 
  piece, 
  index, 
  onFieldUpdate, 
  etatOptions, 
  onPhotoUpload, 
  onRemovePhoto,
  isOpen,
  onToggle
}: PieceFormProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const elements = [
    { id: "murs", label: "Murs" },
    { id: "sols", label: "Sols" },
    { id: "plafond", label: "Plafond" },
    { id: "portes", label: "Portes, menuiserie" },
    { id: "fenetres", label: "Fenêtres (vitres, volets)" },
    { id: "rangement", label: "Rangement, placard" },
    { id: "electricite", label: "Electricité (lumière, prises,...)" },
    { id: "chauffage", label: "Chauffage, tuyauterie" },
    { id: "ventilation", label: "Ventilation" },
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleEtatChange = (elementId: string, value: string) => {
    onFieldUpdate(index, `etat.${elementId}`, value);
  };

  const handleCommentChange = (elementId: string, value: string) => {
    onFieldUpdate(index, `commentaires.${elementId}`, value);
  };

  const handleGeneralCommentChange = (value: string) => {
    onFieldUpdate(index, "commentaireGeneral", value);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors duration-200 border border-gray-200"
      >
        <span className="font-medium text-gray-700">Détails de la pièce</span>
        <div className="bg-white rounded-full p-1 shadow-sm">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-6 pt-2 pl-2">
          {elements.map((element) => (
            <div key={element.id} className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection(element.id)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <span className="font-medium text-gray-700">{element.label}</span>
                <div className="bg-white rounded-full p-1 shadow-sm">
                  {expandedSections[element.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              
              {expandedSections[element.id] && (
                <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">État</Label>
                    <EtatSelector
                      value={piece.etat[element.id] || ""}
                      onChange={(value) => handleEtatChange(element.id, value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Commentaire</Label>
                    <Textarea
                      placeholder={`Commentaire pour ${element.label.toLowerCase()}`}
                      value={piece.commentaires[element.id] || ""}
                      onChange={(e) => handleCommentChange(element.id, e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="space-y-4 border border-gray-200 rounded-md p-4 shadow-sm">
            <Label htmlFor={`commentaireGeneral-${index}`} className="text-sm font-medium block">
              Commentaire général
            </Label>
            <Textarea
              id={`commentaireGeneral-${index}`}
              value={piece.commentaireGeneral}
              onChange={(e) => handleGeneralCommentChange(e.target.value)}
              placeholder="Ajoutez un commentaire général..."
              className="min-h-[100px] text-sm"
            />
          </div>
          
          <div className="space-y-4 border border-gray-200 rounded-md p-4 shadow-sm">
            <Label className="text-sm font-medium block">Photos de la pièce</Label>
            <PhotoUpload 
              piece={piece} 
              onChange={(updatedPhotos) => {
                onFieldUpdate(index, "photos", updatedPhotos);
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

