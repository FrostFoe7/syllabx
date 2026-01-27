'use client';

import { useState, useEffect } from 'react';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export const useDoc = <T extends Models.Document>(collectionId: string | null, documentId: string | null) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionId || !documentId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await databases.getDocument<T>(
          appwriteConfig.databaseId,
          collectionId,
          documentId
        );
        setData(result);
        setError(null);
      } catch (err) {
        // Don't treat "not found" as a hard error
        if ((err as { code?: number })?.code !== 404) {
          setError(err as Error);
        }
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents.${documentId}`,
      () => {
        // A document was updated or deleted, refetch the data to be safe
        fetchData();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionId, documentId]);

  return { data, isLoading, error };
};
