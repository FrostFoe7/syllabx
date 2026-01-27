'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Models, Query } from 'appwrite';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExamDoc extends Models.Document {
    title: string;
    courseName?: string;
    totalQuestions: number;
}

interface QuestionDoc extends Models.Document {
    q: string;
    a1: string;
    a2: string;
    a3: string;
    a4: string;
    ans: number;
    exp: string;
}

export default function PrintExamPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const examId = params.examId as string;
    const mode = searchParams.get('mode') || 'questions'; // 'questions' or 'solutions'

    const { data: exam, isLoading: examLoading } = useDoc<ExamDoc>(appwriteConfig.examsCollectionId, examId);
    const { data: questions, isLoading: questionsLoading } = useCollection<QuestionDoc>(
        appwriteConfig.questionsCollectionId,
        [Query.equal('examId', examId), Query.orderAsc('$createdAt')]
    );
    
    React.useEffect(() => {
        if (!examLoading && !questionsLoading) {
            const printTimeout = setTimeout(() => {
                window.print();
            }, 500); // Small delay to ensure content is rendered
            return () => clearTimeout(printTimeout);
        }
    }, [examLoading, questionsLoading]);

    if (examLoading || questionsLoading) {
        return (
            <div className="flex h-screen items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin mr-4" />
                <p>Preparing document...</p>
            </div>
        );
    }

    if (!exam || !questions) {
        return <div>Error: Could not load exam data.</div>;
    }

    const showSolutions = mode === 'solutions';

    return (
        <div className="p-8 font-sans bg-white text-black">
            <header className="text-center mb-8 border-b-2 border-black pb-4">
                <Image 
                    src="https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/ei_1766508088751-removebg-preview.png"
                    alt="Logo"
                    width={100}
                    height={100}
                    className="mx-auto mb-2"
                />
                <h1 className="text-3xl font-bold font-tiro-bangla">{exam.title}</h1>
                <h2 className="text-xl text-gray-700 font-tiro-bangla">{exam.courseName}</h2>
                <div className="flex justify-between text-sm mt-2">
                    <span>Total Questions: {exam.totalQuestions}</span>
                    <span>{showSolutions ? "Question & Solution Sheet" : "Question Sheet"}</span>
                </div>
            </header>

            <main className="space-y-6">
                {questions.map((q, index) => {
                    const options = [q.a1, q.a2, q.a3, q.a4];
                    return (
                        <div key={q.$id} className="break-inside-avoid-page pb-4">
                            <h3 className="text-lg font-semibold mb-3 flex items-start">
                                <span className="mr-2">{index + 1}.</span>
                                <span>{q.q}</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 ml-6 text-md">
                                {options.map((opt, i) => {
                                    const isCorrect = showSolutions && (i + 1 === q.ans);
                                    return (
                                        <div key={i} className={cn("flex items-center", isCorrect && "font-bold text-green-700")}>
                                            <span className="mr-2">{String.fromCharCode(65 + i)}.</span>
                                            <span>{opt}</span>
                                            {isCorrect && <CheckCircle2 className="ml-2 h-4 w-4" />}
                                        </div>
                                    );
                                })}
                            </div>
                            {showSolutions && q.exp && (
                                <div className="ml-6 mt-3 p-2 bg-gray-100 border-l-4 border-gray-400 rounded-r-md">
                                    <span className="font-semibold">Explanation: </span>
                                    <span>{q.exp}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>
            
             <footer className="text-center mt-12 pt-4 border-t text-xs text-gray-500">
                <p>&copy; {new Date().getFullYear()} SYLLABUSER BAIRE. All Rights Reserved.</p>
             </footer>
        </div>
    );
}
