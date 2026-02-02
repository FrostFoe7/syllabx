'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export function useDoc<T extends Models.Document>(collectionId: string, documentId: string) {
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => ['document', collectionId, documentId], [collectionId, documentId]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!documentId || !collectionId) return null;
            return await databases.getDocument<T>(
                appwriteConfig.databaseId,
                collectionId,
                documentId
            );
        },
        enabled: !!documentId && !!collectionId,
    });

    useEffect(() => {
        if (!documentId || !collectionId) return;

        const unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents.${documentId}`,
            (response) => {
                const event = response.events[0];
                const payload = response.payload as T;

                queryClient.setQueryData<T | null>(queryKey, (oldData) => {
                    if (event.includes('.update')) {
                        return payload;
                    }
                    if (event.includes('.delete')) {
                        return null; // or undefined
                    }
                    return oldData;
                });
            }
        );

        return () => {
            unsubscribe();
        };
    }, [collectionId, documentId, queryClient, queryKey]);

    return { 
        data: data || null, 
        isLoading, 
        isError: !!isError, 
        mutate: refetch 
    };
}
