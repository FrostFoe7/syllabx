'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export function useCollection<T extends Models.Document>(
    collectionId: string | null, 
    queries: string[] = []
) {
    const queryClient = useQueryClient();
    // We use a query key that depends on collectionId and queries
    const queryKey = useMemo(() => ['collection', collectionId, ...queries], [collectionId, queries]);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!collectionId) return null;
            const response = await databases.listDocuments<T>(
                appwriteConfig.databaseId,
                collectionId,
                queries
            );
            return response;
        },
        enabled: !!collectionId, // Only run if collectionId is provided
    });

    useEffect(() => {
        if (!collectionId) return;

        const unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`,
            (response) => {
                const event = response.events[0];
                const payload = response.payload as T;

                queryClient.setQueryData<Models.DocumentList<T>>(queryKey, (oldData) => {
                    const currentDocs = oldData?.documents || [];
                    const currentTotal = oldData?.total || 0;

                    if (event.includes('.create')) {
                        if (currentDocs.some(d => d.$id === payload.$id)) return oldData;
                        return { total: currentTotal + 1, documents: [payload, ...currentDocs] };
                    }

                    if (event.includes('.update')) {
                        return {
                            ...oldData,
                            documents: currentDocs.map((doc) => doc.$id === payload.$id ? payload : doc),
                            total: currentTotal // Total doesn't change on update
                        } as Models.DocumentList<T>;
                    }

                    if (event.includes('.delete')) {
                        return {
                            total: Math.max(0, currentTotal - 1),
                            documents: currentDocs.filter((doc) => doc.$id !== payload.$id)
                        };
                    }

                    return oldData;
                });
            }
        );

        return () => {
            unsubscribe();
        };
    }, [collectionId, queryClient, queryKey]);

    return { 
        data: data?.documents || [],   // Return empty array if no data
        total: data?.total || 0,       // New total field
        fullResponse: data,            // Access to full response
        isLoading, 
        isError: !!isError, 
        error,                         // Expose error
        mutate: refetch 
    };
}
