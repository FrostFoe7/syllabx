"use client";

import { useEffect, useState } from "react";
import { account } from "../config";
import { Models } from "appwrite";

export const useUser = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (err: any) {
        // Appwrite throws 401 if not logged in
        if (err.code === 401) {
          setUser(null);
        } else {
          setError(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  return { user, isLoading, error };
};
