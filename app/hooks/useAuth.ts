import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignIn, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

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

  // Observer l'état d'authentification
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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
      await firebaseSignOut(auth);
    } catch (err) {
      setError("Échec de la déconnexion.");
      console.error(err);
    }
  };

  return { user, loading, error, signIn, signOut };
} 