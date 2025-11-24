"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // This is the commander
        const userProfile: UserProfile = {
          id: firebaseUser.uid,
          username: 'nicat',
          role: 'commander',
        };
        setUser(userProfile);
        localStorage.setItem('user', JSON.stringify(userProfile));
      } else {
        // Check for sub-commander in localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          if (parsedUser.role === 'sub-commander') {
            setUser(parsedUser);
          } else {
             localStorage.removeItem('user');
             setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    try {
      if (username.toLowerCase() === 'nicat') {
        // Commander Login
        if (pass === 'Nicat2024') {
          try {
            await signInWithEmailAndPassword(auth, 'nicat@geoshield.az', pass);
            router.push('/komandir');
          } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
              await createUserWithEmailAndPassword(auth, 'nicat@geoshield.az', pass);
              router.push('/komandir');
            } else {
              throw error;
            }
          }
        } else {
          throw new Error('Baş Komandir üçün yanlış şifrə.');
        }
      } else {
        // Sub-commander Login
        const q = query(
          collection(db, "users"),
          where("username", "==", username),
          where("password", "==", pass), // Note: Storing plain text passwords is not secure. This is for demo purposes.
          where("role", "==", "sub-commander")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('İstifadəçi adı və ya şifrə yanlışdır.');
        }

        const userDoc = querySnapshot.docs[0];
        const userProfile: UserProfile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
        setUser(userProfile);
        localStorage.setItem('user', JSON.stringify(userProfile));
        router.push('/sub-komandir');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Giriş Xətası",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if(user?.role === 'commander') {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem('user');
    setUser(null);
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
