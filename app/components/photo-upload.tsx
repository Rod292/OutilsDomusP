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

  // Fonction pour prendre une photo avec l'appareil photo et l'enregistrer dans la galerie
  const takePictureAndSave = async () => {
    // Vérifiez si l'API MediaDevices est disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Votre navigateur ne supporte pas l'accès à l'appareil photo");
      return;
    }

    try {
      // Créer un élément vidéo pour la prévisualisation
      const videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.style.position = 'fixed';
      videoElement.style.top = '0';
      videoElement.style.left = '0';
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.zIndex = '9999';
      videoElement.style.objectFit = 'cover';
      document.body.appendChild(videoElement);

      // Créer des boutons pour prendre une photo, terminer ou annuler
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.position = 'fixed';
      buttonsContainer.style.bottom = '20px';
      buttonsContainer.style.left = '0';
      buttonsContainer.style.right = '0';
      buttonsContainer.style.zIndex = '10000';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.justifyContent = 'center';
      buttonsContainer.style.gap = '20px';
      document.body.appendChild(buttonsContainer);

      const captureButton = document.createElement('button');
      captureButton.innerText = 'Prendre une photo';
      captureButton.style.padding = '15px 25px';
      captureButton.style.borderRadius = '50px';
      captureButton.style.backgroundColor = '#DC0032';
      captureButton.style.color = 'white';
      captureButton.style.border = 'none';
      captureButton.style.fontSize = '16px';
      buttonsContainer.appendChild(captureButton);

      const doneButton = document.createElement('button');
      doneButton.innerText = 'Terminer';
      doneButton.style.padding = '15px 25px';
      doneButton.style.borderRadius = '50px';
      doneButton.style.backgroundColor = '#28a745';
      doneButton.style.color = 'white';
      doneButton.style.border = 'none';
      doneButton.style.fontSize = '16px';
      buttonsContainer.appendChild(doneButton);

      const cancelButton = document.createElement('button');
      cancelButton.innerText = 'Annuler';
      cancelButton.style.padding = '15px 25px';
      cancelButton.style.borderRadius = '50px';
      cancelButton.style.backgroundColor = '#333333';
      cancelButton.style.color = 'white';
      cancelButton.style.border = 'none';
      cancelButton.style.fontSize = '16px';
      buttonsContainer.appendChild(cancelButton);

      // Créer un compteur pour les photos prises
      const counterContainer = document.createElement('div');
      counterContainer.style.position = 'fixed';
      counterContainer.style.top = '20px';
      counterContainer.style.left = '0';
      counterContainer.style.right = '0';
      counterContainer.style.textAlign = 'center';
      counterContainer.style.zIndex = '10000';
      counterContainer.style.color = 'white';
      counterContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
      counterContainer.style.padding = '10px';
      counterContainer.style.fontSize = '18px';
      counterContainer.innerText = 'Photos prises: 0';
      document.body.appendChild(counterContainer);

      // Obtenir l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      videoElement.srcObject = stream;

      // Tableau pour stocker les nouvelles photos
      const newPhotos: File[] = [];
      
      // Fonction pour nettoyer les éléments
      const cleanup = () => {
        if (videoElement.srcObject) {
          const tracks = (videoElement.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
        document.body.removeChild(videoElement);
        document.body.removeChild(buttonsContainer);
        document.body.removeChild(counterContainer);
        
        // Ajouter toutes les nouvelles photos à la collection existante
        if (newPhotos.length > 0) {
          onChange([...piece.photos, ...newPhotos]);
        }
      };

      // Annuler la prise de photo
      cancelButton.onclick = () => {
        cleanup();
      };
      
      // Terminer la séance de photos
      doneButton.onclick = () => {
        cleanup();
      };

      // Prendre une photo
      captureButton.onclick = () => {
        // Créer un canvas pour capturer l'image
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          // Afficher un flash visuel
          const flash = document.createElement('div');
          flash.style.position = 'fixed';
          flash.style.top = '0';
          flash.style.left = '0';
          flash.style.width = '100%';
          flash.style.height = '100%';
          flash.style.backgroundColor = 'white';
          flash.style.opacity = '0.8';
          flash.style.zIndex = '9998';
          flash.style.transition = 'opacity 0.5s';
          document.body.appendChild(flash);
          
          setTimeout(() => {
            document.body.removeChild(flash);
          }, 300);
          
          // Convertir le canvas en blob (image)
          canvas.toBlob((blob) => {
            if (blob) {
              // Créer un fichier à partir du blob
              const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
              
              // Ajouter la photo au tableau temporaire
              newPhotos.push(file);
              
              // Mettre à jour le compteur
              counterContainer.innerText = `Photos prises: ${newPhotos.length}`;
              
              // Sur iOS, pour sauvegarder dans la galerie, on utilise un lien de téléchargement
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = file.name;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
            }
          }, 'image/jpeg', 0.95);
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'accès à l\'appareil photo:', error);
      alert("Impossible d'accéder à l'appareil photo");
    }
  };

  // Fonction pour prendre plusieurs photos à la suite
  const takeMultiplePhotos = async () => {
    // Vérifiez si l'API MediaDevices est disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Votre navigateur ne supporte pas l'accès à l'appareil photo");
      return;
    }

    try {
      // Créer un élément vidéo pour la prévisualisation
      const videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.style.position = 'fixed';
      videoElement.style.top = '0';
      videoElement.style.left = '0';
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.zIndex = '9999';
      videoElement.style.objectFit = 'cover';
      document.body.appendChild(videoElement);

      // Créer des boutons pour prendre une photo, terminer ou annuler
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.position = 'fixed';
      buttonsContainer.style.bottom = '20px';
      buttonsContainer.style.left = '0';
      buttonsContainer.style.right = '0';
      buttonsContainer.style.zIndex = '10000';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.justifyContent = 'center';
      buttonsContainer.style.gap = '20px';
      document.body.appendChild(buttonsContainer);

      const captureButton = document.createElement('button');
      captureButton.innerText = 'Prendre une photo';
      captureButton.style.padding = '15px 25px';
      captureButton.style.borderRadius = '50px';
      captureButton.style.backgroundColor = '#DC0032';
      captureButton.style.color = 'white';
      captureButton.style.border = 'none';
      captureButton.style.fontSize = '16px';
      buttonsContainer.appendChild(captureButton);

      const doneButton = document.createElement('button');
      doneButton.innerText = 'Terminer';
      doneButton.style.padding = '15px 25px';
      doneButton.style.borderRadius = '50px';
      doneButton.style.backgroundColor = '#28a745';
      doneButton.style.color = 'white';
      doneButton.style.border = 'none';
      doneButton.style.fontSize = '16px';
      buttonsContainer.appendChild(doneButton);

      const cancelButton = document.createElement('button');
      cancelButton.innerText = 'Annuler';
      cancelButton.style.padding = '15px 25px';
      cancelButton.style.borderRadius = '50px';
      cancelButton.style.backgroundColor = '#333333';
      cancelButton.style.color = 'white';
      cancelButton.style.border = 'none';
      cancelButton.style.fontSize = '16px';
      buttonsContainer.appendChild(cancelButton);

      // Créer un compteur pour les photos prises
      const counterContainer = document.createElement('div');
      counterContainer.style.position = 'fixed';
      counterContainer.style.top = '20px';
      counterContainer.style.left = '0';
      counterContainer.style.right = '0';
      counterContainer.style.textAlign = 'center';
      counterContainer.style.zIndex = '10000';
      counterContainer.style.color = 'white';
      counterContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
      counterContainer.style.padding = '10px';
      counterContainer.style.fontSize = '18px';
      counterContainer.innerText = 'Photos prises: 0';
      document.body.appendChild(counterContainer);

      // Obtenir l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      videoElement.srcObject = stream;

      // Tableau pour stocker les nouvelles photos
      const newPhotos: File[] = [];
      
      // Fonction pour nettoyer les éléments
      const cleanup = () => {
        if (videoElement.srcObject) {
          const tracks = (videoElement.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
        document.body.removeChild(videoElement);
        document.body.removeChild(buttonsContainer);
        document.body.removeChild(counterContainer);
        
        // Ajouter toutes les nouvelles photos à la collection existante
        if (newPhotos.length > 0) {
          onChange([...piece.photos, ...newPhotos]);
        }
      };

      // Annuler la prise de photo
      cancelButton.onclick = () => {
        cleanup();
      };
      
      // Terminer la séance de photos
      doneButton.onclick = () => {
        cleanup();
      };

      // Prendre une photo
      captureButton.onclick = () => {
        // Créer un canvas pour capturer l'image
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          // Afficher un flash visuel
          const flash = document.createElement('div');
          flash.style.position = 'fixed';
          flash.style.top = '0';
          flash.style.left = '0';
          flash.style.width = '100%';
          flash.style.height = '100%';
          flash.style.backgroundColor = 'white';
          flash.style.opacity = '0.8';
          flash.style.zIndex = '9998';
          flash.style.transition = 'opacity 0.5s';
          document.body.appendChild(flash);
          
          setTimeout(() => {
            document.body.removeChild(flash);
          }, 300);
          
          // Convertir le canvas en blob (image)
          canvas.toBlob((blob) => {
            if (blob) {
              // Créer un fichier à partir du blob
              const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
              
              // Ajouter la photo au tableau temporaire
              newPhotos.push(file);
              
              // Mettre à jour le compteur
              counterContainer.innerText = `Photos prises: ${newPhotos.length}`;
              
              // Sur iOS, pour sauvegarder dans la galerie, on utilise un lien de téléchargement
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = file.name;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
            }
          }, 'image/jpeg', 0.95);
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'accès à l\'appareil photo:', error);
      alert("Impossible d'accéder à l'appareil photo");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={takePictureAndSave}
        >
          <Camera className="h-4 w-4" />
          Prendre une photo
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={takeMultiplePhotos}
        >
          <Camera className="h-4 w-4" />
          Prendre plusieurs photos
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