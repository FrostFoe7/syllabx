import type {Metadata} from 'next';
import './globals.css';
import { AppwriteClientProvider } from '@/appwrite/client-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'সিলেবাসের বাইরে | Make Education Simple',
  description: 'সহজ ব্যাখ্যা আর আধুনিক টেকনিকের মাধ্যমে আমরা তোমার সিলেবাসের ভয় দূর করবো ইনশাআল্লাহ্‌।',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppwriteClientProvider>
          {children}
          <Toaster />
        </AppwriteClientProvider>
      </body>
    </html>
  );
}
