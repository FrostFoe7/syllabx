"use client";

import { AppwriteProvider } from "./provider";
import { UserProvider } from "./auth/use-user";

export function AppwriteClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppwriteProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </AppwriteProvider>
  );
}
