"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from './use-toast';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect now only handles anonymous sign-in for public data access
    // and restoring session from localStorage.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        // If not signed in (even anonymously), sign in anonymously.
        // This is useful for securing public data, allowing reads only for app users.
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed", error);
        }
      }
    });
    
    // Check for a logged-in user in localStorage
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('user');
    }

    setLoading(false);

    return () => unsubscribe();
  }, []);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    try {
      // Hardcoded check for the main commander
      if (username === 'Nicat' && pass === 'Nicat2025') {
        const commanderProfile: UserProfile = {
          id: 'admin_nicat',
          username: 'Nicat',
          role: 'commander',
          canSeeAllUnits: true,
        };
        setUser(commanderProfile);
        localStorage.setItem('user', JSON.stringify(commanderProfile));
        router.push('/komandir');
        setLoading(false);
        return;
      }

      // Existing logic for other users
      const q = query(
        collection(db, "users"),
        where("username", "==", username),
        where("password", "==", pass)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('İstifadəçi adı və ya şifrə yanlışdır.');
      }

      const userDoc = querySnapshot.docs[0];
      const userProfile: UserProfile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      
      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));

      if (userProfile.role === 'commander') {
        router.push('/komandir');
      } else if (userProfile.role === 'sub-commander') {
        router.push('/sub-komandir');
      } else {
         throw new Error('Tanınmayan istifadəçi rolu.');
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Giriş Xətası",
        description: error.message,
      });
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('user');
    setUser(null);
    // We can keep the anonymous session for public data access
    // For simplicity, we'll just clear local state.
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
