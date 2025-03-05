"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { X, Upload, Camera } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface PhotoUploadProps {
  piece: {
    nom: string
    photos: Array<File | string | Record<string, any>>
  }
  onChange: (updatedPhotos: Array<File | string | Record<string, any>>) => void
}

export function PhotoUpload({ piece, onChange }: PhotoUploadProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updatePreviewUrls = useCallback(() => {
    // Clean up previous URLs
    const urls = piece.photos.map((photo) => {
      // Vérifier si la photo est déjà un URL (string)
      if (typeof photo === 'string') {
        return photo;
      }
      
      // Vérifier si c'est un objet File
      if (photo instanceof File) {
        return URL.createObjectURL(photo);
      }
      
      // Vérifier si c'est un objet avec une propriété url ou src
      if (photo && typeof photo === 'object') {
        // Vérifier toutes les propriétés possibles où une URL pourrait être stockée
        if ('downloadUrl' in photo) return photo.downloadUrl;
        if ('url' in photo) return photo.url;
        if ('src' in photo) return photo.src;
        if ('path' in photo) return photo.path;
        if ('preview' in photo) return photo.preview;
        
        // Tenter de trouver une propriété qui pourrait contenir une URL
        for (const key in photo) {
          const value = photo[key];
          if (typeof value === 'string' && 
             (value.startsWith('http') || value.startsWith('data:'))) {
            console.log(`URL trouvée dans la propriété ${key}:`, value.substring(0, 30));
            return value;
          }
        }
        
        // Objet complexe - afficher des informations de débogage
        console.log("Objet photo complexe:", photo);
      }
      
      // Fallback: utiliser une image placeholder
      console.warn("Type de photo non reconnu:", photo);
      return "/placeholder.svg";
    });
    
    setPreviewUrls(urls);

    // Cleanup function - ne revoke que les URLs créées par createObjectURL
    return () => {
      urls.forEach((url, index) => {
        const photo = piece.photos[index];
        if (photo instanceof File && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [piece.photos, setPreviewUrls]) // Added setPreviewUrls to dependencies

  useEffect(() => {
    updatePreviewUrls()
  }, [updatePreviewUrls])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files)
      onChange([...piece.photos, ...newPhotos])
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = [...piece.photos]
    newPhotos.splice(index, 1)
    onChange(newPhotos)
  }

  const triggerFileInput = (captureMode: boolean) => {
    if (fileInputRef.current) {
      fileInputRef.current.capture = captureMode ? "environment" : ""
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => triggerFileInput(true)}
        >
          <Camera className="h-4 w-4" />
          Prendre des photos
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => triggerFileInput(false)}
        >
          <Upload className="h-4 w-4" />
          Ajouter des photos
        </Button>
        <Input
          type="file"
          id={`photos-${piece.nom}`}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoUpload}
          ref={fileInputRef}
        />
        <span className="text-sm text-muted-foreground">
          {piece.photos.length} photo{piece.photos.length !== 1 ? "s" : ""} sélectionnée
          {piece.photos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <Image
                src={url || "/placeholder.svg"}
                alt={`Photo ${index + 1}`}
                fill
                className="rounded-lg object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}