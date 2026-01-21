'use client';

import { useParams } from 'next/navigation';
import { useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { Query } from 'appwrite';

interface ExamData {
    title: string;
    duration: number;
}

export default function ExamTakingPage() {
    const params = useParams();
    const examId = params.examId as string;

    const { data: examData, isLoading: isExamLoading } = useDoc<any>(
        appwriteConfig.examsCollectionId, 
        examId
    );

    const { data: questions, isLoading: isQuestionsLoading } = useCollection<any>(
        appwriteConfig.questionsCollectionId,
        [Query.equal('examId', examId)]
    );

    const isLoading = isExamLoading || isQuestionsLoading;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!examData) {
        return <div>Exam not found or you do not have permission to view it.</div>;
    }

    return (
        <div>
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="font-tiro-bangla">{examData.title}</CardTitle>
                    <div className="flex items-center text-muted-foreground gap-2">
                        <Clock className="h-4 w-4" />
                        <span>সময়: {examData.duration} মিনিট</span>
                    </div>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-tiro-bangla">প্রশ্নপত্র</CardTitle>
                </CardHeader>
                <CardContent>
                    {questions && questions.length > 0 ? (
                        <div className="space-y-6">
                            {questions.map((q: any, index: number) => (
                                <div key={q.$id} className="p-4 border rounded-lg">
                                    <p className="font-semibold mb-2">{index + 1}. {q.q}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className={q.ans === 1 ? "font-bold text-green-600" : ""}>A) {q.a1}</div>
                                        <div className={q.ans === 2 ? "font-bold text-green-600" : ""}>B) {q.a2}</div>
                                        <div className={q.ans === 3 ? "font-bold text-green-600" : ""}>C) {q.a3}</div>
                                        <div className={q.ans === 4 ? "font-bold text-green-600" : ""}>D) {q.a4}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10 font-tiro-bangla">
                            এই পরীক্ষার জন্য কোনো প্রশ্ন পাওয়া যায়নি।
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
