'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '@/lib/firebase';
import SendEmailForm from './SendEmailForm';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Types pour nos templates de newsletter
type NewsletterTemplate = {
  id?: string;
  name: string;
  sections: NewsletterSection[];
  createdAt: Date;
  updatedAt: Date;
};

type NewsletterSection = {
  id: string;
  type: 'header' | 'headline' | 'content' | 'photos' | 'characteristics' | 'location' | 'availability' | 'footer';
  content: {
    logo?: string;
    image?: string;
    title?: string;
    subtitle?: string;
    greeting?: string;
    paragraphs?: string[];
    photos?: Array<{
      url: string;
      caption: string;
      file?: File;
    }>;
    characteristics?: Array<{
      icon: string;
      title: string;
      value: string;
    }>;
    locationFeatures?: string[];
    availability?: {
      date: string;
      details: string;
    };
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
  };
};

export default function NewsletterEditorVisual() {
  // État pour les sections de la newsletter
  const [sections, setSections] = useState<NewsletterSection[]>([]);
  // État pour les templates sauvegardés
  const [savedTemplates, setSavedTemplates] = useState<NewsletterTemplate[]>([]);
  // État pour le template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  // État pour le mode (édition ou envoi)
  const [mode, setMode] = useState<'edit' | 'send' | 'preview'>('edit');
  // État de chargement
  const [loading, setLoading] = useState<boolean>(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Charger le template par défaut au chargement
  useEffect(() => {
    loadDefaultTemplate();
  }, []);

  // Charger les templates sauvegardés au chargement
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  // Ajouter un useEffect pour surveiller l'état de l'authentification
  useEffect(() => {
    console.log("Initialisation de la surveillance de l'authentification");
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("État de l'authentification mis à jour:", {
        isAuthenticated: !!currentUser,
        email: currentUser?.email,
        uid: currentUser?.uid,
        emailVerified: currentUser?.emailVerified
      });
      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const loadDefaultTemplate = async () => {
    try {
      console.log("Début du chargement du template par défaut");
      setLoading(true);
      const response = await fetch('/api/newsletter/default-template');
      console.log("Réponse de l'API template par défaut:", {
        status: response.status,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Données du template par défaut reçues:", {
          hasHtmlContent: !!data.htmlContent
        });
        
        // Convertir le HTML en sections éditables
        const parsedSections = parseHtmlToSections(data.htmlContent);
        console.log("Sections parsées:", {
          numberOfSections: parsedSections.length,
          sectionTypes: parsedSections.map(s => s.type)
        });
        
        // Upload et mettre à jour les URLs des images par défaut
        console.log("Début de l'upload des images par défaut");
        const updatedSections = await uploadDefaultImages(parsedSections);
        console.log("Images par défaut uploadées:", {
          numberOfSections: updatedSections.length,
          sectionTypes: updatedSections.map(s => s.type)
        });
        
        setSections(updatedSections);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTemplates = async () => {
    try {
      console.log("Début du chargement des templates sauvegardés");
      const auth = getAuth();
      console.log("État de l'authentification:", {
        isAuthenticated: !!auth.currentUser,
        userEmail: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      });
      
      const templatesCollection = collection(db, 'newsletter_templates');
      console.log("Collection Firestore ciblée:", {
        collectionPath: templatesCollection.path,
        databaseInstance: !!db
      });
      
      const templatesSnapshot = await getDocs(templatesCollection);
      console.log("Résultat de la requête Firestore:", {
        success: !!templatesSnapshot,
        numberOfDocs: templatesSnapshot.size,
        empty: templatesSnapshot.empty,
        metadata: templatesSnapshot.metadata
      });
      
      const templates = templatesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Document template chargé:", {
          id: doc.id,
          name: data.name,
          sectionsCount: data.sections?.length,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
        return {
          id: doc.id,
          name: data.name,
          sections: data.sections,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as NewsletterTemplate[];
      
      setSavedTemplates(templates);
    } catch (error: any) {
      console.error('Erreur détaillée lors du chargement des templates:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        details: error
      });
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      console.log("Début de la sauvegarde du template");
      console.log("État actuel de l'authentification:", {
        authChecked,
        userExists: !!user,
        userEmail: user?.email
      });

      // Vérifier l'état de l'authentification
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      console.log("Vérification de l'utilisateur courant:", {
        authCurrentUser: !!currentUser,
        authCurrentUserEmail: currentUser?.email,
        stateUser: !!user,
        stateUserEmail: user?.email
      });
      
      if (!currentUser || !user) {
        console.error("Erreur : Utilisateur non authentifié", {
          authChecked,
          authInstance: !!auth,
          currentUser: !!currentUser
        });
        toast.error("Vous devez être connecté pour sauvegarder un template");
        setIsLoading(false);
        return;
      }

      // Vérifier si l'email est dans la liste autorisée
      const allowedEmails = [
        'acoat@arthurloydbretagne.fr',
        'rodrigue.pers29@gmail.com',
        'photos.pers@gmail.com',
        'eleroux@arthurloydbretagne.fr',
        'agencebrest@arthurloydbretagne.fr',
        'jdalet@arthurloydbretagne.fr',
        'npers@arthur-loyd.com',
        'npers@arthurloydbretagne.fr',
        'pmjaumain@arthurloydbretagne.fr',
        'pmottais@arthurloydbretagne.fr',
        'jjambon@arthurloydbretagne.fr',
        'ejouan@arthurloydbretagne.fr',
        'shadjlarbi@arthur-loyd.com'
      ];

      if (!user.email || !allowedEmails.includes(user.email)) {
        console.error("Erreur : Email non autorisé", user.email);
        toast.error("Votre email n'est pas autorisé à sauvegarder des templates");
        setIsLoading(false);
        return;
      }

      // Créer une copie profonde des sections pour les modifier
      const sectionsToSave = JSON.parse(JSON.stringify(sections));
      console.log("Structure des sections avant traitement:", sectionsToSave);

      // Créer un cache pour éviter de réuploader les mêmes images
      const imageCache: Record<string, string> = {};
      
      // Vérifier si une image existe déjà dans Firebase Storage
      const checkExistingImage = async (imagePath: string): Promise<string | null> => {
        const fileName = imagePath.split('/').pop();
        if (!fileName) return null;
        
        console.log(`[checkExistingImage] Recherche de l'image: ${fileName}`);
        
        // Liste des chemins possibles où l'image pourrait se trouver
        let possiblePaths = [
          `newsletter-templates/${fileName}`,
          `newsletter-templates/default/${fileName}`,
          `newsletter-images/${fileName}`
        ];
        
        // Optimisation pour les images project-photo: essayer d'abord le chemin avec /default/
        if (fileName.startsWith('project-photo-')) {
          possiblePaths = [
            `newsletter-templates/default/${fileName}`,
            `newsletter-templates/${fileName}`,
            `newsletter-images/${fileName}`
          ];
        }
        
        // Essayer chaque chemin sans générer d'erreurs dans la console
        for (const path of possiblePaths) {
          try {
            const storageRef = ref(storage, path);
            const downloadUrl = await getDownloadURL(storageRef);
            console.log(`[checkExistingImage] Image existante trouvée pour ${fileName} à ${path}`);
            console.log(`[checkExistingImage] URL originale: ${downloadUrl}`);
            
            // Utiliser directement le proxy au lieu de l'URL Firebase
            const proxyUrl = `/api/firebase-proxy?path=${encodeURIComponent(path)}&bucket=${encodeURIComponent('etat-des-lieux-arthur-loyd.firebasestorage.app')}`;
            console.log(`[checkExistingImage] URL du proxy utilisée: ${proxyUrl}`);
            
            return proxyUrl;
          } catch (error: any) {
            console.log(`[checkExistingImage] Échec de la recherche à ${path}: ${error.message}`);
            continue;
          }
        }
        
        // Si on arrive ici, aucune image n'a été trouvée
        console.log(`[checkExistingImage] Aucune image existante trouvée pour ${fileName}, une nouvelle sera créée`);
        return null;
      };
      
      // Traiter chaque section pour uploader les images si nécessaire
      for (let i = 0; i < sectionsToSave.length; i++) {
        const section = sectionsToSave[i];
        console.log(`Traitement de la section ${i}:`, section);
        
        // Traiter le logo dans le header et le footer
        if ((section.type === 'header' || section.type === 'footer') && section.content.logo) {
          const logoPath = section.content.logo;
          
          // Vérifier le cache
          if (imageCache[logoPath]) {
            section.content.logo = imageCache[logoPath];
            console.log(`Utilisation de l'URL en cache pour ${logoPath}`);
            continue;
          }
          
          // Vérifier si l'image existe déjà
          const existingUrl = await checkExistingImage(logoPath);
          if (existingUrl) {
            section.content.logo = existingUrl;
            imageCache[logoPath] = existingUrl;
            continue;
          }
          
          // Continuer avec l'upload uniquement si c'est une URL blob ou un fichier
          if (logoPath.startsWith('blob:') || logoPath.startsWith('/')) {
            try {
              const response = await fetch(logoPath);
              const blob = await response.blob();
              // Utiliser le nom original du fichier si possible
              const fileName = logoPath.split('/').pop() || `logo-${Date.now()}.png`;
              const file = new File([blob], fileName, { type: blob.type });
              
              const path = `newsletter-templates/${fileName}`;
              const storageRef = ref(storage, path);
              const snapshot = await uploadBytes(storageRef, file);
              const url = await getDownloadURL(snapshot.ref);
              
              section.content.logo = url;
              imageCache[logoPath] = url;
              console.log(`Logo ${fileName} uploadé avec succès`);
            } catch (error) {
              console.error(`Erreur lors de l'upload du logo:`, error);
            }
          }
        }
        
        if (section.type === 'photos' && section.content.photos) {
          console.log(`Traitement de la section photos ${i}`);
          const updatedPhotos = [];
          
          for (const photo of section.content.photos) {
            const photoUrl = photo.url;
            
            // Vérifier le cache
            if (imageCache[photoUrl]) {
              updatedPhotos.push({
                ...photo,
                url: imageCache[photoUrl],
                file: null
              });
              console.log(`Utilisation de l'URL en cache pour ${photoUrl}`);
              continue;
            }
            
            // Vérifier si l'image existe déjà
            const existingUrl = await checkExistingImage(photoUrl);
            if (existingUrl) {
              updatedPhotos.push({
                ...photo,
                url: existingUrl,
                file: null
              });
              imageCache[photoUrl] = existingUrl;
              continue;
            }
            
            if (photo.file instanceof File) {
              console.log(`Upload de l'image: ${photo.file.name}`);
              // Préserver le nom de fichier original
              const fileName = photo.file.name;
              const path = `newsletter-templates/${fileName}`;
              try {
                const storageRef = ref(storage, path);
                const snapshot = await uploadBytes(storageRef, photo.file);
                const url = await getDownloadURL(snapshot.ref);
                
                updatedPhotos.push({
                  ...photo,
                  url: url,
                  file: null
                });
                imageCache[photoUrl] = url;
                console.log(`Image ${fileName} uploadée avec succès: ${url}`);
              } catch (error) {
                console.error(`Erreur lors de l'upload de l'image:`, error);
                throw error;
              }
            } else if (photoUrl.startsWith('blob:')) {
              // Convertir l'URL blob en File puis uploader
              try {
                console.log(`Conversion de l'URL blob en File...`);
                const response = await fetch(photoUrl);
                const blob = await response.blob();
                // Utiliser un nom dérivé du contenu de l'image pour éviter les duplications
                const contentHash = Date.now().toString(36);
                const fileName = `image-${contentHash}.png`;
                const file = new File([blob], fileName, { type: blob.type });
                
                const path = `newsletter-templates/${fileName}`;
                const storageRef = ref(storage, path);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                
                updatedPhotos.push({
                  ...photo,
                  url: url,
                  file: null
                });
                imageCache[photoUrl] = url;
                console.log(`URL blob convertie et uploadée avec succès: ${url}`);
              } catch (error) {
                console.error(`Erreur lors de la conversion et upload de l'URL blob:`, error);
                throw error;
              }
            } else {
              // Si c'est déjà une URL, on la garde
              updatedPhotos.push({
                ...photo,
                file: null  // S'assurer que l'objet File n'est pas sérialisé
              });
            }
          }
          
          section.content.photos = updatedPhotos;
        }
      }

      // Sauvegarder le template avec les URLs des images
      const templateData = {
        name: templateName,
        sections: sectionsToSave,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.email,
      };

      console.log("Tentative de sauvegarde dans Firestore", {
        collection: "newsletter_templates",
        templateData: {
          ...templateData,
          sectionsCount: templateData.sections.length
        }
      });

      try {
        const docRef = await addDoc(collection(db, "newsletter_templates"), templateData);
        console.log("Template sauvegardé avec succès, ID:", docRef.id);
        setIsLoading(false);
        toast.success("Template sauvegardé avec succès!");
        // Recharger la liste des templates
        loadSavedTemplates();
      } catch (firestoreError: any) {
        console.error("Erreur Firestore détaillée:", {
          code: firestoreError.code,
          message: firestoreError.message,
          details: firestoreError.details,
          name: firestoreError.name,
          stack: firestoreError.stack
        });
        throw firestoreError;
      }
      
    } catch (error: any) {
      console.error("Erreur détaillée lors de la sauvegarde:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setIsLoading(false);
      toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const templateDoc = await getDoc(doc(db, 'newsletter_templates', templateId));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data();
        setSections(templateData.sections);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
    }
  };

  // Mettre à jour le useEffect pour charger le template sélectionné
  useEffect(() => {
    if (selectedTemplate !== 'default') {
      loadTemplate(selectedTemplate);
    } else {
      loadDefaultTemplate();
    }
  }, [selectedTemplate]);

  // Fonction pour convertir le HTML en sections éditables
  const parseHtmlToSections = (html: string): NewsletterSection[] => {
    return [
      {
        id: 'header',
        type: 'header',
        content: {
          logo: 'https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.appspot.com/o/newsletter-images%2Flogo-arthur-loyd.png?alt=media'
        }
      },
      {
        id: 'headline',
        type: 'headline',
        content: {
          title: 'DÉCOUVREZ LE PROJET PEM SUD À SAINT-BRIEUC',
          subtitle: 'BUREAUX NEUFS À PARTIR DE 182 M²'
        }
      },
      {
        id: 'content',
        type: 'content',
        content: {
          title: 'UN PROJET IMMOBILIER D\'EXCEPTION AU CŒUR DE SAINT-BRIEUC',
          greeting: 'Bonjour {{name}},\n\nUne opportunité exceptionnelle pour {{company}}.',
          paragraphs: [
            'Nous sommes ravis de vous présenter en avant-première le projet PEM SUD, un ensemble immobilier moderne et dans un immeuble écologique situé au cœur de Saint-Brieuc, à proximité immédiate de la gare TGV.',
            'Ce projet d\'envergure propose des espaces de bureaux neufs, lumineux et modulables, conçus pour répondre aux besoins des entreprises d\'aujourd\'hui et de demain.'
          ]
        }
      },
      {
        id: 'photos',
        type: 'photos',
        content: {
          photos: [
            {
              url: '/images/project-photo-1.png',
              caption: 'Vue d\'ensemble - Un projet immobilier d\'exception pour votre entreprise'
            },
            {
              url: '/images/project-photo-2.png',
              caption: 'Façade moderne et élégante'
            },
            {
              url: '/images/project-photo-3.png',
              caption: 'Vue depuis la gare'
            }
          ]
        }
      },
      {
        id: 'characteristics',
        type: 'characteristics',
        content: {
          characteristics: [
            {
              icon: '🏢',
              title: 'Surface totale',
              value: '4 540 m² SUBL'
            },
            {
              icon: '📏',
              title: 'Surface minimale',
              value: 'Divisible dès 182,2 m²'
            },
            {
              icon: '🚆',
              title: 'Accessible en TGV',
              value: 'À 2h17 de Paris en TGV'
            },
            {
              icon: '🚲',
              title: 'Et par mobilité douce',
              value: '46 places sous-sol, 60 vélos'
            }
          ]
        }
      },
      {
        id: 'location',
        type: 'location',
        content: {
          locationFeatures: [
            'À 2h17 de Paris en TGV',
            'À 8 minutes à pied du centre-ville',
            'Commerces au rez-de-chaussée',
            'Bureaux du R+1 au R+6',
            'Terrasse privative de 60 m² au R+4',
            '46 places de stationnement en sous-sol'
          ]
        }
      },
      {
        id: 'availability',
        type: 'availability',
        content: {
          availability: {
            date: '1er trimestre 2027',
            details: 'Informations détaillées sur demande'
          }
        }
      },
      {
        id: 'footer',
        type: 'footer',
        content: {
          logo: 'https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.appspot.com/o/newsletter-images%2FLogoFooterEmail.png?alt=media',
          socialLinks: [
            {
              platform: 'LinkedIn',
              url: 'https://www.linkedin.com/company/arthur-loyd-bretagne/'
            },
            {
              platform: 'Instagram',
              url: 'https://www.instagram.com/arthurloydbretagne/'
            },
            {
              platform: 'Site Web',
              url: 'https://www.arthur-loyd-brest.com/'
            }
          ]
        }
      }
    ];
  };

  // Fonction pour mettre à jour une section
  const updateSection = (sectionId: string, newContent: any) => {
    console.log('Mise à jour de la section:', sectionId, newContent);
    setSections(prevSections => {
      const updatedSections = prevSections.map(section =>
        section.id === sectionId
          ? newContent
          : section
      );
      console.log('Sections après mise à jour:', updatedSections);
      return updatedSections;
    });
  };

  // Corriger la fonction handleImageUpload pour assurer le remplacement correct de l'image
  const handleImageUpload = async (sectionId: string, photoIndex: number, file: File) => {
    try {
      console.log('Remplacement de l\'image avec:', file.name);
      
      // Créer un nouvel URL temporaire pour l'image sélectionnée
      const imageUrl = URL.createObjectURL(file);
      console.log('Nouvelle URL créée:', imageUrl);
      
      // Rechercher et mettre à jour la section spécifique
      const updatedSections = sections.map(section => {
        if (section.id === sectionId && section.type === 'photos' && section.content.photos) {
          // Créer une copie profonde des photos
          const newPhotos = [...section.content.photos];
          
          // Mettre à jour la photo spécifique
          newPhotos[photoIndex] = {
            ...newPhotos[photoIndex],
            url: imageUrl,
            file: file
          };
          
          console.log('Photo mise à jour:', newPhotos[photoIndex]);
          
          // Retourner la section mise à jour
          return {
            ...section,
            content: {
              ...section.content,
              photos: newPhotos
            }
          };
        }
        return section;
      });
      
      // Mettre à jour tout le tableau de sections
      setSections(updatedSections);
      
      console.log('Sections mises à jour avec la nouvelle image');
    } catch (error) {
      console.error('Erreur lors du remplacement de l\'image:', error);
      alert('Une erreur est survenue lors du remplacement de l\'image.');
    }
  };

  // Nouvelle fonction pour uploader les images par défaut
  const uploadDefaultImages = async (sections: NewsletterSection[]): Promise<NewsletterSection[]> => {
    const updatedSections = [...sections];
    
    // Créer un cache pour éviter de réuploader les mêmes images
    const imageCache: Record<string, string> = {};
    
    // Vérifier si une image existe déjà dans Firebase Storage
    const checkExistingImage = async (imagePath: string): Promise<string | null> => {
      const fileName = imagePath.split('/').pop();
      if (!fileName) return null;
      
      console.log(`[checkExistingImage] Recherche de l'image: ${fileName}`);
      
      // Liste des chemins possibles où l'image pourrait se trouver
      let possiblePaths = [
        `newsletter-templates/${fileName}`,
        `newsletter-templates/default/${fileName}`,
        `newsletter-images/${fileName}`
      ];
      
      // Optimisation pour les images project-photo: essayer d'abord le chemin avec /default/
      if (fileName.startsWith('project-photo-')) {
        possiblePaths = [
          `newsletter-templates/default/${fileName}`,
          `newsletter-templates/${fileName}`,
          `newsletter-images/${fileName}`
        ];
      }
      
      // Essayer chaque chemin sans générer d'erreurs dans la console
      for (const path of possiblePaths) {
        try {
          const storageRef = ref(storage, path);
          const downloadUrl = await getDownloadURL(storageRef);
          console.log(`[checkExistingImage] Image existante trouvée pour ${fileName} à ${path}`);
          console.log(`[checkExistingImage] URL originale: ${downloadUrl}`);
          
          // Utiliser directement le proxy au lieu de l'URL Firebase
          const proxyUrl = `/api/firebase-proxy?path=${encodeURIComponent(path)}&bucket=${encodeURIComponent('etat-des-lieux-arthur-loyd.firebasestorage.app')}`;
          console.log(`[checkExistingImage] URL du proxy utilisée: ${proxyUrl}`);
          
          return proxyUrl;
        } catch (error: any) {
          console.log(`[checkExistingImage] Échec de la recherche à ${path}: ${error.message}`);
          continue;
        }
      }
      
      // Si on arrive ici, aucune image n'a été trouvée
      console.log(`[checkExistingImage] Aucune image existante trouvée pour ${fileName}, une nouvelle sera créée`);
      return null;
    };
    
    for (let section of updatedSections) {
      // Gérer le logo dans le header et footer
      if ((section.type === 'header' || section.type === 'footer') && section.content.logo?.startsWith('/')) {
        const imagePath = section.content.logo;
        
        // Vérifier si cette image est déjà dans le cache
        if (imageCache[imagePath]) {
          section.content.logo = imageCache[imagePath];
          console.log(`Utilisation de l'URL en cache pour ${imagePath}: ${imageCache[imagePath]}`);
          continue;
        }
        
        // Vérifier si l'image existe déjà dans Firebase Storage
        const existingUrl = await checkExistingImage(imagePath);
        if (existingUrl) {
          section.content.logo = existingUrl;
          imageCache[imagePath] = existingUrl;
          continue;
        }
        
        try {
          const response = await fetch(imagePath);
          const blob = await response.blob();
          const fileName = imagePath.split('/').pop() || `logo-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: blob.type });
          
          // Utiliser le nom de fichier original au lieu d'un timestamp
          const path = `newsletter-templates/default/${fileName}`;
          const storageRef = ref(storage, path);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          
          section.content.logo = url;
          imageCache[imagePath] = url;
          
          console.log(`Logo ${fileName} uploadé avec succès`);
        } catch (error) {
          console.error('Erreur lors de l\'upload du logo:', error);
        }
      }
      
      // Gérer les photos dans la section photos
      if (section.type === 'photos' && section.content.photos) {
        const updatedPhotos = [];
        
        for (const photo of section.content.photos) {
          if (photo.url.startsWith('/')) {
            const imagePath = photo.url;
            
            // Vérifier si cette image est déjà dans le cache
            if (imageCache[imagePath]) {
              updatedPhotos.push({
                ...photo,
                url: imageCache[imagePath]
              });
              console.log(`Utilisation de l'URL en cache pour ${imagePath}: ${imageCache[imagePath]}`);
              continue;
            }
            
            // Vérifier si l'image existe déjà dans Firebase Storage
            const existingUrl = await checkExistingImage(imagePath);
            if (existingUrl) {
              updatedPhotos.push({
                ...photo,
                url: existingUrl
              });
              imageCache[imagePath] = existingUrl;
              continue;
            }
            
            try {
              const response = await fetch(imagePath);
              const blob = await response.blob();
              const fileName = imagePath.split('/').pop() || `image-${Date.now()}.png`;
              const file = new File([blob], fileName, { type: blob.type });
              
              // Utiliser le nom de fichier original au lieu d'un timestamp
              const path = `newsletter-templates/default/${fileName}`;
              const storageRef = ref(storage, path);
              const snapshot = await uploadBytes(storageRef, file);
              const url = await getDownloadURL(snapshot.ref);
              
              updatedPhotos.push({
                ...photo,
                url: url
              });
              
              imageCache[imagePath] = url;
              console.log(`Image ${fileName} uploadée avec succès`);
            } catch (error) {
              console.error('Erreur lors de l\'upload de l\'image:', error);
              updatedPhotos.push(photo);
            }
          } else {
            updatedPhotos.push(photo);
          }
        }
        
        section.content.photos = updatedPhotos;
      }
    }
    
    return updatedSections;
  };

  // Fonction pour générer le HTML à partir des sections
  const generateHtml = (sections: NewsletterSection[]): string => {
    // Récupérer les sections header et footer pour les logos
    const headerSection = sections.find(s => s.type === 'header');
    const footerSection = sections.find(s => s.type === 'footer');

    // URL proxy des logos pour la prévisualisation locale
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin
      : 'http://localhost:3000';
      
    const defaultHeaderLogoUrl = `${baseUrl}/api/firebase-proxy?path=newsletter-images%2Flogo-arthur-loyd.png&bucket=etat-des-lieux-arthur-loyd.firebasestorage.app`;
    const defaultFooterLogoUrl = `${baseUrl}/api/firebase-proxy?path=newsletter-images%2FLogoFooterEmail.png&bucket=etat-des-lieux-arthur-loyd.firebasestorage.app`;
    
    // URLs directes vers Firebase Storage pour les e-mails
    const directHeaderLogoUrl = "https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.firebasestorage.app/o/newsletter-images%2Flogo-arthur-loyd.png?alt=media";
    const directFooterLogoUrl = "https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.firebasestorage.app/o/newsletter-images%2FLogoFooterEmail.png?alt=media";
    
    // Utiliser les URLs directes pour les e-mails
    const headerLogoUrl = directHeaderLogoUrl;
    const footerLogoUrl = directFooterLogoUrl;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Newsletter PEM SUD</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f0f0f0;
      color: #333333;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    .newsletter-container {
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #ffffff;
    }
    .logo {
      max-width: 180px;
      width: 180px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .headline {
      background-color: #e50019;
      color: #ffffff;
      text-align: center;
      padding: 30px 20px;
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 700;
      font-size: 22px;
      line-height: 1.4;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 30px 20px;
    }
    .content h1 {
      color: #2c3e50;
      font-family: 'Montserrat', Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 25px;
      text-align: center;
      line-height: 1.3;
    }
    .greeting {
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 600;
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .intro-text {
      font-family: 'Open Sans', Arial, sans-serif;
      margin-bottom: 20px;
      line-height: 1.6;
      color: #333333;
    }
    .project-photos {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      margin: 30px 0;
    }
    .photo-container {
      width: 45%;
      display: inline-block;
      margin-bottom: 30px;
      text-align: center;
      vertical-align: top;
    }
    .photo-container img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      margin-bottom: 15px;
    }
    .photo-caption {
      background-color: #2c3e50;
      color: white;
      padding: 8px;
      border-radius: 5px;
      margin-top: 10px;
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 600;
      font-size: 14px;
    }
    .footer {
      background-color: #464254 !important;
      color: #ffffff;
      padding: 50px 20px;
      text-align: center;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer img {
      max-width: 400px;
      width: 100%;
      height: auto;
      display: inline-block;
    }
    .social-links {
      margin: 25px 0;
    }
    .social-links a {
      color: #ffffff;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      display: block;
      padding: 8px 5px;
      border-radius: 4px;
      background-color: #363143;
      white-space: nowrap;
    }
    
    /* Styles spécifiques pour mobile */
    @media only screen and (max-width: 600px) {
      .photo-container {
        width: 100% !important;
        height: auto !important;
        line-height: normal !important;
        margin-bottom: 25px;
      }
      .photo-container img {
        height: auto !important;
        max-height: 250px !important;
        max-width: 100% !important;
      }
      .footer img {
        max-width: 90%;
      }
      .logo {
        max-width: 160px !important;
        width: 160px !important;
        margin: 0 auto !important;
        display: block !important;
        float: none !important;
      }
      table[class="secondary-photos"] td {
        padding: 0 10px !important;
      }
      table[class="secondary-photos"] div {
        width: 240px !important;
        height: 180px !important;
      }
    }
    
    @media print {
      body {
        background-color: #ffffff;
      }
      .newsletter-container {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="newsletter-container">
    <!-- En-tête fixe -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 20px; text-align: center;">
          <img src="${headerLogoUrl}" alt="Arthur Loyd Logo" class="logo" width="180" height="auto" style="display: block; margin: 0 auto; float: none; text-align: center;">
        </td>
      </tr>
    </table>
    
    <!-- Titre principal modifiable -->
    ${sections.map(section => {
      if (section.type === 'headline') {
        return `
        <div class="headline">
          ${section.content.title || 'Découvrez notre nouvelle offre immobilière exceptionnelle'}
        </div>
        <div class="content">
        `;
      }
      return '';
    }).join('')}
    
    <!-- Corps de la newsletter -->
    <div class="content">
      ${sections.map(section => {
        switch (section.type) {
          case 'content':
            return `
            <h1>${section.content.title}</h1>
            
            <p class="greeting">${section.content.greeting}</p>
            
            ${(section.content.paragraphs || []).map(p => `<p class="intro-text">${p}</p>`).join('')}
            `;
          
          case 'photos':
            if (!section.content.photos || section.content.photos.length === 0) return '';
            
            // Image principale
            const mainPhoto = section.content.photos[0];
            const secondaryPhotos = section.content.photos.slice(1);
            
            return `
            <!-- Images du projet - Image principale -->
            <div style="margin: 30px 0; text-align: center;">
              <div style="height: 350px; line-height: 350px; text-align: center; margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">
                <img src="${mainPhoto.url}" alt="${mainPhoto.caption}" style="max-width: 100%; max-height: 350px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;">
              </div>
              <div style="background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 30px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600;">${mainPhoto.caption || 'Vue d\'ensemble'}</div>
            </div>
            
            <!-- Photos secondaires côte à côte -->
            ${secondaryPhotos.length > 0 ? `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; table-layout: fixed;" class="secondary-photos">
              <tr>
                ${secondaryPhotos.map((photo, index) => `
                  <td width="50%" valign="top" style="padding: 0 20px; text-align: center;">
                    <div style="width: 260px; height: 190px; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                      <img src="${photo.url}" alt="${photo.caption}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 14px; display: inline-block; min-width: 200px; max-width: 260px; margin: 0 auto;">${photo.caption || 'Légende de la photo'}</div>
                  </td>
                  ${(index + 1) % 2 === 0 && index < secondaryPhotos.length - 1 ? '</tr><tr>' : ''}
                `).join('')}
              </tr>
            </table>
            ` : ''}
            `;
          
          case 'characteristics':
            if (!section.content.characteristics || section.content.characteristics.length === 0) return '';
            
            const chars = section.content.characteristics;
            
            return `
            <!-- SECTION CARACTÉRISTIQUES -->
            <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                <tr>
                  <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                  <td width="15" style="padding: 0;"></td>
                  <td style="padding: 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="middle" style="padding-right: 10px; color: #e50019; font-size: 24px; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">✨</td>
                        <td valign="middle">
                          <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">Caractéristiques principales</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
            
            <!-- GRID DE CARACTÉRISTIQUES -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
              <tr>
                <td>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      ${chars.length >= 1 ? `
                      <td width="49%" valign="top">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e0e0e0; height: 220px; min-height: 220px;">
                          <tr>
                            <td align="center" style="padding: 25px 15px;">
                              <div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[0].icon}</div>
                              <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[0].title}</h3>
                              <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[0].value}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      ` : ''}
                      
                      <td width="2%">&nbsp;</td>
                      ${chars.length >= 2 ? `
                      <td width="49%" valign="top">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e0e0e0; height: 220px; min-height: 220px;">
                          <tr>
                            <td align="center" style="padding: 25px 15px;">
                              <div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[1].icon}</div>
                              <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[1].title}</h3>
                              <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[1].value}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      ` : ''}
                    </tr>
                    <tr><td colspan="3" height="20"></td></tr>
                    <tr>
                      ${chars.length >= 3 ? `
                      <td width="49%" valign="top">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e0e0e0; height: 220px; min-height: 220px;">
                          <tr>
                            <td align="center" style="padding: 25px 15px;">
                              <div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[2].icon}</div>
                              <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[2].title}</h3>
                              <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[2].value}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      ` : ''}
                      
                      <td width="2%">&nbsp;</td>
                      ${chars.length >= 4 ? `
                      <td width="49%" valign="top">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e0e0e0; height: 220px; min-height: 220px;">
                          <tr>
                            <td align="center" style="padding: 25px 15px;">
                              <div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[3].icon}</div>
                              <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[3].title}</h3>
                              <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[3].value}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      ` : ''}
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            `;
          
          case 'location':
            if (!section.content.locationFeatures || section.content.locationFeatures.length === 0) return '';
            
            return `
            <!-- LOCATION & SPACES COMBINED SECTION -->
            <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                <tr>
                  <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                  <td width="15" style="padding: 0;"></td>
                  <td style="padding: 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="middle" style="padding-right: 10px; color: #e50019; font-size: 24px; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">📍</td>
                        <td valign="middle">
                          <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">Localisation & Espaces</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <div class="info-section" style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.04); border-left: 3px solid #e50019; border: 1px solid #e0e0e0;">
              <p style="color: #333333;"><strong style="color: #333333;">Adresse :</strong> Boulevard Carnot, 22000 Saint-Brieuc</p>
              <p style="color: #333333;"><strong style="color: #333333;">Surface :</strong> <span style="background-color: #ffeeee; color: #e50019; padding: 4px 10px; font-weight: 600; border-radius: 4px; display: inline-block; border: 1px solid rgba(229,0,25,0.2);">4 540 m² SUBL</span> divisible dès <span style="background-color: #ffeeee; color: #e50019; padding: 4px 10px; font-weight: 600; border-radius: 4px; display: inline-block; border: 1px solid rgba(229,0,25,0.2);">182,2 m²</span></p>
              <ul style="padding-left: 25px; margin: 20px 0; list-style: none;">
                ${section.content.locationFeatures.map(feature => `
                  <li style="margin-bottom: 12px; position: relative; color: #333333;"><span style="color: #e50019; position: absolute; left: -25px;">✓</span> ${feature}</li>
                `).join('')}
              </ul>
            </div>
            `;
          
          case 'availability':
            if (!section.content.availability) return '';
            
            return `
            <!-- AVAILABILITY SECTION -->
            <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                <tr>
                  <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                  <td width="15" style="padding: 0;"></td>
                  <td style="padding: 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="middle" style="padding-right: 10px; color: #e50019; font-size: 24px; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">📅</td>
                        <td valign="middle">
                          <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">Disponibilité</h2>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
            <div class="info-section" style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.04); border-left: 3px solid #e50019; border: 1px solid #e0e0e0;">
              <p style="color: #333333;"><strong style="color: #333333; font-size: 17px;">Date de Disponibilité :</strong> <span style="font-size: 16px; color: #333333;">${section.content.availability.date}</span></p>
              <p style="color: #333333;"><strong style="color: #333333; font-size: 17px;">Détails :</strong> <span style="font-size: 16px; color: #333333;">${section.content.availability.details}</span></p>
            </div>
            
            <!-- Bouton compatible avec Outlook -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 40px 0; background-color: #ffffff;">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td bgcolor="#e50019" style="padding: 18px 36px; border-radius: 50px;" align="center">
                        <a href="mailto:contact@arthurloydbretagne.fr?subject=Demande d'information PEM SUD" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">Demander plus d'informations</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            `;
          
          default:
            return '';
        }
      }).join('')}
    </div>
    
    <!-- Pied de page fixe -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#464254" style="background-color: #464254 !important; background: #464254 !important; mso-background-themecolor: #464254 !important;">
      <tr bgcolor="#464254" style="background-color: #464254 !important;">
        <td align="center" bgcolor="#464254" style="padding: 50px 20px; color: #ffffff; text-align: center; font-size: 14px; line-height: 1.8; background-color: #464254 !important; background: #464254 !important;">
          <!-- Table wrapper pour garantir la couleur de fond -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#464254" style="background-color: #464254 !important; background: #464254 !important;">
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 0;">
                <img src="${footerLogoUrl}" alt="Arthur Loyd - Créateur de possibilités" style="width: 400px; max-width: 100%; height: auto; display: inline-block;" width="400">
              </td>
            </tr>
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 25px 0;">
                <!-- Séparateur dans le footer -->
                <table border="0" cellpadding="0" cellspacing="0" width="50" bgcolor="#464254" style="background-color: #464254 !important;">
                  <tr bgcolor="#464254" style="background-color: #464254 !important;">
                    <td height="3" bgcolor="#464254" style="background-color: rgba(255,255,255,0.3); height: 3px;"></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 0;">
                <div class="social-links">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 400px; margin: 0 auto;" bgcolor="#464254">
                    <tr bgcolor="#464254" style="background-color: #464254 !important;">
                      <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                        <a href="https://www.linkedin.com/company/arthur-loyd-bretagne/" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">LinkedIn</a>
                      </td>
                      <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                        <a href="https://www.instagram.com/arthurloydbretagne/" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">Instagram</a>
                      </td>
                      <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                        <a href="https://www.arthur-loyd-bretagne.com/" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">Site Web</a>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 15px 0 0 0;">
                <p style="margin-top: 0; opacity: 0.8; color: #ffffff;">© 2025 Arthur Loyd Bretagne. Tous droits réservés.</p>
              </td>
            </tr>
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 10px 0 0 0; border-top: 1px solid rgba(255,255,255,0.1);">
                <!-- Bouton de désinscription amélioré -->
                <a href="{{UNSUBSCRIBE_URL}}" style="color: #ffffff !important; text-decoration: underline; font-size: 13px; opacity: 0.7;">Se désinscrire de cette liste de diffusion</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  };

  // Fonction pour filtrer les sections éditables
  const getEditableSections = (sections: NewsletterSection[]): NewsletterSection[] => {
    return sections.filter(section => section.type !== 'header' && section.type !== 'footer');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!templateId || templateId === 'default') {
      toast.error("Impossible de supprimer le template par défaut");
      return;
    }

    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) {
      try {
        await deleteDoc(doc(db, 'newsletter_templates', templateId));
        toast.success("Template supprimé avec succès");
        // Recharger la liste des templates
        loadSavedTemplates();
        // Réinitialiser la sélection
        setSelectedTemplate('');
        // Charger le template par défaut
        loadDefaultTemplate();
      } catch (error) {
        console.error('Erreur lors de la suppression du template:', error);
        toast.error("Erreur lors de la suppression du template");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }

  return (
    <div className="flex flex-col space-y-8 p-4">
      <div className="flex items-center space-x-4 mb-4">
        <h1 className="text-2xl font-bold">Éditeur de Newsletter</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('edit')}
            className={`px-4 py-2 rounded-md ${mode === 'edit' ? 'bg-[#DC0032] text-white' : 'bg-gray-200'}`}
          >
            Éditer
          </button>
          <button
            onClick={() => setMode('send')}
            className={`px-4 py-2 rounded-md ${mode === 'send' ? 'bg-[#DC0032] text-white' : 'bg-gray-200'}`}
          >
            Envoyer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-4 rounded-lg shadow-md">
          {mode === 'edit' && (
            <>
              <div className="space-y-4">
                {getEditableSections(sections).map(section => (
                  <div key={section.id} className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 capitalize">
                      {section.type === 'headline' && 'Titre principal'}
                      {section.type === 'content' && 'Contenu principal'}
                      {section.type === 'photos' && 'Photos du projet'}
                      {section.type === 'characteristics' && 'Caractéristiques'}
                      {section.type === 'location' && 'Localisation'}
                      {section.type === 'availability' && 'Disponibilité'}
                    </h3>

                    {section.type === 'header' && (
                      <div className="flex items-center gap-4">
                        <img 
                          src={section.content.logo} 
                          alt="Logo" 
                          className="w-32 h-auto"
                        />
                      </div>
                    )}

                    {section.type === 'headline' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre principal
                          </label>
                          <input
                            type="text"
                            value={section.content.title}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, title: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sous-titre
                          </label>
                          <input
                            type="text"
                            value={section.content.subtitle}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, subtitle: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    )}

                    {section.type === 'content' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre de la section
                          </label>
                          <input
                            type="text"
                            value={section.content.title}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, title: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message d'accueil
                          </label>
                          <input
                            type="text"
                            value={section.content.greeting}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, greeting: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Paragraphes
                          </label>
                          {section.content.paragraphs?.map((paragraph, index) => (
                            <div key={index} className="mb-2">
                              <textarea
                                value={paragraph}
                                onChange={(e) => {
                                  const newParagraphs = [...(section.content.paragraphs || [])];
                                  newParagraphs[index] = e.target.value;
                                  updateSection(section.id, {
                                    ...section,
                                    content: { ...section.content, paragraphs: newParagraphs }
                                  });
                                }}
                                className="w-full p-2 border rounded min-h-[100px]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.type === 'photos' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {section.content.photos?.map((photo, index) => (
                          <div key={index} className="flex flex-col gap-2">
                            <div className="relative group">
                              <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-full h-48 object-cover rounded"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer px-3 py-2 bg-white text-gray-800 rounded-md font-medium hover:bg-gray-100">
                                  Remplacer l'image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(section.id, index, file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={photo.caption}
                              onChange={(e) => {
                                const newPhotos = [...(section.content.photos || [])];
                                newPhotos[index] = { ...photo, caption: e.target.value };
                                console.log('Mise à jour de la légende:', e.target.value);
                                updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, photos: newPhotos }
                                });
                                console.log('Nouvelles photos après mise à jour:', newPhotos);
                              }}
                              className="w-full p-2 border rounded"
                              placeholder="Légende de la photo"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {section.type === 'characteristics' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.content.characteristics?.map((char, index) => (
                          <div key={index} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={char.icon}
                                onChange={(e) => {
                                  const newChars = [...(section.content.characteristics || [])];
                                  newChars[index] = { ...char, icon: e.target.value };
                                  updateSection(section.id, {
                                    ...section,
                                    content: { ...section.content, characteristics: newChars }
                                  });
                                }}
                                className="w-12 p-2 border rounded text-center text-xl"
                                placeholder="🏢"
                              />
                              <input
                                type="text"
                                value={char.title}
                                onChange={(e) => {
                                  const newChars = [...(section.content.characteristics || [])];
                                  newChars[index] = { ...char, title: e.target.value };
                                  updateSection(section.id, {
                                    ...section,
                                    content: { ...section.content, characteristics: newChars }
                                  });
                                }}
                                className="flex-1 p-2 border rounded"
                                placeholder="Titre"
                              />
                            </div>
                            <input
                              type="text"
                              value={char.value}
                              onChange={(e) => {
                                const newChars = [...(section.content.characteristics || [])];
                                newChars[index] = { ...char, value: e.target.value };
                                updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, characteristics: newChars }
                                });
                              }}
                              className="w-full p-2 border rounded"
                              placeholder="Valeur"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {section.type === 'location' && (
                      <div className="flex flex-col gap-4">
                        {section.content.locationFeatures?.map((feature, index) => (
                          <div key={index}>
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => {
                                const newFeatures = [...(section.content.locationFeatures || [])];
                                newFeatures[index] = e.target.value;
                                updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, locationFeatures: newFeatures }
                                });
                              }}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {section.type === 'availability' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date de disponibilité
                          </label>
                          <input
                            type="text"
                            value={section.content.availability?.date}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...section.content.availability,
                                  date: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Détails supplémentaires
                          </label>
                          <input
                            type="text"
                            value={section.content.availability?.details}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...section.content.availability,
                                  details: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex space-x-4">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="px-4 py-2 border rounded-md w-full"
                  >
                    <option value="">-- Sélectionner un template --</option>
                    {savedTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadTemplate(selectedTemplate)}
                    disabled={!selectedTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
                  >
                    Charger
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                    disabled={!selectedTemplate || selectedTemplate === 'default'}
                    className="px-4 py-2 bg-red-600 text-white rounded-md disabled:bg-gray-400"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="mt-4">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nom du template"
                    className="px-4 py-2 border rounded-md w-full mb-4"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-gray-400"
                  >
                    Sauvegarder comme nouveau template
                  </button>
                </div>
              </div>
            </>
          )}
          
          {mode === 'send' && (
            <div className="bg-white p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Envoyer la newsletter</h3>
              <SendEmailForm htmlContent={generateHtml(sections)} />
            </div>
          )}
        </div>

        {/* Prévisualisation persistante à droite */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Aperçu</h3>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={generateHtml(sections)}
              className="w-full h-[1200px]"
              title="Newsletter Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 