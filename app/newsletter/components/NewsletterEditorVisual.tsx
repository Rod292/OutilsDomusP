'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '@/lib/firebase';
import SendEmailForm from './SendEmailForm';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
// Ajouter l'import pour react-beautiful-dnd
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import EmojiPicker from './EmojiPicker';

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
  type: 'header' | 'headline' | 'content' | 'photos' | 'characteristics' | 'location' | 'availability' | 'footer' | 'custom' | 'surface' | 'button';
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
      imageUrl?: string; // Nouvelle propriété pour stocker l'URL de l'image
    }>;
    locationFeatures?: string[];
    address?: string; // Ajout du champ adresse
    surface?: string; // Ajout du champ surface
    surfaceValue?: string; // Valeur de la surface
    surfaceUnit?: string; // Unité de la surface (m², ha, etc.)
    surfaceTitle?: string; // Titre personnalisé pour la section surface
    surfaceIcon?: string; // Icône pour la section surface
    availability?: {
      date: string;
      details: string;
      dateLabel?: string;
      detailsLabel?: string;
    };
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
    custom?: {
      icon: string;
      title?: string;
      content: string;
    };
    button?: {
      text: string;
      backgroundColor: string;
      textColor: string;
      emailTo: string;
      emailSubject: string;
      emailBody?: string;
      width?: string;
    };
    surfaceBackgroundColor?: string; // Nouvelle propriété pour la couleur de fond
    surfaceTextColor?: string; // Nouvelle propriété pour la couleur du texte
    surfaceDescription?: string; // Nouvelle propriété pour la description
  };
  isCollapsed?: boolean; // Nouvelle propriété pour permettre de réduire/développer les sections
  customTitle?: string; // Nouveau champ pour le titre personnalisé de la section
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
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  
  // Référence pour l'élément de prévisualisation
  const previewRef = useRef<HTMLDivElement>(null);
  // État pour stocker la position de défilement
  const [scrollPosition, setScrollPosition] = useState<number>(0);

  // Fonction pour sauvegarder la position de défilement
  const saveScrollPosition = () => {
    if (previewRef.current) {
      const position = previewRef.current.scrollTop;
      const scrollHeight = previewRef.current.scrollHeight;
      const clientHeight = previewRef.current.clientHeight;
      setScrollPosition(position);
      console.log('Position de défilement sauvegardée:', position);
      console.log('Hauteur totale du contenu:', scrollHeight);
      console.log('Hauteur visible du conteneur:', clientHeight);
      console.log('Différence (défilable):', scrollHeight - clientHeight);
    }
  };

  // Fonction pour restaurer la position de défilement
  const restoreScrollPosition = () => {
    requestAnimationFrame(() => {
      if (previewRef.current) {
        previewRef.current.scrollTop = scrollPosition;
        console.log('Position de défilement restaurée:', scrollPosition);
        console.log('Hauteur totale après restauration:', previewRef.current.scrollHeight);
        console.log('Hauteur visible après restauration:', previewRef.current.clientHeight);
      }
    });
  };

  // Charger le template spécifique au chargement
  useEffect(() => {
    const loadInitialTemplate = async () => {
      try {
        setLoading(true);
        // ID du template spécifique à charger par défaut
        const specificTemplateId = '5X9t9uYaJWLH9FoCmxdx';
        
        // Charger le template spécifique
        const templateDoc = await getDoc(doc(db, 'newsletter_templates', specificTemplateId));
        if (templateDoc.exists()) {
          const templateData = templateDoc.data();
          setSections(templateData.sections);
          setSelectedTemplate(specificTemplateId);
          console.log("Template spécifique chargé avec succès:", specificTemplateId);
        } else {
          console.error("Le template spécifique n'existe pas, chargement du template par défaut");
          loadDefaultTemplate();
        }
      } catch (error) {
        console.error('Erreur lors du chargement du template spécifique:', error);
        loadDefaultTemplate();
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialTemplate();
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
    // Ne rien faire si c'est le chargement initial ou si c'est déjà le template spécifique
    if (selectedTemplate === 'default' || selectedTemplate === '5X9t9uYaJWLH9FoCmxdx') {
      return;
    }
    
    // Charger le template sélectionné
    loadTemplate(selectedTemplate);
  }, [selectedTemplate]);

  // Fonction pour convertir le HTML en sections éditables
  const parseHtmlToSections = (html: string): NewsletterSection[] => {
    return [
      {
        id: 'header',
        type: 'header',
        content: {
          logo: 'https://firebasestorage.googleapis.com/v0/b/etat-des-lieux-arthur-loyd.appspot.com/o/newsletter-images%2Flogo-arthur-loyd.png?alt=media'
        },
        isCollapsed: true // En-tête masqué par défaut
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
          title: 'À propos de ce bien',
          greeting: 'Chers clients,',
          paragraphs: [
            'Nous sommes ravis de vous présenter cette opportunité immobilière exceptionnelle qui répond parfaitement aux exigences du marché actuel.'
          ]
        }
      },
      {
        id: 'photos',
        type: 'photos',
        content: {
          photos: [
            { url: '/placeholder-image.jpg', caption: 'Vue extérieure du bâtiment' }
          ]
        }
      },
      {
        id: 'characteristics',
        type: 'characteristics',
        content: {
          characteristics: [
            { icon: '🏢', title: 'Type', value: 'Immeuble de bureaux' }
          ]
        }
      },
      {
        id: 'location',
        type: 'location',
        content: {
          locationFeatures: [
            'Situé en plein centre-ville',
            'Accès direct aux transports en commun (métro, bus)',
            'À proximité des commerces et restaurants',
            'À 10 minutes de la gare principale',
            'Quartier d\'affaires dynamique'
          ],
          address: 'Adresse du bien',
          surface: '450 m²'
        }
      },
      {
        id: 'availability',
        type: 'availability',
        content: {
          availability: {
            date: 'Disponible dès maintenant',
            details: 'Possibilité d\'emménagement immédiat. Contactez-nous pour organiser une visite personnalisée et découvrir tous les atouts de ce bien d\'exception.'
          }
        }
      },
      {
        id: 'footer',
        type: 'footer',
        content: {
          socialLinks: [
            { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/votre-entreprise' },
            { platform: 'Twitter', url: 'https://twitter.com/votre_entreprise' },
            { platform: 'Instagram', url: 'https://www.instagram.com/votre_entreprise' }
          ]
        },
        isCollapsed: true // Pied de page masqué par défaut
      }
    ];
  };

  // Fonction pour mettre à jour une section
  const updateSection = (sectionId: string, newContent: any) => {
    saveScrollPosition();
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
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Fonctions pour gérer les liens sociaux
  const addSocialLink = () => {
    saveScrollPosition();
    const footerSection = sections.find(s => s.type === 'footer');
    if (!footerSection) return;
    
    const newLinks = [...(footerSection.content.socialLinks || []), { platform: "", url: "" }];
    updateSection(footerSection.id, {
      ...footerSection,
      content: { ...footerSection.content, socialLinks: newLinks }
    });
  };
  
  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    saveScrollPosition();
    const footerSection = sections.find(s => s.type === 'footer');
    if (!footerSection) return;
    
    const newLinks = [...(footerSection.content.socialLinks || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    
    updateSection(footerSection.id, {
      ...footerSection,
      content: { ...footerSection.content, socialLinks: newLinks }
    });
  };
  
  const deleteSocialLink = (index: number) => {
    saveScrollPosition();
    const footerSection = sections.find(s => s.type === 'footer');
    if (!footerSection) return;
    
    const newLinks = [...(footerSection.content.socialLinks || [])];
    newLinks.splice(index, 1);
    
    updateSection(footerSection.id, {
      ...footerSection,
      content: { ...footerSection.content, socialLinks: newLinks }
    });
  };

  // Fonction pour gérer l'upload d'image dans l'en-tête
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionType: string, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const section = sections.find(s => s.type === sectionType);
    if (!section) return;
    
    // Créer une URL temporaire pour afficher l'image
    const tempUrl = URL.createObjectURL(file);
    
    // Mettre à jour l'état avec l'URL temporaire
    updateSection(section.id, {
            ...section,
            content: {
              ...section.content,
        [field]: tempUrl
      }
    });
    
    // Uploader l'image vers Firebase Storage
    uploadImage(file, `newsletter-${sectionType}/${file.name}`).then(url => {
      updateSection(section.id, {
        ...section,
        content: {
          ...section.content,
          [field]: url
        }
      });
    }).catch(error => {
      console.error(`Erreur lors de l'upload de l'image ${field}:`, error);
      toast.error(`Erreur lors de l'upload de l'image ${field}`);
    });
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
            display: block !important;
            width: 100% !important;
            padding: 0 0 15px 0 !important;
          }
          
          table[class="secondary-photos"] img {
            max-height: 150px !important;
          }
          
          table[class="secondary-photos"] div[style*="background-color: #2c3e50"] {
            font-size: 11px !important;
            padding: 6px !important;
            max-width: 90% !important;
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
                <h1>${section.customTitle || section.content.title}</h1>
                
                <p class="greeting">${section.content.greeting}</p>
                
                ${(section.content.paragraphs || []).map(p => `<p class="intro-text">${p}</p>`).join('')}
                `;
              
              case 'photos':
                if (!section.content.photos || section.content.photos.length === 0) return '';
                
                // Si une seule photo, l'afficher en grand
                if (section.content.photos.length === 1) {
                  const photo = section.content.photos[0];
                  return `
                  <!-- Image unique en plein écran -->
                  <div style="margin: 30px 0; text-align: center;">
                    <div style="max-height: 350px; text-align: center; margin-bottom: 20px; max-width: 100%; margin-left: auto; margin-right: auto;">
                      <img src="${photo.url}" alt="${photo.caption}" style="max-width: 100%; max-height: 350px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;">
                    </div>
                    ${photo.caption ? `<div style="background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 30px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 14px; max-width: 90%;">${photo.caption}</div>` : ''}
                  </div>
                  `;
                } 
                // Si deux photos, les afficher côte à côte
                else if (section.content.photos.length === 2) {
                  const photos = section.content.photos;
                  return `
                  <!-- Deux photos côte à côte -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; table-layout: fixed;" class="secondary-photos">
                    <tr>
                      <td width="50%" valign="top" style="padding: 0 5px; text-align: center;">
                        <div style="max-width: 100%; height: auto; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                          <img src="${photos[0].url}" alt="${photos[0].caption}" style="width: 100%; height: auto; object-fit: cover; max-height: 190px;">
                        </div>
                        ${photos[0].caption ? `<div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 12px; display: inline-block; max-width: 90%; margin: 0 auto;">${photos[0].caption}</div>` : ''}
                      </td>
                      <td width="50%" valign="top" style="padding: 0 5px; text-align: center;">
                        <div style="max-width: 100%; height: auto; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                          <img src="${photos[1].url}" alt="${photos[1].caption}" style="width: 100%; height: auto; object-fit: cover; max-height: 190px;">
                        </div>
                        ${photos[1].caption ? `<div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 12px; display: inline-block; max-width: 90%; margin: 0 auto;">${photos[1].caption}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                  `;
                }
                // Pour 3 photos ou plus, utiliser le format actuel
                else {
                // Image principale
                const mainPhoto = section.content.photos[0];
                const secondaryPhotos = section.content.photos.slice(1);
                
                return `
                <!-- Images du projet - Image principale -->
                <div style="margin: 30px 0; text-align: center;">
                  <div style="max-height: 350px; text-align: center; margin-bottom: 20px; max-width: 100%; margin-left: auto; margin-right: auto;">
                    <img src="${mainPhoto.url}" alt="${mainPhoto.caption}" style="max-width: 100%; max-height: 350px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;">
                  </div>
                  ${mainPhoto.caption ? `<div style="background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 30px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 14px; max-width: 90%;">${mainPhoto.caption}</div>` : ''}
                </div>
                
                <!-- Photos secondaires côte à côte -->
                ${secondaryPhotos.length > 0 ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; table-layout: fixed;" class="secondary-photos">
                  <tr>
                    ${secondaryPhotos.map((photo, index) => `
                      <td width="50%" valign="top" style="padding: 0 5px; text-align: center;">
                        <div style="max-width: 100%; height: auto; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                          <img src="${photo.url}" alt="${photo.caption}" style="width: 100%; height: auto; object-fit: cover; max-height: 190px;">
                        </div>
                        ${photo.caption ? `<div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 12px; display: inline-block; max-width: 90%; margin: 0 auto;">${photo.caption}</div>` : ''}
                      </td>
                      ${(index + 1) % 2 === 0 && index < secondaryPhotos.length - 1 ? '</tr><tr>' : ''}
                    `).join('')}
                  </tr>
                </table>
                ` : ''}
                `;
                }
              
              case 'characteristics':
                if (!section.content.characteristics || section.content.characteristics.length === 0) return '';
                
                const chars = section.content.characteristics;
                
                return `
                <!-- CARACTÉRISTIQUES -->
                <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                    <tr>
                      <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                      <td width="15" style="padding: 0;"></td>
                      <td style="padding: 0;">
                        <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">${section.customTitle || 'Caractéristiques'}</h2>
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
                                  ${chars[0].imageUrl ? 
                                    `<div style="margin-bottom: 15px;"><img src="${chars[0].imageUrl}" alt="${chars[0].title}" style="width: 60px; height: 60px; object-fit: contain; display: inline-block; background-color: rgba(229,0,25,0.08); border-radius: 50%; padding: 5px;" /></div>` : 
                                    `<div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[0].icon}</div>`
                                  }
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
                                  ${chars[1].imageUrl ? 
                                    `<div style="margin-bottom: 15px;"><img src="${chars[1].imageUrl}" alt="${chars[1].title}" style="width: 60px; height: 60px; object-fit: contain; display: inline-block; background-color: rgba(229,0,25,0.08); border-radius: 50%; padding: 5px;" /></div>` : 
                                    `<div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[1].icon}</div>`
                                  }
                                  <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[1].title}</h3>
                                  <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[1].value}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          ` : ''}
                        </tr>
                        ${chars.length > 2 ? `
                        <tr><td colspan="3" height="20"></td></tr>
                        <tr>
                          ${chars.length >= 3 ? `
                          <td width="49%" valign="top">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e0e0e0; height: 220px; min-height: 220px;">
                              <tr>
                                <td align="center" style="padding: 25px 15px;">
                                  ${chars[2].imageUrl ? 
                                    `<div style="margin-bottom: 15px;"><img src="${chars[2].imageUrl}" alt="${chars[2].title}" style="width: 60px; height: 60px; object-fit: contain; display: inline-block; background-color: rgba(229,0,25,0.08); border-radius: 50%; padding: 5px;" /></div>` : 
                                    `<div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[2].icon}</div>`
                                  }
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
                                  ${chars[3].imageUrl ? 
                                    `<div style="margin-bottom: 15px;"><img src="${chars[3].imageUrl}" alt="${chars[3].title}" style="width: 60px; height: 60px; object-fit: contain; display: inline-block; background-color: rgba(229,0,25,0.08); border-radius: 50%; padding: 5px;" /></div>` : 
                                    `<div style="font-size: 32px; margin-bottom: 15px; color: #e50019; display: inline-block; background-color: rgba(229,0,25,0.08); width: 60px; height: 60px; line-height: 60px; border-radius: 50%;">${chars[3].icon}</div>`
                                  }
                                  <h3 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; margin-bottom: 12px; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; background-color: #ffffff;">${chars[3].title}</h3>
                                  <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.6; background-color: #ffffff;">${chars[3].value}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                          ` : ''}
                        </tr>
                        ` : ''}
                      </table>
                    </td>
                  </tr>
                </table>
                `;
              
              case 'location':
                if (!section.content.locationFeatures || section.content.locationFeatures.length === 0) return '';
                
                return `
                <!-- LOCATION SECTION -->
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
                              <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">${section.customTitle || 'Localisation'}</h2>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>

                <div class="info-section" style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.04); border-left: 3px solid #e50019; border: 1px solid #e0e0e0;">
                  ${section.content.address ? `<p style="color: #333333;"><strong style="color: #333333;">Adresse :</strong> ${section.content.address}</p>` : ''}
                  <ul style="padding-left: 25px; margin: 20px 0; list-style: none;">
                    ${section.content.locationFeatures.map(feature => `
                      <li style="margin-bottom: 12px; position: relative; color: #333333;"><span style="color: #e50019; position: absolute; left: -25px;">✓</span> ${feature}</li>
                    `).join('')}
                  </ul>
                </div>
                `;
              
              case 'availability':
                return `
                <!-- DISPONIBILITÉ -->
                <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                    <tr>
                      <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                      <td width="15" style="padding: 0;"></td>
                      <td style="padding: 0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td valign="middle" style="padding-right: 10px; color: #e50019; font-size: 24px; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">📅</td>
                            <td valign="middle">
                              <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">${section.customTitle || 'Disponibilité'}</h2>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div class="info-section" style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.04); border-left: 3px solid #e50019; border: 1px solid #e0e0e0;">
                  <p style="color: #333333;"><strong style="color: #333333;">${section.content.availability?.dateLabel || 'Date de disponibilité'} :</strong> ${section.content.availability?.date || ''}</p>
                  ${section.content.availability?.details ? `<p style="color: #333333;"><strong style="color: #333333;">${section.content.availability?.detailsLabel || 'Détails'} :</strong> ${section.content.availability?.details || ''}</p>` : ''}
                </div>
                `;
                
              case 'custom':
                return `
                <!-- SECTION PERSONNALISÉE -->
                <div style="background-color: #ffffff; padding: 10px; border-radius: 8px; margin-top: 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0 10px 0;">
                    <tr>
                      <td width="6" style="background-color: #e50019; padding: 0;" valign="top">&nbsp;</td>
                      <td width="15" style="padding: 0;"></td>
                      <td style="padding: 0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td valign="middle" style="padding-right: 10px; color: #e50019; font-size: 24px; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">${section.content.custom?.icon || '✨'}</td>
                            <td valign="middle">
                              <h2 style="color: #2c3e50; font-family: 'Montserrat', Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0; padding-bottom: 12px; letter-spacing: 0.5px;">${section.customTitle || section.content.custom?.title || 'Section personnalisée'}</h2>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div class="info-section" style="background-color: #ffffff; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.04); border-left: 3px solid #e50019; border: 1px solid #e0e0e0;">
                  <div style="font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333333;">${section.content.custom?.content || ''}</div>
                </div>
                `;
                
              case 'surface':
                if (!section.content.surfaceValue) return '';
                
                const surfaceTitle = section.customTitle || section.content.surfaceTitle || 'Surface';
                const surfaceValue = section.content.surfaceValue || '';
                const surfaceUnit = section.content.surfaceUnit || 'm²';
                const surfaceIcon = section.content.surfaceIcon || '📏';
                const bgColor = section.content.surfaceBackgroundColor || '#f3f4f6';
                const textColor = section.content.surfaceTextColor || '#111827';
                
                return `
                <!-- SECTION SURFACE -->
                <div style="margin: 30px 0; text-align: center;">
                  <div style="background-color: ${bgColor}; color: ${textColor}; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <div style="font-size: 40px; margin-bottom: 15px;">${surfaceIcon}</div>
                    <h3 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 10px;">${surfaceTitle}</h3>
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 36px; font-weight: 700;">${surfaceValue} ${surfaceUnit}</div>
                    ${section.content.surfaceDescription ? `<p style="margin-top: 15px; font-family: 'Montserrat', Arial, sans-serif;">${section.content.surfaceDescription}</p>` : ''}
                  </div>
                </div>
                `;
              
              case 'button':
                return `
                <!-- SECTION BOUTON -->
                <div style="text-align: center; padding: 30px 0;">
                  <a href="mailto:${section.content.button?.emailTo || 'contact@arthurloydbretagne.fr'}?subject=${encodeURIComponent(section.content.button?.emailSubject || 'Demande d\'information')}${section.content.button?.emailBody ? `&body=${encodeURIComponent(section.content.button?.emailBody)}` : ''}" 
                     style="display: inline-block; width: ${section.content.button?.width || '80%'}; background-color: ${section.content.button?.backgroundColor || '#e50019'}; color: ${section.content.button?.textColor || '#ffffff'}; font-family: 'Montserrat', Arial, sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; padding: 15px 20px; border-radius: 5px; text-align: center; letter-spacing: 0.5px;">
                    ${section.content.button?.text || 'DEMANDER PLUS D\'INFORMATIONS'}
                  </a>
                </div>
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
    // Filtrer les sections pour exclure l'en-tête et le pied de page
    return sections.filter(section => section.type !== 'header' && section.type !== 'footer');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!templateId || templateId === 'default' || templateId === '5X9t9uYaJWLH9FoCmxdx') {
      toast.error("Vous ne pouvez pas supprimer le template par défaut");
      return;
    }
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) {
      try {
        await deleteDoc(doc(db, 'newsletterTemplates', templateId));
        setSavedTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateId));
        setSelectedTemplate('default');
        toast.success("Template supprimé avec succès");
      } catch (error) {
        console.error('Erreur lors de la suppression du template:', error);
        toast.error("Une erreur est survenue lors de la suppression du template");
      }
    }
  };

  // Fonction pour mettre à jour un template existant
  const handleUpdateTemplate = async () => {
    try {
      if (!selectedTemplate || selectedTemplate === 'default' || selectedTemplate === '5X9t9uYaJWLH9FoCmxdx') {
        toast.error("Vous ne pouvez pas mettre à jour le template par défaut");
        return;
      }

      setIsLoading(true);
      console.log("Début de la mise à jour du template");

      // Vérifier l'état de l'authentification
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !user) {
        console.error("Erreur : Utilisateur non authentifié");
        toast.error("Vous devez être connecté pour mettre à jour un template");
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
        toast.error("Votre email n'est pas autorisé à mettre à jour des templates");
        setIsLoading(false);
        return;
      }

      // Trouver le template à mettre à jour
      const templateToUpdate = savedTemplates.find(t => t.id === selectedTemplate);
      if (!templateToUpdate) {
        toast.error("Template non trouvé");
        setIsLoading(false);
        return;
      }

      // Créer une copie profonde des sections pour les modifier
      const sectionsToSave = JSON.parse(JSON.stringify(sections));
      console.log("Structure des sections avant traitement:", sectionsToSave);

      // Créer un cache pour éviter de réuploader les mêmes images
      const imageCache: Record<string, string> = {};
      
      // Traiter les images dans les sections
      for (const section of sectionsToSave) {
        // Traiter les photos
        if (section.type === 'photos' && section.content.photos) {
          for (const photo of section.content.photos) {
            if (photo.url && photo.url.startsWith('blob:')) {
              // Si l'image est déjà dans le cache, utiliser l'URL existante
              if (imageCache[photo.url]) {
                photo.url = imageCache[photo.url];
                continue;
              }
              
              // Sinon, uploader l'image
              try {
                if (photo.file) {
                  const uploadPath = `newsletter-templates/${templateToUpdate.name}/${photo.file.name}`;
                  const url = await uploadImage(photo.file, uploadPath);
                  imageCache[photo.url] = url;
                  photo.url = url;
                }
              } catch (error) {
                console.error('Erreur lors de l\'upload de l\'image:', error);
              }
            }
          }
        }
        
        // Traiter les caractéristiques avec images
        if (section.type === 'characteristics' && section.content.characteristics) {
          for (const char of section.content.characteristics) {
            if (char.imageUrl && char.imageUrl.startsWith('blob:')) {
              // Si l'image est déjà dans le cache, utiliser l'URL existante
              if (imageCache[char.imageUrl]) {
                char.imageUrl = imageCache[char.imageUrl];
                continue;
              }
            }
          }
        }
      }

      // Mettre à jour le template dans Firestore
      const templateRef = doc(db, 'newsletterTemplates', selectedTemplate);
      await updateDoc(templateRef, {
        sections: sectionsToSave,
        updatedAt: new Date()
      });

      // Mettre à jour la liste des templates sauvegardés
      setSavedTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === selectedTemplate 
            ? { ...t, sections: sectionsToSave, updatedAt: new Date() } 
            : t
        )
      );

      toast.success(`Le template "${templateToUpdate.name}" a été mis à jour avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      toast.error("Une erreur est survenue lors de la mise à jour du template");
    } finally {
      setIsLoading(false);
    }
  };

  // Nouvelle fonction pour ajouter une section
  const addSection = (type: NewsletterSection['type']) => {
    saveScrollPosition();
    
    // Créer un nouvel ID unique
    const newId = `section-${Date.now()}`;
    
    // Créer la nouvelle section en fonction du type
    let newSection: NewsletterSection;
    
    switch (type) {
      case 'header':
        newSection = {
          id: newId,
          type: 'header',
          content: {
            logo: ''
          }
        };
        break;
      
      case 'headline':
        newSection = {
          id: newId,
          type: 'headline',
          content: {
            title: 'DÉCOUVREZ NOTRE NOUVELLE OFFRE IMMOBILIÈRE EXCEPTIONNELLE'
          }
        };
        break;
      
      case 'content':
        newSection = {
          id: newId,
          type: 'content',
          content: {
            title: 'Nouvelle offre immobilière',
            greeting: 'Bonjour {civilite} {nom},',
            paragraphs: ['Nous sommes ravis de vous présenter notre nouvelle offre immobilière.']
          }
        };
        break;
      
      case 'photos':
        newSection = {
          id: newId,
          type: 'photos',
          content: {
            photos: []
          }
        };
        break;
      
      case 'characteristics':
        newSection = {
          id: newId,
          type: 'characteristics',
          content: {
            characteristics: [
              { icon: '🏢', title: 'Type', value: 'Bureau' },
              { icon: '📏', title: 'Surface', value: '150 m²' }
            ]
          }
        };
        break;
      
      case 'location':
        newSection = {
          id: newId,
          type: 'location',
          content: {
            address: '',
            locationFeatures: ['Proche des transports', 'Centre-ville']
          }
        };
        break;
      
      case 'availability':
        newSection = {
          id: newId,
          type: 'availability',
          content: {
            availability: {
              date: 'Immédiate',
              details: 'Contactez-nous pour plus d\'informations',
            }
          }
        };
        break;
      
      case 'button':
        newSection = {
          id: newId,
          type: 'button',
          content: {
            button: {
              text: 'DEMANDER PLUS D\'INFORMATIONS',
              backgroundColor: '#e50019',
              textColor: '#ffffff',
              emailTo: 'contact@arthurloydbretagne.fr',
              emailSubject: 'Demande d\'information PEM SUD',
              emailBody: '',
              width: '80%'
            }
          }
        };
        break;
      
      case 'footer':
        newSection = {
          id: newId,
          type: 'footer',
          content: {
            socialLinks: [
              { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/arthur-loyd/' },
              { platform: 'Facebook', url: 'https://www.facebook.com/ArthurLoyd/' }
            ]
          }
        };
        break;
      
      case 'custom':
        newSection = {
          id: newId,
          type: 'custom',
          content: {
            custom: {
              icon: '✨',
              title: 'Section personnalisée',
              content: 'Contenu de la section personnalisée'
            }
          }
        };
        break;
        
      case 'surface':
        newSection = {
          id: newId,
          type: 'surface',
          content: {
            surfaceValue: '150',
            surfaceUnit: 'm²',
            surfaceTitle: 'Surface',
            surfaceIcon: '📏'
          }
        };
        break;
      
      default:
        newSection = {
          id: newId,
          type: 'content',
          content: {
            greeting: 'Bonjour,',
            paragraphs: ['Contenu de la section']
          }
        };
    }
    
    // Ajouter la nouvelle section à la liste des sections
    setSections([...sections, newSection]);
    
    // Fermer le modal
    setShowAddSectionModal(false);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour supprimer une section
  const deleteSection = (sectionId: string) => {
    // Vérifier que ce n'est pas une section obligatoire (header/footer)
    const sectionToDelete = sections.find(s => s.id === sectionId);
    
    // Confirmation avant suppression
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette section ?")) {
      const newSections = sections.filter(section => section.id !== sectionId);
      setSections(newSections);
    }
  };

  // Nouvelle fonction pour ajouter un paragraphe
  const addParagraph = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    const paragraphs = [...(section.content.paragraphs || []), "Nouveau paragraphe"];

    const updatedSection = {
      ...section,
      content: { ...section.content, paragraphs }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour supprimer un paragraphe
  const deleteParagraph = (sectionId: string, paragraphIndex: number) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    if (!section.content.paragraphs) return;

    const paragraphs = [...section.content.paragraphs];
    paragraphs.splice(paragraphIndex, 1);

    const updatedSection = {
      ...section,
      content: { ...section.content, paragraphs }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour ajouter une photo
  const addPhoto = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    const photos = [...(section.content.photos || []), { url: '/placeholder-image.jpg', caption: 'Nouvelle photo' }];

    const updatedSection = {
      ...section,
      content: { ...section.content, photos }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour supprimer une photo
  const deletePhoto = (sectionId: string, photoIndex: number) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    if (!section.content.photos) return;

    const photos = [...section.content.photos];
    photos.splice(photoIndex, 1);

    const updatedSection = {
      ...section,
      content: { ...section.content, photos }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour ajouter une caractéristique
  const addCharacteristic = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    const characteristics = [...(section.content.characteristics || []), { icon: '✨', title: 'Nouvelle caractéristique', value: 'Valeur', imageUrl: '' }];

    const updatedSection = {
      ...section,
      content: { ...section.content, characteristics }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour supprimer une caractéristique
  const deleteCharacteristic = (sectionId: string, charIndex: number) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    if (!section.content.characteristics) return;

    const characteristics = [...section.content.characteristics];
    characteristics.splice(charIndex, 1);

    const updatedSection = {
      ...section,
      content: { ...section.content, characteristics }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour ajouter une fonctionnalité de localisation
  const addLocationFeature = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    const locationFeatures = [...(section.content.locationFeatures || []), "Nouvelle fonctionnalité de localisation"];

    const updatedSection = {
      ...section,
      content: { ...section.content, locationFeatures }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour supprimer une fonctionnalité de localisation
  const deleteLocationFeature = (sectionId: string, featureIndex: number) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    if (!section.content.locationFeatures) return;

    const locationFeatures = [...section.content.locationFeatures];
    locationFeatures.splice(featureIndex, 1);

    const updatedSection = {
      ...section,
      content: { ...section.content, locationFeatures }
    };

    const newSections = [...sections];
    newSections[sectionIndex] = updatedSection;
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour réduire/développer une section
  const toggleSectionCollapse = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const newSections = [...sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      isCollapsed: !newSections[sectionIndex].isCollapsed
    };
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Nouvelle fonction pour déplacer une section vers le haut
  const moveSectionUp = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0 || sections[sectionIndex].type === 'header') return; // Ne pas déplacer l'en-tête

    const newSections = [...sections];
    const temp = newSections[sectionIndex];
    newSections[sectionIndex] = newSections[sectionIndex - 1];
    newSections[sectionIndex - 1] = temp;
    
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };
  
  // Nouvelle fonction pour déplacer une section vers le bas
  const moveSectionDown = (sectionId: string) => {
    saveScrollPosition();
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1 || sectionIndex >= sections.length - 1 || sections[sectionIndex].type === 'footer') return; // Ne pas déplacer le pied de page

    const newSections = [...sections];
    const temp = newSections[sectionIndex];
    newSections[sectionIndex] = newSections[sectionIndex + 1];
    newSections[sectionIndex + 1] = temp;
    
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Composant de modal pour ajouter une section
  const AddSectionModal = () => {
    // Types de sections disponibles
    const sectionTypes = [
      { type: 'header', label: 'En-tête', icon: '🔝', description: 'Ajouter un en-tête avec logo' },
      { type: 'headline', label: 'Titre principal', icon: '📢', description: 'Ajouter un titre accrocheur en haut de la newsletter' },
      { type: 'content', label: 'Contenu', icon: '📝', description: 'Ajouter du texte et des paragraphes' },
      { type: 'photos', label: 'Photos', icon: '📷', description: 'Ajouter une galerie de photos' },
      { type: 'characteristics', label: 'Caractéristiques', icon: '✅', description: 'Ajouter une liste de caractéristiques' },
      { type: 'location', label: 'Localisation', icon: '📍', description: 'Ajouter des informations de localisation' },
      { type: 'surface', label: 'Surface', icon: '📏', description: 'Ajouter une section dédiée à la surface' },
      { type: 'availability', label: 'Disponibilité', icon: '📅', description: 'Ajouter des informations de disponibilité' },
      { type: 'button', label: 'Bouton', icon: '🔘', description: 'Ajouter un bouton d\'appel à l\'action' },
      { type: 'footer', label: 'Pied de page', icon: '🔄', description: 'Ajouter un pied de page avec liens sociaux' },
      { type: 'custom', label: 'Section personnalisée', icon: '✨', description: 'Ajouter une section personnalisée' }
    ];
    
    // Filtrer les types de sections qui existent déjà et qui ne peuvent pas être dupliqués
    const availableSectionTypes = sectionTypes.filter(sectionType => {
      // Pour les sections uniques (header, headline, footer), vérifier si elles existent déjà
      if (['header', 'headline', 'footer'].includes(sectionType.type)) {
        return !sections.some(section => section.type === sectionType.type);
      }
      
      // Pour les autres types de sections, toujours disponibles
      return true;
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full">
          <h2 className="text-xl font-bold mb-4">Ajouter une section</h2>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {availableSectionTypes.map((sectionType) => (
              <button
                key={sectionType.type}
                onClick={() => addSection(sectionType.type as NewsletterSection['type'])}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left flex items-start transition-all hover:shadow-md"
              >
                <div className="text-3xl mr-3">{sectionType.icon}</div>
                <div>
                  <div className="font-semibold">{sectionType.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{sectionType.description}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowAddSectionModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour réorganiser les sections par drag and drop
  const handleDragEnd = (result: any) => {
    saveScrollPosition();
    // Si on n'a pas déposé dans une zone valide, ne rien faire
    if (!result.destination) return;
    
    // Si la source et la destination sont identiques, ne rien faire
    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      return;
    }
    
    // Ne pas permettre de déplacer l'en-tête ou le pied de page
    const sourceIndex = result.source.index;
    if (sections[sourceIndex].type === 'header' || sections[sourceIndex].type === 'footer') {
      return;
    }
    
    // Créer une copie des sections
    const newSections = Array.from(sections);
    
    // Retirer la section de sa position originale
    const [removed] = newSections.splice(result.source.index, 1);
    
    // Ajouter la section à sa nouvelle position
    newSections.splice(result.destination.index, 0, removed);
    
    // Mettre à jour l'état
    setSections(newSections);
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      setTimeout(restoreScrollPosition, 10);
    });
  };

  // Effet pour restaurer la position de défilement après chaque mise à jour des sections
  useEffect(() => {
    // Restaurer la position de défilement après le rendu
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [sections, scrollPosition]);

  // Effet pour vérifier la hauteur du contenu après chaque rendu
  useEffect(() => {
    if (previewRef.current) {
      const scrollHeight = previewRef.current.scrollHeight;
      const clientHeight = previewRef.current.clientHeight;
      console.log('Hauteur totale après rendu:', scrollHeight);
      console.log('Hauteur visible après rendu:', clientHeight);
      console.log('Différence (défilable):', scrollHeight - clientHeight);
      
      // Afficher les 100 premiers caractères du HTML généré
      const html = generateHtml(sections);
      console.log('Début du HTML généré:', html.substring(0, 100) + '...');
      console.log('Longueur du HTML généré:', html.length);
    }
  }, [sections, generateHtml]);

  // Générer le HTML une seule fois par rendu

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
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Sections</h2>
                <button
                  onClick={() => setShowAddSectionModal(true)}
                  className="px-4 py-2 bg-[#DC0032] text-white rounded-md flex items-center"
                >
                  <span className="mr-1">+</span> Ajouter une section
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="newsletter-sections">
                  {(provided) => (
                    <div 
                      className="space-y-4"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {getEditableSections(sections).map((section, index) => (
                        <Draggable 
                          key={section.id} 
                          draggableId={section.id} 
                          index={index}
                          isDragDisabled={section.type === 'header' || section.type === 'footer'}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-4 rounded-lg shadow ${snapshot.isDragging ? 'opacity-70' : ''}`}
                            >
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold capitalize flex items-center">
                                  {section.type !== 'header' && section.type !== 'footer' && (
                                    <span className="mr-2 cursor-grab">≡</span>
                                  )}
                                  {section.type === 'header' && 'En-tête'}
                      {section.type === 'headline' && 'Titre principal'}
                      {section.type === 'content' && 'Contenu principal'}
                      {section.type === 'photos' && 'Photos du projet'}
                      {section.type === 'characteristics' && 'Caractéristiques'}
                      {section.type === 'location' && 'Localisation'}
                      {section.type === 'availability' && 'Disponibilité'}
                      {section.type === 'button' && 'Bouton d\'action'}
                      {section.type === 'surface' && 'Surface'}
                                  {section.type === 'footer' && 'Pied de page'}
                    </h3>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => toggleSectionCollapse(section.id)}
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                    title={section.isCollapsed ? "Développer" : "Réduire"}
                                  >
                                    {section.isCollapsed ? "👁️" : "👁️‍🗨️"}
                                  </button>
                                  {/* Ne pas afficher les boutons de déplacement et suppression pour l'en-tête et le pied de page */}
                                  {section.type !== 'header' && section.type !== 'footer' && (
                                    <>
                                      <button
                                        onClick={() => moveSectionUp(section.id)}
                                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                        title="Déplacer vers le haut"
                                      >
                                        ⬆️
                                      </button>
                                      <button
                                        onClick={() => moveSectionDown(section.id)}
                                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                        title="Déplacer vers le bas"
                                      >
                                        ⬇️
                                      </button>
                                      <button
                                        onClick={() => deleteSection(section.id)}
                                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                                        title="Supprimer la section"
                                      >
                                        🗑️
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Champ pour personnaliser le titre de la section */}
                              {!section.isCollapsed && section.type !== 'header' && section.type !== 'footer' && 
                               section.type !== 'headline' && section.type !== 'content' && section.type !== 'photos' && section.type !== 'characteristics' && section.type !== 'location' && section.type !== 'availability' && section.type !== 'button' && section.type !== 'surface' && (
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Titre affiché de la section
                                  </label>
                                  <input
                                    type="text"
                                    value={section.customTitle || ""}
                                    onChange={(e) => updateSection(section.id, {
                                      ...section,
                                      customTitle: e.target.value
                                    })}
                                    placeholder={
                                      section.type === 'custom' ? 'Section personnalisée' : ''
                                    }
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                              )}

                              {!section.isCollapsed && (
                                <>
                    {section.type === 'header' && (
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center gap-4 mb-4">
                                        <div className="w-32">
                        <img 
                          src={section.content.logo} 
                          alt="Logo" 
                                            className="w-full h-auto"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'header', 'logo')}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                          />
                                          <p className="text-sm text-gray-500 mt-1">Logo de l'entreprise</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {section.type === 'footer' && (
                                    <div className="flex flex-col gap-4">
                                      <div className="border-t pt-4 mt-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Liens sociaux</h4>
                                        <div className="space-y-2">
                                          {section.content.socialLinks?.map((link, index) => (
                                            <div key={index} className="flex space-x-2 items-center">
                                              <input
                                                type="text"
                                                placeholder="Plateforme (ex: LinkedIn)"
                                                value={link.platform}
                                                onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                                                className="flex-1 p-2 border rounded"
                                              />
                                              <input
                                                type="text"
                                                placeholder="URL"
                                                value={link.url}
                                                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                                className="flex-1 p-2 border rounded"
                                              />
                                              <button
                                                onClick={() => deleteSocialLink(index)}
                                                className="p-1 text-red-500 hover:bg-red-100 rounded"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          ))}
                                          <button
                                            onClick={addSocialLink}
                                            className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                                          >
                                            + Ajouter un lien social
                                          </button>
                                        </div>
                                      </div>
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
                            value={section.content.title || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, title: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Titre de la section"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message d'accueil
                          </label>
                          <div className="mb-1">
                            <span className="text-xs text-gray-500">
                              Utilisez les tags suivants pour personnaliser : {'{nom}'}, {'{prenom}'}, {'{civilite}'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={section.content.greeting}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, greeting: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Ex: Bonjour {civilite} {nom},"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Paragraphes
                            </label>
                            <button
                              onClick={() => addParagraph(section.id)}
                              className="text-blue-600 text-sm hover:underline"
                            >
                              + Ajouter un paragraphe
                            </button>
                          </div>
                          {section.content.paragraphs?.map((paragraph, index) => (
                            <div key={index} className="mb-4 relative border rounded-lg p-2">
                              <div className="flex gap-2 mb-2 border-b pb-2">
                                <button
                                  onClick={() => {
                                    const newParagraphs = [...(section.content.paragraphs || [])];
                                    newParagraphs[index] = `<strong>${newParagraphs[index].replace(/<\/?strong>/g, '')}</strong>`;
                                    updateSection(section.id, {
                                      ...section,
                                      content: { ...section.content, paragraphs: newParagraphs }
                                    });
                                  }}
                                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 font-bold"
                                  title="Mettre en gras"
                                >
                                  B
                                </button>
                                <button
                                  onClick={() => {
                                    const newParagraphs = [...(section.content.paragraphs || [])];
                                    newParagraphs[index] = `<em>${newParagraphs[index].replace(/<\/?em>/g, '')}</em>`;
                                    updateSection(section.id, {
                                      ...section,
                                      content: { ...section.content, paragraphs: newParagraphs }
                                    });
                                  }}
                                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 italic"
                                  title="Mettre en italique"
                                >
                                  I
                                </button>
                                <button
                                  onClick={() => {
                                    const newParagraphs = [...(section.content.paragraphs || [])];
                                    newParagraphs[index] = `<u>${newParagraphs[index].replace(/<\/?u>/g, '')}</u>`;
                                    updateSection(section.id, {
                                      ...section,
                                      content: { ...section.content, paragraphs: newParagraphs }
                                    });
                                  }}
                                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 underline"
                                  title="Souligner"
                                >
                                  U
                                </button>
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      const target = e.currentTarget;
                                      const colorPicker = target.nextElementSibling as HTMLInputElement;
                                      if (colorPicker) colorPicker.click();
                                    }}
                                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center"
                                    title="Changer la couleur"
                                  >
                                    <span className="mr-1">A</span>
                                    <div className="w-3 h-3 bg-black rounded-full"></div>
                                  </button>
                                  <input 
                                    type="color" 
                                    className="hidden"
                                    onChange={(e) => {
                                      const color = e.target.value;
                                      const newParagraphs = [...(section.content.paragraphs || [])];
                                      // Remplacer la couleur existante ou ajouter une nouvelle
                                      if (newParagraphs[index].includes('color:')) {
                                        newParagraphs[index] = newParagraphs[index].replace(/color:[^;"]+(;|")/, `color:${color}$1`);
                                      } else {
                                        newParagraphs[index] = `<span style="color:${color}">${newParagraphs[index].replace(/<\/?span[^>]*>/g, '')}</span>`;
                                      }
                                      updateSection(section.id, {
                                        ...section,
                                        content: { ...section.content, paragraphs: newParagraphs }
                                      });
                                    }}
                                  />
                                </div>
                                <select
                                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                                  onChange={(e) => {
                                    const fontFamily = e.target.value;
                                    const newParagraphs = [...(section.content.paragraphs || [])];
                                    // Remplacer la police existante ou ajouter une nouvelle
                                    if (newParagraphs[index].includes('font-family:')) {
                                      newParagraphs[index] = newParagraphs[index].replace(/font-family:[^;"]+(;|")/, `font-family:${fontFamily}$1`);
                                    } else {
                                      newParagraphs[index] = `<span style="font-family:${fontFamily}">${newParagraphs[index].replace(/<\/?span[^>]*>/g, '')}</span>`;
                                    }
                                    updateSection(section.id, {
                                      ...section,
                                      content: { ...section.content, paragraphs: newParagraphs }
                                    });
                                  }}
                                  title="Changer la police"
                                >
                                  <option value="inherit">Police</option>
                                  <option value="'Montserrat', sans-serif">Montserrat</option>
                                  <option value="'Arial', sans-serif">Arial</option>
                                  <option value="'Georgia', serif">Georgia</option>
                                  <option value="'Courier New', monospace">Courier</option>
                                </select>
                                <select
                                  className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                                  onChange={(e) => {
                                    const fontSize = e.target.value;
                                    const newParagraphs = [...(section.content.paragraphs || [])];
                                    // Remplacer la taille existante ou ajouter une nouvelle
                                    if (newParagraphs[index].includes('font-size:')) {
                                      newParagraphs[index] = newParagraphs[index].replace(/font-size:[^;"]+(;|")/, `font-size:${fontSize}$1`);
                                    } else {
                                      newParagraphs[index] = `<span style="font-size:${fontSize}">${newParagraphs[index].replace(/<\/?span[^>]*>/g, '')}</span>`;
                                    }
                                    updateSection(section.id, {
                                      ...section,
                                      content: { ...section.content, paragraphs: newParagraphs }
                                    });
                                  }}
                                  title="Changer la taille"
                                >
                                  <option value="inherit">Taille</option>
                                  <option value="12px">Petit</option>
                                  <option value="16px">Normal</option>
                                  <option value="20px">Grand</option>
                                  <option value="24px">Très grand</option>
                                </select>
                              </div>
                              <textarea
                                value={paragraph.replace(/<[^>]+>/g, '')}
                                onChange={(e) => {
                                  const newParagraphs = [...(section.content.paragraphs || [])];
                                  // Préserver le formatage existant
                                  const existingFormatting = newParagraphs[index].match(/<([^>]+)>.*<\/\1>/);
                                  if (existingFormatting) {
                                    const tag = existingFormatting[1];
                                    newParagraphs[index] = `<${tag}>${e.target.value}</${tag}>`;
                                  } else {
                                    newParagraphs[index] = e.target.value;
                                  }
                                  updateSection(section.id, {
                                    ...section,
                                    content: { ...section.content, paragraphs: newParagraphs }
                                  });
                                }}
                                className="w-full p-2 border rounded min-h-[100px] pr-8"
                              />
                              <button
                                onClick={() => deleteParagraph(section.id, index)}
                                className="absolute top-2 right-2 text-red-500 hover:bg-red-100 p-1 rounded"
                                title="Supprimer ce paragraphe"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.type === 'photos' && (
                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <button
                                          onClick={() => addPhoto(section.id)}
                                          className="text-blue-600 text-sm hover:underline"
                                        >
                                          + Ajouter une photo
                                        </button>
                                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {section.content.photos?.map((photo, index) => (
                                          <div key={index} className="flex flex-col gap-2 relative">
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
                                                        // Créer une URL temporaire pour afficher l'image
                                                        const tempUrl = URL.createObjectURL(file);
                                                        
                                                        // Mettre à jour l'état avec l'URL temporaire
                                                        const newPhotos = [...(section.content.photos || [])];
                                                        newPhotos[index] = { ...photo, url: tempUrl };
                                                        updateSection(section.id, {
                                                          ...section,
                                                          content: { ...section.content, photos: newPhotos }
                                                        });
                                                        
                                                        // Uploader l'image vers Firebase Storage
                                                        uploadImage(file, `newsletter-photos/${file.name}`).then(url => {
                                                          const newPhotos = [...(section.content.photos || [])];
                                                          newPhotos[index] = { ...photo, url };
                                                          updateSection(section.id, {
                                                            ...section,
                                                            content: { ...section.content, photos: newPhotos }
                                                          });
                                                        }).catch(error => {
                                                          console.error('Erreur lors de l\'upload de l\'image:', error);
                                                          toast.error('Erreur lors de l\'upload de l\'image');
                                                        });
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                                            <div className="relative">
                            <textarea
                              value={photo.caption}
                              onChange={(e) => {
                                const newPhotos = [...(section.content.photos || [])];
                                newPhotos[index] = { ...photo, caption: e.target.value };
                                updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, photos: newPhotos }
                                });
                              }}
                              className="w-full p-2 border rounded"
                              placeholder="Légende de la photo"
                              rows={3}
                            />
                                              <button
                                                onClick={() => deletePhoto(section.id, index)}
                                                className="absolute top-2 right-2 text-red-500 hover:bg-red-100 p-1 rounded"
                                                title="Supprimer cette photo"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                          </div>
                        ))}
                                      </div>
                      </div>
                    )}

                    {section.type === 'characteristics' && (
                                    <div className="flex flex-col gap-4">
                                      <div className="space-y-4">
                                        {section.content.characteristics?.map((characteristic, index) => (
                                          <div key={index} className="border p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                              <h4 className="font-medium">Caractéristique {index + 1}</h4>
                                              <button
                                                onClick={() => deleteCharacteristic(section.id, index)}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Icône ou Image
                                                </label>
                                                <div className="flex flex-col gap-2">
                                                  <div className="flex items-center gap-3">
                                                    <div className="text-3xl">
                                                      {characteristic.icon}
                                                    </div>
                                                    <EmojiPicker 
                                                      currentEmoji={characteristic.icon} 
                                                      onEmojiSelect={(emoji: string) => {
                                                        const newCharacteristics = [...(section.content.characteristics || [])];
                                                        newCharacteristics[index] = {
                                                          ...newCharacteristics[index],
                                                          icon: emoji
                                                        };
                                                        updateSection(section.id, {
                                                          ...section,
                                                          content: {
                                                            ...section.content,
                                                            characteristics: newCharacteristics
                                                          }
                                                        });
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="flex flex-col gap-2 mt-2">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                      Ou utiliser une image
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                      {characteristic.imageUrl && (
                                                        <div className="relative w-12 h-12 border rounded overflow-hidden">
                                                          <img 
                                                            src={characteristic.imageUrl} 
                                                            alt="Icône" 
                                                            className="w-full h-full object-contain"
                                                          />
                                                        </div>
                                                      )}
                                                      <label className="cursor-pointer px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100">
                                                        {characteristic.imageUrl ? 'Changer l\'image' : 'Ajouter une image'}
                                                        <input
                                                          type="file"
                                                          accept="image/png,image/jpeg,image/gif"
                                                          className="hidden"
                                                          onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                              // Créer une URL temporaire pour afficher l'image
                                                              const tempUrl = URL.createObjectURL(file);
                                                              
                                                              // Mettre à jour l'état avec l'URL temporaire
                                                              const newCharacteristics = [...(section.content.characteristics || [])];
                                                              newCharacteristics[index] = { 
                                                                ...newCharacteristics[index], 
                                                                imageUrl: tempUrl 
                                                              };
                                                              updateSection(section.id, {
                                                                ...section,
                                                                content: { 
                                                                  ...section.content, 
                                                                  characteristics: newCharacteristics 
                                                                }
                                                              });
                                                              
                                                              // Uploader l'image vers Firebase Storage
                                                              uploadImage(file, `newsletter-characteristics/${file.name}`).then(url => {
                                                                const updatedCharacteristics = [...(section.content.characteristics || [])];
                                                                updatedCharacteristics[index] = { 
                                                                  ...updatedCharacteristics[index], 
                                                                  imageUrl: url 
                                                                };
                                                                updateSection(section.id, {
                                                                  ...section,
                                                                  content: { 
                                                                    ...section.content, 
                                                                    characteristics: updatedCharacteristics 
                                                                  }
                                                                });
                                                              }).catch(error => {
                                                                console.error('Erreur lors de l\'upload de l\'image:', error);
                                                                toast.error('Erreur lors de l\'upload de l\'image');
                                                              });
                                                            }
                                                          }}
                                                        />
                                                      </label>
                                                      {characteristic.imageUrl && (
                                                        <button
                                                          onClick={() => {
                                                            const newCharacteristics = [...(section.content.characteristics || [])];
                                                            newCharacteristics[index] = {
                                                              ...newCharacteristics[index],
                                                              imageUrl: ''
                                                            };
                                                            updateSection(section.id, {
                                                              ...section,
                                                              content: {
                                                                ...section.content,
                                                                characteristics: newCharacteristics
                                                              }
                                                            });
                                                          }}
                                                          className="px-2 py-1 text-red-600 text-sm hover:text-red-800"
                                                          title="Supprimer l'image"
                                                        >
                                                          Supprimer
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Titre
                                                </label>
                              <input
                                type="text"
                                                  value={characteristic.title}
                                onChange={(e) => {
                                                    const newCharacteristics = [...(section.content.characteristics || [])];
                                                    newCharacteristics[index] = {
                                                      ...newCharacteristics[index],
                                                      title: e.target.value
                                                    };
                                  updateSection(section.id, {
                                    ...section,
                                                      content: {
                                                        ...section.content,
                                                        characteristics: newCharacteristics
                                                      }
                                  });
                                }}
                                                  className="w-full p-2 border rounded"
                              />
                            </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Valeur
                                                </label>
                            <input
                              type="text"
                                                  value={characteristic.value}
                              onChange={(e) => {
                                                    const newCharacteristics = [...(section.content.characteristics || [])];
                                                    newCharacteristics[index] = {
                                                      ...newCharacteristics[index],
                                                      value: e.target.value
                                                    };
                                updateSection(section.id, {
                                  ...section,
                                                      content: {
                                                        ...section.content,
                                                        characteristics: newCharacteristics
                                                      }
                                });
                              }}
                              className="w-full p-2 border rounded"
                            />
                                              </div>
                                            </div>
                          </div>
                        ))}
                                      </div>
                                      <button
                                        onClick={() => addCharacteristic(section.id)}
                                        className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                                      >
                                        + Ajouter une caractéristique
                                      </button>
                      </div>
                    )}

                    {section.type === 'location' && (
                                    <div>
                                      <div className="flex flex-col gap-4 mb-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Adresse
                                          </label>
                                          <input
                                            type="text"
                                            value={section.content.address || ''}
                                            onChange={(e) => updateSection(section.id, {
                                              ...section,
                                              content: { ...section.content, address: e.target.value }
                                            })}
                                            className="w-full p-2 border rounded"
                                            placeholder="Adresse du bien"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                          Localisation - Points forts
                                        </label>
                                        <button
                                          onClick={() => addLocationFeature(section.id)}
                                          className="text-blue-600 text-sm hover:underline"
                                        >
                                          + Ajouter un point fort
                                        </button>
                                      </div>
                      <div className="flex flex-col gap-4">
                        {section.content.locationFeatures?.map((feature, index) => (
                                          <div key={index} className="relative">
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
                                              className="w-full p-2 border rounded pr-8"
                                            />
                                            <button
                                              onClick={() => deleteLocationFeature(section.id, index)}
                                              className="absolute top-2 right-2 text-red-500 hover:bg-red-100 p-1 rounded"
                                              title="Supprimer ce point fort"
                                            >
                                              🗑️
                                            </button>
                          </div>
                        ))}
                                      </div>
                      </div>
                    )}

                    {section.type === 'availability' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre de la section
                          </label>
                          <input
                            type="text"
                            value={section.customTitle || 'Disponibilité'}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              customTitle: e.target.value
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Disponibilité"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Libellé de la date
                          </label>
                          <input
                            type="text"
                            value={section.content.availability?.dateLabel || 'Date de disponibilité'}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...(section.content.availability || {}), 
                                  dateLabel: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Date de disponibilité"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="text"
                            value={section.content.availability?.date || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...(section.content.availability || {}), 
                                  date: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Libellé des détails
                          </label>
                          <input
                            type="text"
                            value={section.content.availability?.detailsLabel || 'Détails supplémentaires'}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...(section.content.availability || {}), 
                                  detailsLabel: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Détails supplémentaires"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Détails
                          </label>
                          <textarea
                            value={section.content.availability?.details || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                availability: {
                                  ...(section.content.availability || {}), 
                                  details: e.target.value
                                }
                              }
                            })}
                            rows={3}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    )}

                    {section.type === 'custom' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Icône
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">
                              {section.content.custom?.icon || '✨'}
                            </div>
                            <EmojiPicker 
                              currentEmoji={section.content.custom?.icon || '✨'} 
                              onEmojiSelect={(emoji: string) => updateSection(section.id, {
                                ...section,
                                content: { 
                                  ...section.content, 
                                  custom: { 
                                    ...(section.content.custom || {}), 
                                    icon: emoji 
                                  } 
                                }
                              })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contenu
                          </label>
                          <textarea
                            value={section.content.custom?.content || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { 
                                ...section.content, 
                                custom: { 
                                  ...(section.content.custom || {}), 
                                  content: e.target.value 
                                } 
                              }
                            })}
                            rows={4}
                            className="w-full p-2 border rounded"
                            placeholder="Contenu de la section"
                          />
                        </div>
                      </div>
                    )}

                    {section.type === 'surface' && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Icône
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">
                                {section.content.surfaceIcon || '📏'}
                              </div>
                              <EmojiPicker 
                                currentEmoji={section.content.surfaceIcon || '📏'} 
                                onEmojiSelect={(emoji: string) => {
                                  updateSection(section.id, {
                                    ...section,
                                    content: { ...section.content, surfaceIcon: emoji }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Valeur de la surface
                            </label>
                            <input
                              type="text"
                              value={section.content.surfaceValue || ''}
                              onChange={(e) => updateSection(section.id, {
                                ...section,
                                content: { ...section.content, surfaceValue: e.target.value }
                              })}
                              className="w-full p-2 border rounded"
                              placeholder="150"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unité
                            </label>
                            <input
                              type="text"
                              value={section.content.surfaceUnit || ''}
                              onChange={(e) => updateSection(section.id, {
                                ...section,
                                content: { ...section.content, surfaceUnit: e.target.value }
                              })}
                              className="w-full p-2 border rounded"
                              placeholder="m²"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Couleur de fond
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={section.content.surfaceBackgroundColor || '#f3f4f6'}
                                onChange={(e) => updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, surfaceBackgroundColor: e.target.value }
                                })}
                                className="w-10 h-10 p-1 border rounded"
                              />
                              <input
                                type="text"
                                value={section.content.surfaceBackgroundColor || '#f3f4f6'}
                                onChange={(e) => updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, surfaceBackgroundColor: e.target.value }
                                })}
                                className="flex-1 p-2 border rounded"
                                placeholder="#f3f4f6"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Couleur du texte
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={section.content.surfaceTextColor || '#111827'}
                                onChange={(e) => updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, surfaceTextColor: e.target.value }
                                })}
                                className="w-10 h-10 p-1 border rounded"
                              />
                              <input
                                type="text"
                                value={section.content.surfaceTextColor || '#111827'}
                                onChange={(e) => updateSection(section.id, {
                                  ...section,
                                  content: { ...section.content, surfaceTextColor: e.target.value }
                                })}
                                className="flex-1 p-2 border rounded"
                                placeholder="#111827"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (optionnelle)
                          </label>
                          <textarea
                            value={section.content.surfaceDescription || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: { ...section.content, surfaceDescription: e.target.value }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Description supplémentaire"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    {section.type === 'footer' && (
                      <div className="flex flex-col gap-4">
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-medium text-gray-700 mb-2">Liens sociaux</h4>
                          <div className="space-y-2">
                            {section.content.socialLinks?.map((link, index) => (
                              <div key={index} className="flex space-x-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Plateforme (ex: LinkedIn)"
                                  value={link.platform}
                                  onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                                  className="flex-1 p-2 border rounded"
                                />
                                <input
                                  type="text"
                                  placeholder="URL"
                                  value={link.url}
                                  onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                  className="flex-1 p-2 border rounded"
                                />
                                <button
                                  onClick={() => deleteSocialLink(index)}
                                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={addSocialLink}
                              className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                            >
                              + Ajouter un lien social
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.type === 'button' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Texte du bouton
                          </label>
                          <input
                            type="text"
                            value={section.content.button?.text || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                button: {
                                  ...(section.content.button || {}),
                                  text: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="DEMANDER PLUS D'INFORMATIONS"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Couleur de fond
                            </label>
                            <input
                              type="color"
                              value={section.content.button?.backgroundColor || '#e50019'}
                              onChange={(e) => updateSection(section.id, {
                                ...section,
                                content: {
                                  ...section.content,
                                  button: {
                                    ...(section.content.button || {}),
                                    backgroundColor: e.target.value
                                  }
                                }
                              })}
                              className="w-full p-1 border rounded h-10"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Couleur du texte
                            </label>
                            <input
                              type="color"
                              value={section.content.button?.textColor || '#ffffff'}
                              onChange={(e) => updateSection(section.id, {
                                ...section,
                                content: {
                                  ...section.content,
                                  button: {
                                    ...(section.content.button || {}),
                                    textColor: e.target.value
                                  }
                                }
                              })}
                              className="w-full p-1 border rounded h-10"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse email de destination
                          </label>
                          <input
                            type="email"
                            value={section.content.button?.emailTo || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                button: {
                                  ...(section.content.button || {}),
                                  emailTo: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="contact@arthurloydbretagne.fr"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Objet de l'email
                          </label>
                          <input
                            type="text"
                            value={section.content.button?.emailSubject || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                button: {
                                  ...(section.content.button || {}),
                                  emailSubject: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="Demande d'information PEM SUD"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Corps de l'email (optionnel)
                          </label>
                          <textarea
                            value={section.content.button?.emailBody || ''}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                button: {
                                  ...(section.content.button || {}),
                                  emailBody: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            rows={3}
                            placeholder="Bonjour, je souhaite obtenir plus d'informations..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Largeur du bouton
                          </label>
                          <input
                            type="text"
                            value={section.content.button?.width || '80%'}
                            onChange={(e) => updateSection(section.id, {
                              ...section,
                              content: {
                                ...section.content,
                                button: {
                                  ...(section.content.button || {}),
                                  width: e.target.value
                                }
                              }
                            })}
                            className="w-full p-2 border rounded"
                            placeholder="80%"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Exemple: 80%, 300px, etc.
                          </p>
                        </div>
                        
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600">
                            Ce bouton créera un lien "mailto:" qui ouvrira le client email du destinataire avec l'adresse, l'objet et le corps pré-remplis.
                          </p>
                        </div>
                      </div>
                    )}
                                </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
              </div>
                  )}
                </Droppable>
              </DragDropContext>

              <div className="mt-6">
                <div className="flex space-x-4">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="px-4 py-2 border rounded-md w-full"
                  >
                    <option value="default">-- Sélectionner un template --</option>
                    {savedTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.id === "5X9t9uYaJWLH9FoCmxdx" ? "(Template par défaut)" : ""}
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
                    disabled={!selectedTemplate || selectedTemplate === 'default' || selectedTemplate === '5X9t9uYaJWLH9FoCmxdx'}
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
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md disabled:bg-gray-400"
                    >
                      Sauvegarder comme nouveau template
                    </button>
                    
                    {selectedTemplate && selectedTemplate !== 'default' && selectedTemplate !== '5X9t9uYaJWLH9FoCmxdx' && (
                      <button
                        onClick={handleUpdateTemplate}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md"
                      >
                        Mettre à jour le template sélectionné
                      </button>
                    )}
                  </div>
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
        <div 
          className="bg-white p-4 rounded-lg shadow-md sticky top-4 max-h-[calc(100vh-2rem)]" 
          id="newsletter-preview-container"
        >
          <h3 className="text-lg font-semibold mb-4">Aperçu</h3>
          <div 
            className="border rounded-lg overflow-auto max-h-[calc(100vh-8rem)]"
            ref={previewRef}
          >
            <div
              className="p-4"
              dangerouslySetInnerHTML={{ __html: generateHtml(sections) }}
            />
          </div>
        </div>
      </div>

      {/* Modal pour ajouter une section */}
      {showAddSectionModal && <AddSectionModal />}
    </div>
  );
} 