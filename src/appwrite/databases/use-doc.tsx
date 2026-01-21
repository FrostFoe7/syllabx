'use client';

import { useState, useEffect } from 'react';
import { databases, client, appwriteConfig } from '../config';
import { Models } from 'appwrite';

export const useDoc = <T extends Models.Document>(collectionId: string | null, documentId: string | null) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state and START loading immediately
    setData(null);
    setError(null);
    setIsLoading(true);

    if (!collectionId || !documentId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const result = await databases.getDocument<T>(
          appwriteConfig.databaseId,
          collectionId,
          documentId
        );
        setData(result);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents.${documentId}`,
      (response) => {
        if (response.events.includes(`databases.*.collections.*.documents.*.update`)) {
          setData(response.payload as T);
        }
        if (response.events.includes(`databases.*.collections.*.documents.*.delete`)) {
          setData(null);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionId, documentId]);

  return { data, isLoading, error };
};
