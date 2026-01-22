'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useUser, useCollection, appwriteConfig } from "@/appwrite";
import { Query, Models } from "appwrite";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format } from "date-fns";

interface ResultDoc extends Models.Document {
    examTitle: string;
    courseId: string;
    marks: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    submittedAt: string;
}

export default function ResultsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { data: results, isLoading: resultsLoading } = useCollection<ResultDoc>(
    appwriteConfig.resultsCollectionId,
    [Query.equal('userId', user?.$id || ''), Query.orderDesc('submittedAt')]
  );

  const isLoading = userLoading || resultsLoading;

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold font-tiro-bangla">ফলাফল</h1>
        <p className="text-muted-foreground font-tiro-bangla">আপনার কোর্স-ভিত্তিক পরীক্ষার ফলাফল দেখুন।</p>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      ) : results && results.length > 0 ? (
          <div className="grid gap-4">
              {results.map((result) => (
                  <Link key={result.$id} href={`/dashboard/results/${result.$id}`}>
                    <Card className="hover:shadow-md transition-all border-l-4 border-l-primary group">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-bold group-hover:text-primary transition-colors">{result.examTitle}</h3>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {format(new Date(result.submittedAt), 'PPp')}</span>
                                    <span className="flex items-center gap-1 font-bold text-black bg-yellow-100 px-2 py-0.5 rounded">Marks: {result.marks.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> {result.correctAnswers}</span>
                                    <span className="text-red-500 flex items-center gap-1"><XCircle size={16}/> {result.wrongAnswers}</span>
                                </div>
                                <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                        </CardContent>
                    </Card>
                  </Link>
              ))}
          </div>
      ) : (
        <Card className="text-center py-10">
            <CardHeader className="flex flex-col items-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="font-tiro-bangla text-2xl">এখনো কোনো ফলাফল নেই</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-500 font-tiro-bangla">পরীক্ষায় অংশগ্রহণ করার পর আপনার ফলাফল এখানে দেখা যাবে।</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
