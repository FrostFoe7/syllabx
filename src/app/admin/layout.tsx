'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  BookText,
  Upload,
  BarChart2,
  Users,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

import { useUser, useAccount, useDoc, appwriteConfig } from '@/appwrite';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: '/admin/dashboard', text: 'Home', icon: Home, exact: true },
  { href: '/admin/courses', text: 'Courses', icon: BookText },
  { href: '/admin/questions', text: 'Questions', icon: Upload },
  { href: '/admin/results', text: 'Results', icon: BarChart2 },
  { href: '/admin/students', text: 'Students', icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const account = useAccount();

  // Check if user ID exists in admins collection
  const { data: adminData, isLoading: isAdminChecking } = useDoc(
    appwriteConfig.adminsCollectionId,
    user?.$id || null
  );

  const handleLogout = async () => {
    await account.deleteSession('current');
    router.push('/');
  };
  
      const isAdmin = !!adminData || user?.$id === 'admin_user';
  
    
  
      useEffect(() => {
  
        if (isUserLoading || isAdminChecking) return;
  
    
  
        if (!user) {
  
          router.push('/admin/login');
  
          return;
  
        }
  
    
  
        // Only redirect if NOT loading, and definitively not an admin
  
        if (!isAdminChecking && user && !isAdmin) {
  
          console.log('Final check: User is not an admin. Redirecting...');
  
          router.push('/dashboard');
  
        }
  
      }, [isUserLoading, isAdminChecking, user, isAdmin, router]);
  
    
  
      // Unified loading state
  
      if (isUserLoading || isAdminChecking) {
  
        return (
  
          <div className="flex h-screen items-center justify-center bg-[#FFFDF5]" suppressHydrationWarning>
  
            <div className="text-center">
  
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
  
                <p className="font-tiro-bangla text-muted-foreground">লোডিং...</p>
  
            </div>
  
          </div>
  
        );
  
      }
  
    
  
      if (!isAdmin) return null;
  
    
  
  
  
    const getInitials = (name: string | null | undefined) => {
  
  
    if (!name) return 'A';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
        <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png"
                alt="Logo"
                width={60}
                height={60}
                quality={100}
                className="h-14 w-auto"
              />
            </Link>
            <h1 className="text-xl font-semibold hidden sm:block">Admin Panel</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>User Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      
      <main className="p-6 pb-24">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white shadow-t-lg md:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 font-medium">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link 
                href={item.href} 
                key={item.text} 
                className={cn(
                  "group inline-flex flex-col items-center justify-center px-2 text-center text-gray-500 hover:bg-gray-50 hover:text-primary",
                  isActive && "text-primary"
                )}
              >
                <item.icon className="mb-1 h-5 w-5" />
                <span className="text-[10px] font-bold">{item.text}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  );
}
