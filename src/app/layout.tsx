import type { Metadata } from "next";
import { Tiro_Bangla } from "next/font/google";
import "./globals.css";
import { AppwriteProvider } from "@/appwrite/provider";
import QueryProvider from "@/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";

const tiroBangla = Tiro_Bangla({
  weight: '400',
  subsets: ['bengali'],
  variable: '--font-tiro-bangla',
});

export const metadata: Metadata = {
  title: "Syllabuser Baire",
  description: "An educational platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${tiroBangla.variable} font-tiro-bangla antialiased`}>
        <QueryProvider>
          <AppwriteProvider>
            {children}
            <Toaster />
          </AppwriteProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
