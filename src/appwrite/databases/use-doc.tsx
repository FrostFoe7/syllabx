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

    let unsubscribe: (() => void) | undefined;

    const fetchDataAndSubscribe = async () => {
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
          if ((err as { code?: number })?.code !== 404) {
            setError(err as Error);
          }
          setData(null); // Document not found
        } finally {
          setIsLoading(false);
        }

        // Subscribe to changes for this specific document
        unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents.${documentId}`,
            (response) => {
                if (response.events.some(e => e.endsWith('.delete'))) {
                    setData(null);
                } else {
                    setData(response.payload as T);
                }
            }
        );
    };

    fetchDataAndSubscribe();

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [collectionId, documentId]);

  return { data, isLoading, error };
};
