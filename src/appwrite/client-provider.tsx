"use client";

import { AppwriteProvider } from "./provider";

export function AppwriteClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppwriteProvider>
      {children}
    </AppwriteProvider>
  );
}
