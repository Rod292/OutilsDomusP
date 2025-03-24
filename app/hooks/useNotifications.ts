'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  initializeMessaging, 
  registerServiceWorker, 
  checkTokensForUser, 
  cleanupDuplicateTokens 
} from '../services/notificationService';

export interface NotificationPermissionStatus {
  permission: NotificationPermission;
  hasTokens: boolean;
  initialized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook personnalisé pour gérer les notifications
 * @param consultant Nom du consultant (optionnel)
 * @returns Statut de la permission et fonctions associées
 */
export function useNotifications(consultant?: string) {
  const { user } = useAuth();
  const [status, setStatus] = useState<NotificationPermissionStatus>({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    hasTokens: false,
    initialized: false,
    isLoading: false,
    error: null
  });

  // Vérifier si des tokens existent déjà
  const checkExistingTokens = useCallback(async () => {
    if (!user?.email) return false;
    
    try {
      // Vérifier si des tokens existent pour cet utilisateur
      const hasTokens = await checkTokensForUser(user.email, consultant);
      return hasTokens;
    } catch (error) {
      console.error('Erreur lors de la vérification des tokens:', error);
      return false;
    }
  }, [user?.email, consultant]);

  // Mettre à jour l'état des permissions
  const updatePermissionStatus = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setStatus({
        permission: 'denied',
        hasTokens: false,
        initialized: true,
        isLoading: false,
        error: 'Les notifications ne sont pas supportées dans ce navigateur'
      });
      return;
    }
    
    const permission = Notification.permission;
    const hasTokens = await checkExistingTokens();
    
    setStatus({
      permission,
      hasTokens,
      initialized: true,
      isLoading: false,
      error: null
    });
  }, [checkExistingTokens]);

  // Initialiser les notifications pour l'utilisateur actuel
  useEffect(() => {
    if (!user?.email) return;
    
    // Enregistrer le service worker au chargement
    registerServiceWorker().catch(error => {
      console.error('Erreur lors de l\'enregistrement du service worker:', error);
    });
    
    // Mettre à jour les informations sur les permissions
    updatePermissionStatus();
  }, [user?.email, updatePermissionStatus]);

  // Demander la permission et initialiser les notifications
  const requestPermission = useCallback(async () => {
    if (!user?.email) {
      setStatus(prev => ({
        ...prev,
        error: 'Utilisateur non connecté'
      }));
      return false;
    }
    
    setStatus(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
    
    try {
      // Construire l'ID utilisateur
      const userId = consultant ? `${user.email}_${consultant}` : user.email;
      
      // Enregistrer le service worker si ce n'est pas déjà fait
      await registerServiceWorker();
      
      // Initialiser Firebase Messaging et demander les permissions
      const token = await initializeMessaging(userId);
      
      if (!token) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Impossible d\'obtenir un token de notification'
        }));
        return false;
      }
      
      // Nettoyer les tokens dupliqués
      await cleanupDuplicateTokens(userId);
      
      // Mettre à jour l'état
      setStatus({
        permission: 'granted',
        hasTokens: true,
        initialized: true,
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des notifications:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
      return false;
    }
  }, [user?.email, consultant]);

  // Vérifier l'état actuel des notifications
  const checkStatus = useCallback(async () => {
    setStatus(prev => ({
      ...prev,
      isLoading: true
    }));
    
    await updatePermissionStatus();
    
    setStatus(prev => ({
      ...prev,
      isLoading: false
    }));
  }, [updatePermissionStatus]);

  return {
    status,
    requestPermission,
    checkStatus
  };
} 