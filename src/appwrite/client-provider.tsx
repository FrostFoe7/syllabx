"use client";

import { AppwriteProvider } from "./provider";
import { UserProvider } from "./auth/use-user";
import { GlobalDataProvider } from "./data-provider";

export function AppwriteClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppwriteProvider>
      <UserProvider>
        <GlobalDataProvider>
          {children}
        </GlobalDataProvider>
      </UserProvider>
    </AppwriteProvider>
  );
}
