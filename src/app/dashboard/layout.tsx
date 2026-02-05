'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ClipboardList,
  BarChart3,
  User as UserIcon,
  LogOut,
} from 'lucide-react';

import { useUser } from '@/appwrite';
import { cn } from '@/lib/utils';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { href: '/dashboard', text: 'কোর্স সমূহ', icon: LayoutGrid },
  { href: '/dashboard/exams', text: 'পরীক্ষা', icon: ClipboardList },
  { href: '/dashboard/results', text: 'রেজাল্ট', icon: BarChart3 },
  { href: '/dashboard/profile', text: 'প্রোফাইল', icon: UserIcon },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !mounted) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (isAdmin) {
        router.push('/admin/dashboard');
    }
  }, [isLoading, user, isAdmin, router, mounted]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };


  if (!mounted || isLoading || !user || isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFFDF5]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="font-tiro-bangla text-muted-foreground">লোডিং...</p>
        </div>
      </div>
    );
  }
  
  const isBengali = (text: string | null | undefined): boolean => {
    if (!text) return false;
    // Bengali Unicode range U+0980 to U+09FF
    const bengaliRegex = /[\u0980-\u09FF]/;
    return bengaliRegex.test(text);
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className="p-4 flex justify-center">
             <Link href="/">
              <Image
                src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png"
                alt="Logo"
                width={120}
                height={120}
                quality={100}
                className="h-12 w-auto"
              />
            </Link>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.text}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.text}>
                      <Link href={item.href}>
                        <item.icon />
                        <span className="font-tiro-bangla">{item.text}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             <SidebarMenuItem>
               <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
                 <LogOut />
                 <span>Log out</span>
               </SidebarMenuButton>
             </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[#FFFDF5]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
          <Link href="/" className="md:hidden">
            <Image
              src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png"
              alt="Logo"
              width={150}
              height={150}
              quality={100}
              className="h-14 w-auto"
            />
          </Link>
          {/* Spacer for desktop to keep user name on right */}
          <div className="hidden md:block"></div> 

          {user && (
            <div className="flex items-center gap-2 text-gray-800">
                <span className={cn(
                  "font-semibold",
                  isBengali(user.name) ? 'font-tiro-bangla' : 'font-montserrat'
                )}>
                    {user.name}
                </span>
            </div>
          )}
        </header>
        
        <main className="p-6 pb-24 md:pb-6">{children}</main>

        {/* Bottom Navigation Bar - Mobile Only */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white shadow-t-lg md:hidden">
          <div className="mx-auto grid h-16 max-w-lg grid-cols-4 font-medium">
            {navItems.map((item) => (
              <Link 
                href={item.href} 
                key={item.text} 
                className={cn(
                  "group inline-flex flex-col items-center justify-center px-5 text-gray-500 hover:bg-gray-50 hover:text-primary",
                  pathname === item.href && "text-primary"
                )}
              >
                <item.icon className="mb-1 h-6 w-6" />
                <span className="text-xs font-bold font-tiro-bangla">{item.text}</span>
              </Link>
            ))}
          </div>
        </nav>
      </SidebarInset>
    </SidebarProvider>
  );
}

    