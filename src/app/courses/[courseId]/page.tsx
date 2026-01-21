'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { allCourses } from '@/lib/courses';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Calendar, UserRound, Info, Send, Menu, Printer, Home as HomeIcon, BookOpen } from 'lucide-react';
import { useUser } from '@/appwrite';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const course = allCourses.find(c => c.id === courseId);

  // Header and menu state
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useUser();

  const navLinks = [
    { href: '/', text: 'হোম', icon: HomeIcon },
    { href: '/#courses-section', text: 'কোর্সসমূহ', icon: BookOpen },
    { href: '/calendar', text: 'ক্যালেন্ডার', icon: Calendar },
    { href: '/about', text: 'আমাদের সম্পর্কে', icon: Info },
  ];

  const executeRedirect = () => {
    const encodedCourseName = encodeURIComponent(course?.title || '');
    if (user) {
        router.push(`/dashboard?course=${encodedCourseName}`);
    } else {
        router.push(`/login?course=${encodedCourseName}`);
    }
  };


  const heroData = {
    subtitle: 'সহজ ব্যাখ্যা আর আধুনিক টেকনিকের মাধ্যমে আমরা তোমার সিলেবাসের ভয় দূর করবো ইনশাআল্লাহ্‌।'
  };

  const physicsRoutine = [
    { date: '১ ফেব্রুয়ারি, ২০২৬', topic: 'তাপগতিবিদ্যা' },
    { date: '৩ ফেব্রুয়ারি, ২০২৬', topic: 'স্থির তড়িৎ' },
    { date: '৫ ফেব্রুয়ারি, ২০২৬', topic: 'চল তড়িৎ' },
    { date: '৭ ফেব্রুয়ারি, ২০২৬', topic: 'তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব' },
    { date: '৯ ফেব্রুয়ারি, ২০২৬', topic: 'তড়িৎচুম্বকীয় আবেশ ও পরবর্তী প্রবাহ' },
    { date: '১১ ফেব্রুয়ারি, ২০২৬', topic: 'জ্যামিতিক ও ভৌত আলোকবিজ্ঞান' },
    { date: '১৩ ফেব্রুয়ারি, ২০২৬', topic: 'আধুনিক পদার্থবিজ্ঞানের সূচনা' },
    { date: '১৫ ফেব্রুয়ারি, ২০২৬', topic: 'পরমাণুর মডেল এবং নিউক্লিয়ার পদার্থবিজ্ঞান' },
    { date: '১৭ ফেব্রুয়ারি, ২০২৬', topic: 'সেমিকন্ডাক্টর ও ইলেকট্রনিক্স' },
    { date: '১৯ ফেব্রুয়ারি, ২০২৬', topic: 'জ্যোতির্বিজ্ঞান' },
    { date: '২১ ফেব্রুয়ারি, ২০২৬', topic: 'Physics Second Part Final Exam' }
  ];
  
  if (!course) {
    return <div className="flex justify-center items-center h-screen">Course not found</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-50 text-foreground antialiased print:bg-white">
      {/* Header */}
      <header className="bg-white/95 px-2 lg:px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm print:hidden">
        <Link href="/">
          <Image src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" alt="Logo" width={60} height={60} quality={100} className="h-14 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href={user ? '/dashboard' : '/login'} className="no-underline bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 uppercase hover:bg-gray-800 transition-all">
              <UserRound size={16} className='bg-white text-black rounded-full p-0.5'/>
              <span className="font-montserrat">{user ? 'Dashboard' : 'Account'}</span>
          </Link>
          <button onClick={() => setShowMenu(true)} className="md:hidden p-2 rounded-md hover:bg-gray-100">
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetContent side="left" className="p-0 w-[280px] bg-gray-50 border-r-yellow-200">
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
      
      <main className="container mx-auto px-6 py-12 print:p-8 print:pb-16">
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10 print:shadow-none print:border-none print:p-0">
            <div className="grid md:grid-cols-3 gap-10 items-start">
                <div className="md:col-span-1 print:hidden">
                    <Image src={course.image} alt={course.title} width={600} height={400} className="w-full h-auto object-cover rounded-2xl shadow-lg" data-ai-hint={course.imageHint} />
                </div>
                <div className="md:col-span-2 flex flex-col h-full">
                    <h1 className="text-3xl lg:text-4xl font-black font-montserrat mb-4 print:hidden">{course.title}</h1>
                    <div className="flex items-center gap-4 mb-6 print:hidden">
                        <span className={cn("text-white px-4 py-1 rounded-full text-lg font-semibold whitespace-nowrap", course.price === 'EXPIRED' ? 'bg-destructive' : 'bg-green-500')}>
                            {course.price}
                        </span>
                        {course.startDate && (
                            <div className="flex items-center text-lg text-gray-600">
                                <Calendar className="mr-2 text-accent" />
                                <span className="font-tiro-bangla">{course.startDate}</span>
                            </div>
                        )}
                    </div>
                    {course.description && <p className="text-lg leading-relaxed text-gray-700 font-tiro-bangla mb-8 print:hidden">{course.description}</p>}
                    
                    <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-6 my-6 print:hidden">
                        <h3 className="font-bold text-xl mb-4 font-tiro-bangla">কোর্সের ফিচারসমূহ</h3>
                        <div className="space-y-3">
                        {course.features.map(feature => (
                            <div key={feature} className="flex items-start">
                                <CheckCircle className="text-blue-500 mr-3 h-5 w-5 shrink-0 mt-1" />
                                <span className="font-tiro-bangla text-base text-gray-800">{feature}</span>
                            </div>
                        ))}
                        </div>
                    </div>

                    <div className="mt-auto print:hidden">
                        <button
                            onClick={executeRedirect}
                            disabled={course.disabled}
                            className={cn("inline-block bg-primary text-black px-8 py-4 rounded-lg no-underline font-bold text-lg mt-6 w-full transition-all duration-300 font-montserrat", 
                            course.disabled ? "bg-gray-400 cursor-not-allowed" : "hover:bg-yellow-500 hover:-translate-y-1 hover:shadow-lg")}>
                            Enroll Now
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Routine Section */}
            <div className="mt-16 print:mt-0">
                {/* Print-only header */}
                <div className="hidden print:block mb-6">
                    <div className="text-center">
                        <Image 
                            src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png" 
                            alt="Logo" 
                            width={120} 
                            height={120}
                            className="mx-auto"
                            quality={100} 
                        />
                        <h1 className="text-2xl font-bold mt-2 font-tiro-bangla">{course.title}</h1>
                        <h2 className="text-lg font-semibold mt-1 font-tiro-bangla">কোর্স রুটিন</h2>
                    </div>
                    <div className="flex justify-between items-center text-xs border-y py-2 my-4">
                        <a href="https://t.me/syllabuserbaire" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 no-underline">
                            <Send size={14} />
                            <span className="font-tiro-bangla font-semibold">সিলেবাসের বাইরে</span>
                        </a>
                        <div className="bg-black text-white p-2 rounded-md font-tiro-bangla text-[10px]">
                            যেকোনো প্রয়োজনে টেলিগ্রামে <a href="https://t.me/shu_yaib" target="_blank" rel="noopener noreferrer" className="font-semibold text-yellow-400 hover:underline">@shu_yaib</a> কে মেসেজ করুন
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-8 print:hidden">
                  <h2 className="text-3xl md:text-4xl font-bold font-tiro-bangla">কোর্স রুটিন</h2>
                   <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-all font-montserrat"
                    >
                        <Printer size={18} />
                        <span className="font-semibold">Print Routine</span>
                    </button>
                </div>
                
                <div>
                  {course.id === 'physics-second-part' ? (
                      <table className="w-full text-left border-collapse font-tiro-bangla">
                          <thead className="bg-yellow-100 print:bg-gray-200">
                              <tr>
                                  <th className="p-4 border-b-2 border-yellow-300 text-base font-bold text-accent print:text-black">তারিখ</th>
                                  <th className="p-4 border-b-2 border-yellow-300 text-base font-bold text-accent print:text-black">পরীক্ষার বিষয়/টপিক</th>
                                  <th className="p-4 border-b-2 border-yellow-300 text-base font-bold text-accent print:text-black hidden print:table-cell">সময়</th>
                              </tr>
                          </thead>
                          <tbody>
                              {physicsRoutine.map((item, index) => (
                                  <tr key={index} className="odd:bg-white even:bg-yellow-50/50 hover:bg-yellow-100 transition-colors">
                                      <td className="p-4 border-b border-yellow-100 text-gray-700">{item.date}</td>
                                      <td className="p-4 border-b border-yellow-100 text-gray-800 font-medium">{item.topic}</td>
                                      <td className="p-4 border-b border-yellow-100 text-gray-700 hidden print:table-cell">সকাল ১০ টা - রাত ১০ টা</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : (
                      <p className="text-center text-gray-500">কোর্স রুটিন খুব শীঘ্রই এখানে আপডেট করা হবে।</p>
                  )}
                </div>
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 print:hidden">
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
              &copy; {new Date().getFullYear()} SYLLABUSER BAIRE. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

    

