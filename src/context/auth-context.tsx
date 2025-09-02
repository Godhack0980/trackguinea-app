
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
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
  loadingAuth: boolean; // True while firebase auth is resolving, then false.
  loadingUser: boolean; // True until user data from firestore is fetched.
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    // If authUser is null (logged out) or still loading, reset state.
    if (!authUser) {
      setUserData(null);
      setUserLoading(false);
      return;
    }

    // If authUser is available, fetch user data from Firestore.
    setUserLoading(true);
    const userDocRef = doc(db, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData(null); // User in Auth but not in Firestore
        console.warn(`User with UID ${authUser.uid} not found in Firestore.`);
      }
      setUserLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      setUserData(null);
      setUserLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [authUser]);

  // Combine authUser and userData into a single user object.
  const user: AppUser | null = authUser ? {
    ...authUser,
    ...userData
  } : null;

  const value: AuthContextType = {
    user,
    userData,
    loadingAuth: authLoading,
    loadingUser: userLoading,
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
