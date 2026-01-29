'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Models, Query } from 'appwrite';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExamDoc extends Models.Document {
    title: string;
    courseName?: string;
    endTime: string;
}

interface ResultDoc extends Models.Document {
    userId: string;
    marks: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalQuestions: number;
    submittedAt: string;
}

interface StudentDoc extends Models.Document {
    name: string;
}

export default function PrintMeritListPage() {
    const params = useParams();
    const examId = params.examId as string;
    const [year] = React.useState(() => new Date().getFullYear());

    const { data: exam, isLoading: examLoading } = useDoc<ExamDoc>(appwriteConfig.examsCollectionId, examId);
    const { data: results, isLoading: resultsLoading } = useCollection<ResultDoc>(
        appwriteConfig.resultsCollectionId,
        examId ? [Query.equal('examId', examId)] : []
    );
    const { data: students, isLoading: studentsLoading } = useCollection<StudentDoc>(appwriteConfig.usersCollectionId);

    React.useEffect(() => {
        if (!examLoading && !resultsLoading && !studentsLoading && exam && results) {
            const printTimeout = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(printTimeout);
        }
    }, [examLoading, resultsLoading, studentsLoading, exam, results]);
    
    const meritList = React.useMemo(() => {
        if (!results || !students || !exam) return [];
        const examEndTime = new Date(exam.endTime);

        return results
            .filter(r => new Date(r.submittedAt) <= examEndTime) // Filter by submission time
            .map(r => {
                const student = students.find(s => s.$id === r.userId);
                return {
                    ...r,
                    studentName: student?.name || 'Unknown Student',
                };
            })
            .sort((a, b) => b.marks - a.marks);
    }, [results, students, exam]);

    const isLoading = examLoading || resultsLoading || studentsLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin mr-4" />
                <p>Preparing Merit List...</p>
            </div>
        );
    }
    
    if (!exam) {
        return <div>Error: Could not load exam data.</div>;
    }

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
                <h2 className="text-xl text-gray-700 font-tiro-bangla">Merit List ({exam.courseName})</h2>
                <div className="flex justify-between text-sm mt-2">
                    <span>Total Participants: {meritList.length}</span>
                    <span>Date: {format(new Date(), 'PP')}</span>
                </div>
            </header>

            <main>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border font-semibold">Rank</th>
                            <th className="p-2 border font-semibold">Student Name</th>
                            <th className="p-2 border font-semibold text-center">Marks</th>
                            <th className="p-2 border font-semibold text-center">Correct</th>
                            <th className="p-2 border font-semibold text-center">Wrong</th>
                            <th className="p-2 border font-semibold">Submitted At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {meritList.map((result, index) => (
                            <tr key={result.$id} className="odd:bg-white even:bg-gray-50">
                                <td className="p-2 border font-bold">{index + 1}</td>
                                <td className="p-2 border">{result.studentName}</td>
                                <td className="p-2 border text-center font-bold">{result.marks.toFixed(2)}</td>
                                <td className="p-2 border text-center text-green-600">{result.correctAnswers}</td>
                                <td className="p-2 border text-center text-red-600">{result.wrongAnswers}</td>
                                <td className="p-2 border text-sm">{format(new Date(result.submittedAt), 'Pp')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {meritList.length === 0 && <p className="text-center mt-4">No results found for this exam within the time limit.</p>}
            </main>

            <footer className="text-center mt-12 pt-4 border-t text-xs text-gray-500">
                <p>&copy; {year} SYLLABUSER BAIRE. All Rights Reserved.</p>
            </footer>
        </div>
    );
}
