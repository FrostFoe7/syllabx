
'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAccount, useDatabases, appwriteConfig, useUser } from '@/appwrite';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  phone: z.string().regex(/^01\d{9}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর প্রদান করুন (যেমন: 017xxxxxxxx)'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'),
});

type FormValues = z.infer<typeof formSchema>;

function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const { refreshUser } = useUser();
  const account = useAccount();
  const databases = useDatabases();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: '', password: '' }
  });

  const handleAuth: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const { phone, password } = data;
    const cleanPhone = phone.trim();
    const virtualEmail = `user_${cleanPhone}@syllabx.com`;

    try {
      // Handle Login
      await account.createEmailPasswordSession(virtualEmail, password);
      await refreshUser(); // Update global state
      
      // Check if this user is an admin
      try {
        const user = await account.get();
        const adminDoc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.adminsCollectionId,
            user.$id
        );
        
        if (adminDoc) {
            toast({ title: 'অ্যাডমিন হিসেবে সফলভাবে লগইন হয়েছে' });
            router.push('/admin/dashboard');
            return;
        }
      } catch {
          // Not an admin
          await account.deleteSession('current');
          toast({
            variant: 'destructive',
            title: 'প্রবেশাধিকার নেই',
            description: 'আপনি এই প্যানেলে প্রবেশের অধিকারী নন।',
          });
      }

    } catch (error) {
      const appwriteErr = error as { code?: number; message?: string };
      console.error(error);
      const errorMessage = appwriteErr.code === 401
        ? 'ভুল ফোন নম্বর অথবা পাসওয়ার্ড।'
        : 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#FFFDF5] p-5">
      <div className="bg-white w-full max-w-md p-10 rounded-3xl shadow-lg text-center relative border-t-4 border-black">
        <div className="mb-6">
          <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="সিলেবাসের বাইরে" width={100} height={100} className="mx-auto" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6 text-black" />
            <h2 className="font-extrabold text-2xl text-black">অ্যাডমিন লগইন</h2>
        </div>
        
        <p className="text-gray-500 mb-8 font-tiro-bangla">শুধুমাত্র অনুমোদিত অ্যাডমিনদের জন্য</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="text-left">
                  <FormLabel className="block mb-2 font-semibold text-gray-600">ফোন নম্বর</FormLabel>
                  <FormControl>
                    <Input 
                      className="w-full p-3 border-2 border-gray-200 rounded-lg outline-none focus:border-black" 
                      placeholder="01XXXXXXXXX" 
                      {...field} />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="text-left">
                  <FormLabel className="block mb-2 font-semibold text-gray-600">পাসওয়ার্ড</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      className="w-full p-3 border-2 border-gray-200 rounded-lg outline-none focus:border-black" 
                      placeholder="••••••••" 
                      {...field} />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs mt-1" />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full p-4 h-auto bg-black text-white rounded-lg font-bold text-base uppercase transition hover:bg-gray-800 disabled:bg-gray-400">
              {isLoading ? 'লোড হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>
        </Form>

        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-gray-500 hover:text-black">
          <ArrowLeft className="h-4 w-4" /> 
          হোম পেজে ফিরে যান
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminLoginForm />
        </Suspense>
    );
}
