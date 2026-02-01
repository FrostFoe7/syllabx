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

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!collectionId) return [];
            const response = await databases.listDocuments<T>(
                appwriteConfig.databaseId,
                collectionId,
                queries
            );
            return response.documents;
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

                queryClient.setQueryData<T[]>(queryKey, (oldData) => {
                    const currentData = oldData || [];

                    if (event.includes('.create')) {
                        // Check uniqueness just in case
                        if (currentData.some(d => d.$id === payload.$id)) return currentData;
                        return [payload, ...currentData];
                    }

                    if (event.includes('.update')) {
                        return currentData.map((doc) => 
                            doc.$id === payload.$id ? payload : doc
                        );
                    }

                    if (event.includes('.delete')) {
                        return currentData.filter((doc) => doc.$id !== payload.$id);
                    }

                    return currentData;
                });
            }
        );

        return () => {
            unsubscribe();
        };
    }, [collectionId, queryClient, queryKey]);

    return { 
        data: data || null, 
        isLoading, 
        isError: !!isError, 
        mutate: refetch // Alias refetch as mutate to match previous API
    };
}
