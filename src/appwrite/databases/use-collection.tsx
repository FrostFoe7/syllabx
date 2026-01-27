'use client';

import { useState, useEffect, useCallback } from 'react';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export const useCollection = <T extends Models.Document>(collectionId: string | null, queries: string[] = []) => {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const queriesString = JSON.stringify(queries);

  const fetchData = useCallback(async (setLoading: boolean = false) => {
      if (!collectionId) {
          setData(null);
          if (setLoading) setIsLoading(false);
          return;
      }
      
      if (setLoading) {
          setIsLoading(true);
      }

      try {
        const parsedQueries = JSON.parse(queriesString) as string[];
        const result = await databases.listDocuments<T>(
          appwriteConfig.databaseId,
          collectionId,
          parsedQueries
        );
        setData(result.documents);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        if (setLoading) {
            setIsLoading(false);
        }
      }
  }, [collectionId, queriesString]);


  useEffect(() => {
    fetchData(true); // Initial fetch with loading state

    if (!collectionId) {
      return;
    }

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`,
      () => {
        // Re-fetch on any change in collection without setting loading state
        fetchData(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionId, fetchData]);

  return { data, isLoading, error };
};
