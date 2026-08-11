
"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, DocumentData } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

interface AppUser extends FirebaseUser {
    firstName?: string;
    lastName?: string;
    role?: string;
    isAdmin?: boolean;
    [key: string]: any;
}

interface AuthContextType {
  user: AppUser | null;
  userData: DocumentData | null;
  loadingAuth: boolean;
  loadingUser: boolean;
  /** Call this to manually re-fetch the user's Firestore profile (e.g. after a profile update). */
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // One-time fetch — avoids all onSnapshot WebSocket listener teardown races
  // (Firestore SDK 11.x assertion failures: ID ca9 / b815).
  const fetchUserData = useCallback(async (uid: string) => {
    setUserLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        // Fallback profile creation for drivers created via Auth or missing Firestore doc
        const defaultProfile = {
          uid,
          email: authUser?.email || '',
          firstName: authUser?.displayName ? authUser.displayName.split(' ')[0] : 'Conducteur',
          lastName: authUser?.displayName ? authUser.displayName.split(' ').slice(1).join(' ') : '',
          role: 'transporter',
          status: 'disponible',
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'users', uid), defaultProfile);
          setUserData(defaultProfile);
        } catch (e) {
          setUserData(defaultProfile as any);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // Wait until Firebase Auth has resolved

    if (!authUser) {
      // Logged out — clear state immediately, no Firestore call needed
      setUserData(null);
      setUserLoading(false);
      return;
    }

    fetchUserData(authUser.uid);
    // No cleanup needed — getDoc returns a Promise, not a listener.
  }, [authUser, authLoading, fetchUserData]);

  // Expose refreshUserData so pages can re-fetch after profile edits
  const refreshUserData = useCallback(async () => {
    if (authUser) await fetchUserData(authUser.uid);
  }, [authUser, fetchUserData]);

  const user: AppUser | null = authUser
    ? { ...authUser, ...userData }
    : null;

  const value: AuthContextType = {
    user,
    userData,
    loadingAuth: authLoading,
    loadingUser: userLoading,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
