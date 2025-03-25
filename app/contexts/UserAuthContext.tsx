'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';

interface UserAuthContextType {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  isSignedIn: false,
  isLoading: true,
  signOut: async () => {},
});

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setUser(user);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const signOut = async () => {
    if (!auth) return;
    
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <UserAuthContext.Provider value={{ user, isSignedIn: !!user, isLoading, signOut }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(UserAuthContext);
} 