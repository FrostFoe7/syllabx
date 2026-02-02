'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { Models } from 'appwrite';
import { account, databases, appwriteConfig } from '../config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

// Define the User Profile interface matching your DB schema
export interface UserProfile extends Models.Document {
    userId: string;
    name: string;
    phone?: string;
    email?: string;
    enrolledCourses?: string[];
}

interface UserContextType {
    currentAccount: Models.User<Models.Preferences> | null;
    user: UserProfile | null;
    profile: UserProfile | null;
    isAdmin: boolean;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    currentAccount: null,
    user: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
    refreshUser: async () => {},
    logout: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const queryClient = useQueryClient();
    const router = useRouter();

    // 1. Fetch Account
    const {
        data: currentAccount,
        isLoading: isAccountLoading,
    } = useQuery({
        queryKey: ['account'],
        queryFn: async () => {
            try {
                return await account.get();
            } catch {
                return null;
            }
        },
        retry: false,
    });

    // 2. Fetch User Profile (Dependent on Account)
    const {
        data: userProfile,
        isLoading: isProfileLoading
    } = useQuery({
        queryKey: ['userProfile', currentAccount?.$id],
        queryFn: async () => {
            if (!currentAccount) return null;
            try {
                return await databases.getDocument<UserProfile>(
                    appwriteConfig.databaseId,
                    appwriteConfig.usersCollectionId,
                    currentAccount.$id
                );
            } catch {
                console.warn("User profile not found in DB, though Account exists.");
                return null;
            }
        },
        enabled: !!currentAccount,
        retry: false,
    });

    // 3. Check Admin Status (Dependent on Account)
    const {
        data: isAdmin,
        isLoading: isAdminLoading
    } = useQuery({
        queryKey: ['isAdmin', currentAccount?.$id],
        queryFn: async () => {
            if (!currentAccount) return false;
            try {
                await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.adminsCollectionId,
                    currentAccount.$id
                );
                return true;
            } catch {
                return false;
            }
        },
        enabled: !!currentAccount,
        retry: false,
    });

    const refreshUser = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['account'] });
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        await queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
    }, [queryClient]);

    const logout = useCallback(async () => {
        await account.deleteSession('current');
        queryClient.setQueryData(['account'], null);
        queryClient.setQueryData(['userProfile'], null);
        queryClient.setQueryData(['isAdmin'], false);
        router.push('/login');
    }, [queryClient, router]);

    const isLoading = isAccountLoading || (!!currentAccount && isProfileLoading) || (!!currentAccount && isAdminLoading);

    const value = useMemo(() => ({
        currentAccount: currentAccount || null,
        user: userProfile || null,
        profile: userProfile || null,
        isAdmin: !!isAdmin,
        isLoading,
        refreshUser,
        logout
    }), [currentAccount, userProfile, isAdmin, isLoading, refreshUser, logout]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);

