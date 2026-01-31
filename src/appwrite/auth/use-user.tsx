"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { account, databases, appwriteConfig } from "../config";
import { Models } from "appwrite";

interface UserContextType {
  user: Models.User<Models.Preferences> | null;
  profile: Models.Document | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<Models.Document | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      
      // Fetch user profile from database
      try {
        const userDoc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            currentUser.$id
        );
        setProfile(userDoc);
      } catch (profileErr) {
        const appwriteErr = profileErr as { code?: number };
        if (appwriteErr.code === 404) {
          // Document not found, let's create it. This can happen if signup was interrupted.
          try {
            const phoneFromEmail = currentUser.email.startsWith('user_') && currentUser.email.endsWith('@syllabx.com')
                ? currentUser.email.substring(5, currentUser.email.indexOf('@'))
                : '';

            const newUserDoc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.usersCollectionId,
                currentUser.$id,
                {
                    userId: currentUser.$id,
                    name: currentUser.name,
                    email: currentUser.email,
                    phone: phoneFromEmail,
                    createdAt: new Date().toISOString(),
                    enrolledCourses: []
                }
            );
            setProfile(newUserDoc);
          } catch (creationError) {
             // If creation also fails, we can't do much. Set profile to null.
             setProfile(null);
          }
        } else {
            // Some other error fetching profile, set profile to null
            setProfile(null);
        }
      }

      // Also check admin status globally
      try {
        await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.adminsCollectionId,
            currentUser.$id
        );
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
      
      setError(null);
    } catch (err) {
      const appwriteErr = err as { code?: number; message?: string };
      if (appwriteErr.code === 401) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      } else {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    setIsLoading(true);
    try {
      await account.deleteSession("current");
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } catch (err) {
      // Don't need to show an error on logout fail
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, profile, isAdmin, isLoading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
