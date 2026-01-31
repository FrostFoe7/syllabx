'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ExamLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#FFFDF5]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
            <Link href="/dashboard">
            <Image
                src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png"
                alt="Logo"
                width={150}
                height={150}
                quality={100}
                className="h-14 w-auto"
            />
            </Link>
            <h1 className="text-xl font-bold font-tiro-bangla">পরীক্ষা চলছে</h1>
        </header>
        
        <main className="p-6">{children}</main>
        </div>
    );
}

    