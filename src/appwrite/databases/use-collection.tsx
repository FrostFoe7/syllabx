'use client';

import { useState, useEffect } from 'react';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export const useCollection = <T extends Models.Document>(collectionId: string | null, queries: string[] = []) => {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await databases.listDocuments<T>(
          appwriteConfig.databaseId,
          collectionId,
          queries
        );
        setData(result.documents);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`,
      () => {
        // Simple implementation: re-fetch on any change in collection
        // For better performance, we could manually update the 'data' state based on payload
        fetchData();
      }
    );

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, queries.join(',')]);

  return { data, isLoading, error };
};
