'use client';

import { useState, useEffect } from 'react';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export const useCollection = <T extends Models.Document>(collectionId: string | null, queries: string[] = []) => {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const queriesString = JSON.stringify(queries);

  useEffect(() => {
    if (!collectionId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const refetch = async () => {
        try {
            const parsedQueries = JSON.parse(queriesString) as string[];
            const result = await databases.listDocuments<T>(
                appwriteConfig.databaseId,
                collectionId,
                parsedQueries
            );
            setData(result.documents);
        } catch (e) {
            console.error('Realtime refetch failed:', e);
            setError(e as Error);
        }
    };

    const initialFetchAndSubscribe = async () => {
        setIsLoading(true);
        try {
            const parsedQueries = JSON.parse(queriesString) as string[];
            const response = await databases.listDocuments<T>(
                appwriteConfig.databaseId,
                collectionId,
                parsedQueries
            );
            setData(response.documents);
        } catch (e) {
            setError(e as Error);
        } finally {
            setIsLoading(false);
        }

        unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`,
            refetch
        );
    };

    initialFetchAndSubscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [collectionId, queriesString]);

  return { data, isLoading, error };
};
