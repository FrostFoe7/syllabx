'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserRound, BookOpen, Calendar, Info, Send, Menu, BookCopy, Home as HomeIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useGlobalData } from '@/appwrite';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Category, Course } from '@/types';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';

const heroData = {
  title: 'তোমার <span class="text-accent">সেরা প্রস্তুতির</span> শুরু হোক এখানে থেকেই',
  subtitle: 'সহজ ব্যাখ্যা আর আধুনিক টেকনিকের মাধ্যমে আমরা তোমার সিলেবাসের ভয় দূর করবো ইনশাআল্লাহ্‌।'
};

const actionButtonsData = [
  { url: "#courses-section", title: "কোর্স", icon: BookOpen },
  { url: "/calendar", title: "ক্যালেন্ডার", icon: Calendar },
  { url: "#courses-section", title: "প্রশ্নব্যাংক", icon: BookCopy },
];

export default function Home() {
  const [showMenu, setShowMenu] = useState(false);
  const { user, isAdmin } = useUser();
  const { categories, courses: allCoursesData, isLoading: globalLoading } = useGlobalData();
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const router = useRouter();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const currentTab = activeTab || (categories && categories.length > 0 ? categories[0].slug : null);

  const navLinks = [
    { href: '/', text: 'হোম', icon: HomeIcon },
    { href: '/#courses-section', text: 'কোর্সসমূহ', icon: BookOpen },
    { href: '/calendar', text: 'ক্যালেন্ডার', icon: Calendar },
    { href: '/about', text: 'আমাদের সম্পর্কে', icon: Info },
    ...(user ? (isAdmin ? [{ href: '/admin/dashboard', text: 'অ্যাডমিন প্যানেল', icon: UserRound }] : [{ href: '/dashboard', text: 'ড্যাশবোর্ড', icon: UserRound }]) : []),
  ];

  const executeRedirect = (course: Course) => {
    const encodedCourseName = encodeURIComponent(course.title || '');
    if (user) {
        router.push(`/dashboard?course=${encodedCourseName}`);
    } else {
        router.push(`/login?course=${encodedCourseName}`);
    }
  };
  
  return (
    <div className="bg-background text-foreground">
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

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-yellow-50 to-background">
          <div className="container mx-auto px-6 pt-16 pb-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-6xl font-black mb-6 leading-tight font-tiro-bangla" dangerouslySetInnerHTML={{ __html: heroData.title }}>
                </h1>
                <p className="text-xl mb-10 text-gray-600 leading-relaxed font-tiro-bangla">{heroData.subtitle}</p>
                <div className="flex justify-center md:justify-start gap-2">
                  {actionButtonsData.map(button => (
                      <a key={button.title} href={button.url} className="bg-white rounded-lg flex items-center justify-center no-underline shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                              <button.icon size={18} className="text-accent" />
                              <span className="text-sm font-bold text-gray-800 font-tiro-bangla">{button.title}</span>
                          </div>
                      </a>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex justify-center items-center">
                <Image 
                  src="https://picsum.photos/seed/online-class/600/600"
                  width={600}
                  height={600}
                  alt="Online Learning"
                  className="rounded-full shadow-2xl"
                  data-ai-hint="online learning student"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section id="courses-section" className="pt-8 pb-20 px-[8%] text-center">
            {globalLoading ? (
                <div className="flex justify-center gap-4 mb-10">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            ) : (
                <div className="bg-gray-200 p-2 rounded-xl inline-flex mb-10">
                    {categories?.map((tab: Category) => (
                        <button key={tab.slug} onClick={() => setActiveTab(tab.slug)} className={cn("px-6 py-2 border-none bg-transparent cursor-pointer text-base font-semibold rounded-lg text-gray-600 transition-all font-montserrat", currentTab === tab.slug && "bg-white text-accent shadow-md")}>
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}

            {globalLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-[450px] w-full rounded-2xl" />
                    <Skeleton className="h-[450px] w-full rounded-2xl" />
                    <Skeleton className="h-[450px] w-full rounded-2xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allCoursesData?.filter((c: Course) => !c.disabled && c.categoryId === currentTab).map((course: Course) => (
                        <div key={course.slug} className="flex flex-col bg-white rounded-2xl overflow-hidden text-left shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
                            <div className="relative">
                                <Image src={course.image} alt={course.title} width={400} height={225} className="w-full h-auto object-cover" data-ai-hint={course.imageHint} />
                                <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] font-bold uppercase px-2 py-1 rounded">ভর্তি চলছে...</div>
                                <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-bold uppercase px-2 py-1 rounded">{course.categoryId}</div>
                            </div>
                            
                            <div className="p-5 flex flex-col flex-grow">
                                <h3 className="text-lg font-bold font-tiro-bangla mb-1">{course.title}</h3>
                                <p className="text-sm text-gray-600 font-tiro-bangla mb-4 h-10 line-clamp-2">{course.description}</p>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                                    {(course.features || []).slice(0, 4).map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                            <span className="text-xs text-gray-700 font-tiro-bangla">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto">
                                  <Separator className="my-4" />
                                  
                                  <div className="flex justify-between items-center">
                                      <p className="text-xl font-black text-green-600">{course.price}</p>
                                      <div className="flex items-center gap-2">
                                          <Link href={`/courses/${course.slug}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'font-tiro-bangla')}>
                                          বিস্তারিত
                                          </Link>
                                          <button
                                              onClick={() => executeRedirect(course)}
                                              disabled={course.disabled}
                                              className={cn(buttonVariants({ size: 'sm' }), 'bg-primary hover:bg-yellow-400 text-black font-montserrat font-bold')}
                                          >
                                              Enroll Now
                                          </button>
                                      </div>
                                  </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Logo and Description */}
            <div className="space-y-4">
              <Link href="/">
                <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="Footer Logo" width={200} height={200} quality={100} />
              </Link>
              <p className="text-gray-600 font-tiro-bangla text-sm max-w-xs">
                {heroData.subtitle}
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h3 className="font-bold text-base font-montserrat mb-4">গুরুত্বপূর্ণ লিংক</h3>
              <ul className="space-y-3">
                <li><Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><HomeIcon size={16} /><span>হোম</span></Link></li>
                <li><Link href="/#courses-section" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><BookOpen size={16} /><span>কোর্সসমূহ</span></Link></li>
                <li><Link href="/about" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><Info size={16} /><span>আমাদের সম্পর্কে</span></Link></li>
                <li><Link href="/calendar" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-tiro-bangla text-sm"><Calendar size={16} /><span>ক্যালেন্ডার</span></Link></li>
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
              &copy; {year} SYLLABUSER BAIRE. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
