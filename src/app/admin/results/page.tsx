'use client';

import { useCollection, appwriteConfig } from '@/appwrite';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, User as UserIcon, BookText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { Models } from 'appwrite';

interface ResultDoc extends Models.Document {
    userId: string;
    examId: string;
    marks: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalQuestions: number;
    submittedAt: string;
}

interface Student extends Models.Document {
    userId: string;
    name: string;
}

interface Exam extends Models.Document {
    originalId?: string;
    title: string;
}

export default function AdminResultsPage() {
  const { data: results, isLoading } = useCollection<ResultDoc>(
    appwriteConfig.resultsCollectionId
  );

  const { data: students } = useCollection<Student>(appwriteConfig.usersCollectionId);
  const { data: exams } = useCollection<Exam>(appwriteConfig.examsCollectionId);

  // Helper to find name by ID
  const getStudentName = (id: string) => students?.find(s => s.userId === id)?.name || 'Unknown Student';
  const getExamTitle = (id: string) => exams?.find(e => e.$id === id || e.originalId === id)?.title || 'Unknown Exam';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Result Management</h1>
        <p className="text-muted-foreground">
          View all student results across different exams.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : results && results.length > 0 ? (
        <div className="grid gap-4">
          {[...results].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map((result) => (
            <Card key={result.$id}>
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full text-primary">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{getStudentName(result.userId)}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <BookText size={14} /> {getExamTitle(result.examId)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-8 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Marks</p>
                    <p className="font-bold text-lg">{result.marks.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Correct/Wrong</p>
                    <div className="flex items-center gap-2 font-bold">
                        <span className="text-green-600">{result.correctAnswers}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-red-600">{result.wrongAnswers}</span>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground uppercase">Date</p>
                    <p className="text-sm">{format(new Date(result.submittedAt), 'PP')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-10">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results available</h3>
            <p className="mt-1 text-sm text-gray-500">Student results will appear here once they complete exams.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
