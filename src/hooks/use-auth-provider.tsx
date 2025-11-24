"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
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
    // Check for a logged-in user in localStorage on initial load
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Redirect if user is already logged in
          if (window.location.pathname === '/login') {
            if (parsedUser.role === 'commander') {
              router.replace('/komandir');
            } else if (parsedUser.role === 'sub-commander') {
              router.replace('/sub-komandir');
            }
          }
        } else if (window.location.pathname !== '/login') {
            // If no user and not on login page, redirect to login
            router.replace('/login');
        }
    } catch (error) {
        console.error("Failed to process user from localStorage", error);
        localStorage.removeItem('user');
        router.replace('/login');
    } finally {
        setLoading(false);
    }
  }, [router]);

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

      // Existing logic for other users from database
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
