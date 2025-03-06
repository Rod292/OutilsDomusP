'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import NewsletterPreview from './NewsletterPreview';
import TemplateSaveForm from './TemplateSaveForm';
import SendEmailForm from './SendEmailForm';

// Types pour nos templates de newsletter
type NewsletterTemplate = {
  id?: string;
  name: string;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function NewsletterEditor() {
  // État pour le contenu HTML de la newsletter
  const [htmlContent, setHtmlContent] = useState<string>('');
  // État pour les templates sauvegardés
  const [savedTemplates, setSavedTemplates] = useState<NewsletterTemplate[]>([]);
  // État pour le template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  // État pour le mode (édition ou envoi)
  const [mode, setMode] = useState<'edit' | 'send'>('edit');
  // État de chargement
  const [loading, setLoading] = useState<boolean>(true);

  // Charger le template par défaut et les templates sauvegardés au chargement du composant
  useEffect(() => {
    const fetchDefaultTemplate = async () => {
      try {
        setLoading(true);
        
        // Charger les templates sauvegardés depuis Firebase
        const querySnapshot = await getDocs(collection(db, 'newsletterTemplates'));
        const templates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as NewsletterTemplate[];
        
        setSavedTemplates(templates);
        
        // Si nous avons des templates, vérifier si le template par défaut existe
        const defaultTemplate = templates.find(template => template.name === 'PEM SUD - Template par défaut');
        
        if (defaultTemplate) {
          // Si le template par défaut existe, l'utiliser
          setHtmlContent(defaultTemplate.htmlContent);
          setSelectedTemplate(defaultTemplate.id || 'default');
        } else {
          // Sinon, charger le contenu HTML du fichier
          const response = await fetch('/api/newsletter/default-template');
          if (response.ok) {
            const data = await response.json();
            setHtmlContent(data.htmlContent);
          } else {
            console.error('Erreur lors du chargement du template par défaut');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des templates:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDefaultTemplate();
  }, []);

  // Charger un template sauvegardé
  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      
      if (templateId === 'default') {
        // Charger le contenu HTML du fichier par défaut via l'API
        const response = await fetch('/api/newsletter/default-template');
        if (response.ok) {
          const data = await response.json();
          setHtmlContent(data.htmlContent);
          setSelectedTemplate('default');
        } else {
          console.error('Erreur lors du chargement du template par défaut');
        }
      } else {
        // Trouver le template dans les templates sauvegardés
        const template = savedTemplates.find(t => t.id === templateId);
        
        // Vérifier si c'est le template par défaut (par son nom)
        if (template && template.name === 'PEM SUD - Template par défaut') {
          // Si c'est le template par défaut, le charger depuis l'API pour s'assurer qu'il est à jour
          const response = await fetch('/api/newsletter/default-template');
          if (response.ok) {
            const data = await response.json();
            setHtmlContent(data.htmlContent);
          } else {
            console.error('Erreur lors du chargement du template par défaut');
            // Utiliser la version stockée en cas d'erreur
            setHtmlContent(template.htmlContent);
          }
        } else if (template) {
          // Si c'est un autre template, le charger normalement
          setHtmlContent(template.htmlContent);
        } else {
          // Si le template n'est pas trouvé dans l'état, le chercher dans Firebase
          try {
            const docRef = doc(db, 'newsletterTemplates', templateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data() as NewsletterTemplate;
              
              // Vérifier si c'est le template par défaut (par son nom)
              if (data.name === 'PEM SUD - Template par défaut') {
                // Si c'est le template par défaut, le charger depuis l'API
                const response = await fetch('/api/newsletter/default-template');
                if (response.ok) {
                  const apiData = await response.json();
                  setHtmlContent(apiData.htmlContent);
                } else {
                  // Utiliser la version stockée en cas d'erreur
                  setHtmlContent(data.htmlContent);
                }
              } else {
                // Si c'est un autre template, le charger normalement
                setHtmlContent(data.htmlContent);
              }
            } else {
              console.error('Template non trouvé');
            }
          } catch (error) {
            console.error('Erreur lors du chargement du template:', error);
          }
        }
      }
      
      setSelectedTemplate(templateId);
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder un template
  const saveTemplate = async (templateName: string) => {
    try {
      setLoading(true);
      
      // Vérifier si le template existe déjà
      const existingTemplate = savedTemplates.find(t => t.name === templateName);
      
      // Vérifier si c'est le template par défaut
      if (templateName === 'PEM SUD - Template par défaut') {
        throw new Error('Le template par défaut ne peut pas être modifié');
      }
      
      if (existingTemplate) {
        // Mettre à jour le template existant
        const docRef = doc(db, 'newsletterTemplates', existingTemplate.id!);
        await updateDoc(docRef, {
          htmlContent,
          updatedAt: new Date()
        });
        
        // Mettre à jour l'état local
        setSavedTemplates(prevTemplates => 
          prevTemplates.map(t => 
            t.id === existingTemplate.id 
              ? { ...t, htmlContent, updatedAt: new Date() } 
              : t
          )
        );
      } else {
        // Créer un nouveau template
        const newTemplate: NewsletterTemplate = {
          name: templateName,
          htmlContent,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'newsletterTemplates'), newTemplate);
        
        // Ajouter le nouveau template à l'état local
        setSavedTemplates(prevTemplates => [
          ...prevTemplates,
          { ...newTemplate, id: docRef.id }
        ]);
        
        // Sélectionner le nouveau template
        setSelectedTemplate(docRef.id);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      throw error; // Propager l'erreur pour que le formulaire puisse l'afficher
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour un template existant
  const updateTemplate = async () => {
    try {
      setLoading(true);
      
      // Vérifier si un template est sélectionné et qu'il n'est pas le template par défaut
      if (selectedTemplate === 'default') {
        throw new Error('Le template par défaut ne peut pas être modifié');
      }
      
      // Trouver le template sélectionné
      const template = savedTemplates.find(t => t.id === selectedTemplate);
      
      if (!template) {
        throw new Error('Template non trouvé');
      }
      
      // Mettre à jour le template
      const docRef = doc(db, 'newsletterTemplates', selectedTemplate);
      await updateDoc(docRef, {
        htmlContent,
        updatedAt: new Date()
      });
      
      // Mettre à jour l'état local
      setSavedTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === selectedTemplate 
            ? { ...t, htmlContent, updatedAt: new Date() } 
            : t
        )
      );
      
      // Afficher un message de succès
      alert(`Le template "${template.name}" a été mis à jour avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour du HTML
  const updateHtml = (newHtml: string) => {
    setHtmlContent(newHtml);
  };

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Sélection de template</h2>
          <div className="flex flex-col space-y-4">
            <select 
              className="w-full p-2 border rounded"
              value={selectedTemplate}
              onChange={(e) => loadTemplate(e.target.value)}
            >
              <option value="default">Template PEM SUD (par défaut)</option>
              {savedTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            
            {/* Bouton de mise à jour du template sélectionné */}
            {selectedTemplate !== 'default' && (
              <button 
                className="px-4 py-2 bg-yellow-500 text-white rounded font-medium hover:bg-yellow-600 transition-colors"
                onClick={updateTemplate}
                disabled={loading}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour ce template'}
              </button>
            )}
            
            {/* Message d'avertissement pour le template par défaut */}
            {selectedTemplate === 'default' && (
              <div className="p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                Le template par défaut ne peut pas être modifié. Veuillez créer un nouveau template pour sauvegarder vos modifications.
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <button 
            className={`px-4 py-2 rounded font-medium ${mode === 'edit' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('edit')}
          >
            Éditer
          </button>
          <button 
            className={`px-4 py-2 rounded font-medium ${mode === 'send' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('send')}
          >
            Envoyer
          </button>
        </div>

        {mode === 'edit' ? (
          <>
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Édition du contenu HTML</h2>
              <textarea
                className="w-full h-96 p-2 font-mono text-sm border rounded"
                value={htmlContent}
                onChange={(e) => updateHtml(e.target.value)}
              />
            </div>
            
            <TemplateSaveForm onSave={saveTemplate} />
          </>
        ) : (
          <SendEmailForm htmlContent={htmlContent} />
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Prévisualisation</h2>
        <div className="border rounded p-1 bg-gray-100 max-h-screen overflow-auto">
          <NewsletterPreview htmlContent={htmlContent} />
        </div>
      </div>
    </div>
  );
} 