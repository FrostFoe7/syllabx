"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { account, databases, appwriteConfig } from "../config";
import { Models } from "appwrite";

interface UserContextType {
  user: Models.User<Models.Preferences> | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      
      // Also check admin status globally
      try {
        const adminDoc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.adminsCollectionId,
            currentUser.$id
        );
        setIsAdmin(!!adminDoc);
      } catch {
        setIsAdmin(false);
      }
      
      setError(null);
    } catch (err) {
      const appwriteErr = err as { code?: number; message?: string };
      if (appwriteErr.code === 401) {
        setUser(null);
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
      setIsAdmin(false);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, isAdmin, isLoading, error, refreshUser, logout }}>
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