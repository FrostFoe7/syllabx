"use client";

import { createContext, useContext, ReactNode } from "react";
import { client, account, databases, storage, appwriteConfig } from "./config";
import { Client, Account, Databases, Storage } from 'appwrite';

interface AppwriteContextValue {
  client: Client;
  account: Account;
  databases: Databases;
  storage: Storage;
  config: typeof appwriteConfig;
}

const AppwriteContext = createContext<AppwriteContextValue | null>(null);

export const AppwriteProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AppwriteContext.Provider value={{ client, account, databases, storage, config: appwriteConfig }}>
        {children}
    </AppwriteContext.Provider>
  );
};

export const useAppwrite = () => {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error("useAppwrite must be used within an AppwriteProvider.");
  }
  return context;
};

export const useAccount = () => useAppwrite().account;
export const useDatabases = () => useAppwrite().databases;
export const useStorage = () => useAppwrite().storage;
