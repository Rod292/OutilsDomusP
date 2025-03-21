import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignIn, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { updateUserActivity, removeUserActivity } from '../services/activeUsersService';

// Liste des consultants pour mapping email → nom
const CONSULTANTS = [
  { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
  { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
  { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
  { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
  { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
  { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
  { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
  { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
  { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
  { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
];

interface AuthHook {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthHook {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Obtenir le nom du consultant à partir de l'email
  const getConsultantName = (email: string): string => {
    const consultant = CONSULTANTS.find(c => c.email === email);
    return consultant ? consultant.name : email.split('@')[0];
  };

  // Observer l'état d'authentification
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Stocker l'email de l'utilisateur dans sessionStorage et localStorage pour les notifications
      if (currentUser && currentUser.email) {
        console.log(`Stockage de l'email de l'utilisateur: ${currentUser.email}`);
        // Utiliser à la fois sessionStorage (session courante) et localStorage (persistant)
        sessionStorage.setItem('userEmail', currentUser.email);
        localStorage.setItem('userEmail', currentUser.email);
        
        // Mettre à jour le statut d'activité de l'utilisateur
        const consultantName = getConsultantName(currentUser.email);
        updateUserActivity(currentUser.email, consultantName);
        
        // Essayer de stocker également l'identité de l'utilisateur dans le service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'STORE_USER_EMAIL',
              email: currentUser.email
            });
            console.log('Email utilisateur envoyé au service worker');
          } catch (e) {
            console.warn('Échec de l\'envoi de l\'email au service worker:', e);
          }
        }
      } else {
        sessionStorage.removeItem('userEmail');
        // Ne pas supprimer de localStorage pour maintenir la persistance entre les sessions
      }
    });

    return () => unsubscribe();
  }, []);

  // Connexion avec email et mot de passe
  const signIn = async (email: string, password: string) => {
    setError(null);
    if (!auth) {
      setError("Service d'authentification non disponible");
      return;
    }
    
    try {
      await firebaseSignIn(auth, email, password);
      
      // Enregistrer l'utilisateur comme actif après la connexion réussie
      const consultantName = getConsultantName(email);
      await updateUserActivity(email, consultantName);
    } catch (err) {
      setError("Échec de l'authentification. Veuillez vérifier vos identifiants.");
      console.error(err);
    }
  };

  // Déconnexion
  const signOut = async () => {
    setError(null);
    if (!auth) {
      setError("Service d'authentification non disponible");
      return;
    }
    
    try {
      // Supprimer l'utilisateur des utilisateurs actifs avant la déconnexion
      if (user && user.email) {
        await removeUserActivity(user.email);
      }
      
      await firebaseSignOut(auth);
    } catch (err) {
      setError("Échec de la déconnexion.");
      console.error(err);
    }
  };

  return { user, loading, error, signIn, signOut };
} 