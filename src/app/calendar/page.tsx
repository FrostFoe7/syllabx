'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserRound, Menu, Send, Lock, Home as HomeIcon, BookOpen, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useUser, useCollection, appwriteConfig } from '@/appwrite';
import { Models } from 'appwrite';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { bn } from 'date-fns/locale';

function TimeRemaining({ dateTime }: { dateTime: string | null }) {
    const [timeLeft, setTimeLeft] = useState<string>(() => {
        if (!dateTime) return 'সময় নির্ধারিত হয়নি';
        const targetDate = new Date(dateTime);
        if (isAfter(new Date(), targetDate)) return 'পরীক্ষা শেষ';
        return formatDistanceToNow(targetDate, { locale: bn, addSuffix: true });
    });

    useEffect(() => {
        if (!dateTime) return;

        const targetDate = new Date(dateTime);
            const update = () => {
              try {
                if (isAfter(new Date(), targetDate)) {
                    setTimeLeft('পরীক্ষা শেষ');
                } else {
                    setTimeLeft(formatDistanceToNow(targetDate, { locale: bn, addSuffix: true }));
                }
              } catch (error) {
                  const err = error as { message?: string };
                  console.error('Timer update error:', err.message);
              }
            };
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [dateTime]);

    return <span>{timeLeft}</span>;
}

interface CalendarItem extends Models.Document {
    date: string;
    topic: string;
    subject?: string;
    time?: string;
    examDateTime?: string | null;
}



export default function CalendarPage() {

  const [showMenu, setShowMenu] = useState(false);

  const { user, isAdmin } = useUser();

  const { data: calendar, isLoading } = useCollection<CalendarItem>(appwriteConfig.calendarCollectionId);



  const navLinks = [

    { href: '/', text: 'হোম', icon: HomeIcon },

    { href: '/#courses-section', text: 'কোর্সসমূহ', icon: BookOpen },

    { href: '/calendar', text: 'ক্যালেন্ডার', icon: CalendarIcon },

    { href: '/about', text: 'আমাদের সম্পর্কে', icon: Info },

    ...(user ? (isAdmin ? [{ href: '/admin/dashboard', text: 'অ্যাডমিন প্যানেল', icon: UserRound }] : [{ href: '/dashboard', text: 'ড্যাশবোর্ড', icon: UserRound }]) : []),

  ];



  const heroData = {

    subtitle: 'সহজ ব্যাখ্যা আর আধুনিক টেকনিকের মাধ্যমে আমরা তোমার সিলেবাসের ভয় দূর করবো ইন้าআল্লাহ্‌।'

  };



  return (

    <div className="bg-[#FFFDF5] text-foreground antialiased">

      {/* Header */}

      <header className="bg-white/95 px-2 lg:px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">

        <Link href="/">

          <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="Logo" width={56} height={56} quality={100} className="h-14 w-auto" />

        </Link>

        

        <div className="flex items-center gap-4">

          {!user ? (

            <Link href="/login" className="no-underline bg-black text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 uppercase hover:bg-gray-800 transition-all shadow-md">

                <UserRound size={16} className='bg-white text-black rounded-full p-0.5' />

                <span className="font-montserrat">Login</span>

            </Link>

          ) : isAdmin ? (

            <Link href="/admin/dashboard" className="no-underline bg-accent text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 uppercase hover:opacity-90 transition-all shadow-md">

                <UserRound size={16} className='bg-white text-black rounded-full p-0.5' />

                <span className="font-montserrat">Admin Panel</span>

            </Link>

          ) : (

            <Link href="/dashboard" className="no-underline bg-black text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 uppercase hover:bg-gray-800 transition-all shadow-md">

                <UserRound size={16} className='bg-white text-black rounded-full p-0.5' />

                <span className="font-montserrat">Dashboard</span>

            </Link>

          )}

          

          <button onClick={() => setShowMenu(true)} className="md:hidden p-2 rounded-md hover:bg-gray-100">

            <Menu className="h-6 w-6" />

          </button>

        </div>
        <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetContent side="left" className="p-0 w-[280px] bg-[#FFFDF5] border-r-yellow-200">
                <SheetHeader className="p-4 border-b border-b-yellow-200">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">A list of links to navigate the site.</SheetDescription>
                    <Link href="/" onClick={() => setShowMenu(false)}>
                        <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="Logo" width={150} height={36} quality={100} className="h-9 w-auto" />
                    </Link>
                </SheetHeader>
                <nav className="flex flex-col p-4 space-y-1">
                    {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-gray-700 transition-all hover:bg-yellow-100/50 hover:text-primary font-tiro-bangla text-base"
                    >
                        <link.icon className="h-5 w-5 text-accent" />
                        <span>{link.text}</span>
                    </Link>
                    ))}
                </nav>
            </SheetContent>
        </Sheet>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight font-tiro-bangla">
                <span className="font-montserrat">HSC</span> পরীক্ষার <span className="text-accent">সময়সূচি</span>
            </h1>
            <p className="text-lg text-gray-600 font-tiro-bangla">
                আপনার পরীক্ষার প্রস্তুতির জন্য কাউন্টডাউন শুরু।
            </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-yellow-100">
            <Table>
                <TableHeader className="bg-yellow-50/50">
                    <TableRow className="border-b border-yellow-200">
                        <TableHead className="w-[40%] py-4 px-6 font-tiro-bangla text-base text-accent">বিষয়</TableHead>
                        <TableHead className="w-[30%] py-4 px-6 font-tiro-bangla text-base text-accent">তারিখ ও সময়</TableHead>
                        <TableHead className="w-[30%] py-4 px-6 text-right font-tiro-bangla text-base text-accent">সময় বাকি</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                         Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            </TableRow>
                         ))
                     ) : calendar && calendar.length > 0 ? (
                         calendar.map((item) => (
                            <TableRow key={item.$id}>
                                <TableCell className="py-4 px-6 font-tiro-bangla font-bold">{item.subject || item.topic}</TableCell>
                                <TableCell className="py-4 px-6 font-tiro-bangla">
                                    <div className="flex flex-col">
                                        <span>{item.date}</span>
                                        <span className="text-xs text-gray-500">{item.time}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right font-tiro-bangla text-gray-600">
                                    <TimeRemaining dateTime={item.examDateTime || null} />
                                </TableCell>
                            </TableRow>
                         ))
                     ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="py-16 text-center">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <Lock className="w-12 h-12 text-gray-300" />
                                    <h3 className="text-lg font-bold font-tiro-bangla text-gray-500">রুটিন এখনো প্রকাশিত হয়নি</h3>
                                    <p className="text-muted-foreground font-tiro-bangla">বোর্ড থেকে চূড়ান্ত রুটিন প্রকাশিত হওয়ার সাথে সাথেই এখানে ক্যালেন্ডার আপডেট করা হবে।</p>
                                </div>
                            </TableCell>
                        </TableRow>
                     )}
                </TableBody>
            </Table>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Link href="/">
                <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="Footer Logo" width={200} height={200} quality={100} />
              </Link>
              <p className="text-gray-600 font-tiro-bangla text-sm max-w-xs">
                {heroData.subtitle}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-base font-montserrat mb-4">গুরুত্বপূর্ণ লিংক</h3>
              <ul className="space-y-3">
                <li><Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><HomeIcon size={16} /><span>হোম</span></Link></li>
                <li><Link href="/#courses-section" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><BookOpen size={16} /><span>কোর্সসমূহ</span></Link></li>
                <li><Link href="/about" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><Info size={16} /><span>আমাদের সম্পর্কে</span></Link></li>
                <li><Link href="/calendar" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><CalendarIcon size={16} /><span>ক্যালেন্ডার</span></Link></li>
                 <li>
                  <a href="https://t.me/syllabuserbaire" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors text-sm">
                    <Send size={16} />
                    <span className="font-tiro-bangla">টেলিগ্রাম চ্যানেল</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t text-center">
            <p className="text-sm text-gray-500 font-montserrat">
              &copy; {new Date().getFullYear()} SYLLABUSER BAIRE. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

    

