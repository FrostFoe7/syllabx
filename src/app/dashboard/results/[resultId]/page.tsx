
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Query } from 'appwrite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Info, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Result, Exam, UserData as StudentDoc, Question as QuestionDoc } from '@/types';

export default function ResultDetailPage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const router = useRouter();
  const { user } = useUser();

  const { data: result, isLoading: resultLoading } = useDoc<Result>(appwriteConfig.resultsCollectionId, resultId);
  
  const examId = result?.examId || null;

  const { data: questions, isLoading: questionsLoading } = useCollection<QuestionDoc>(
    appwriteConfig.questionsCollectionId,
    examId ? [Query.equal('examId', examId)] : []
  );
  
  const { data: exam, isLoading: examLoading } = useDoc<Exam>(appwriteConfig.examsCollectionId, examId || '');
  
  const { data: allResults, isLoading: allResultsLoading } = useCollection<Result>(
      appwriteConfig.resultsCollectionId, 
      examId ? [Query.equal('examId', examId)] : []
  );

  const { data: allStudents, isLoading: studentsLoading } = useCollection<StudentDoc>(appwriteConfig.usersCollectionId);


  const userAnswers = React.useMemo(() => {
    if (!result?.answersJSON) return {};
    try {
        return JSON.parse(result.answersJSON);
    } catch {
        return {};
    }
  }, [result]);

  const { meritList, userRank } = React.useMemo(() => {
    if (!allResults || !allStudents || !exam || !user) return { meritList: [], userRank: null };

    const examEndTime = new Date(exam.endTime);
    const validResults = allResults
        .filter((r: Result) => new Date(r.submittedAt) <= examEndTime)
        .map((r: Result) => {
            const student = allStudents.find((s: StudentDoc) => s.$id === r.userId);
            return {
                ...r,
                studentName: student?.name || 'Unknown',
            };
        })
        .sort((a, b) => b.marks - a.marks);
    
    const rank = validResults.findIndex((r: any) => r.userId === user.$id) + 1;

    return { meritList: validResults, userRank: rank > 0 ? rank : null };
  }, [allResults, allStudents, exam, user]);


  if (resultLoading || questionsLoading || examLoading || allResultsLoading || studentsLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!result) return <div className="text-center py-20">Result not found.</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold">{result.examTitle} - Analysis</h1>
            <p className="text-muted-foreground text-sm">Detailed performance breakdown</p>
        </div>
      </div>

      {/* Summary Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Marks</p>
                  <h2 className="text-4xl font-black mt-2">{result.marks.toFixed(2)}</h2>
                  <p className="text-xs text-muted-foreground mt-1">out of {result.totalQuestions}</p>
              </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
              <CardContent className="pt-6 text-center">
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Correct</p>
                  <h2 className="text-4xl font-black mt-2 text-green-700">{result.correctAnswers}</h2>
                  <Badge variant="outline" className="mt-2 bg-white text-green-700 border-green-200">Accuracy: {((result.correctAnswers / result.totalQuestions) * 100).toFixed(1)}%</Badge>
              </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
              <CardContent className="pt-6 text-center">
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wider">Wrong</p>
                  <h2 className="text-4xl font-black mt-2 text-red-700">{result.wrongAnswers}</h2>
                  <p className="text-xs text-red-500 mt-1">{result.totalQuestions - result.correctAnswers - result.wrongAnswers} Unanswered</p>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Trophy className="text-primary" />
                Merit Position
            </CardTitle>
        </CardHeader>
        <CardContent>
            {userRank ? (
                <p className="text-lg">
                    Your rank is <span className="font-bold text-2xl text-primary">{userRank}</span> out of {meritList.length} participants who completed on time.
                </p>
            ) : (
                <p className="text-muted-foreground">Your result was not included in the merit list because it was submitted after the deadline.</p>
            )}
        </CardContent>
      </Card>


      {/* Question Breakdown */}
      <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="text-primary" />
              Question Review
          </h2>
          
          {questions?.map((q: QuestionDoc, index: number) => {
              const selected = userAnswers[q.$id];
              const isCorrect = selected === q.ans;
              const isUnanswered = !selected;
              const options = [q.a1, q.a2, q.a3, q.a4];

              return (
                  <Card key={q.$id} className={`overflow-hidden border-l-4 ${isCorrect ? 'border-l-green-500' : isUnanswered ? 'border-l-gray-300' : 'border-l-red-500'}`}>
                      <CardHeader className="bg-gray-50/50">
                          <div className="flex justify-between items-start gap-4">
                              <CardTitle className="text-base font-medium leading-relaxed">
                                  <span className="font-bold mr-2">{index + 1}.</span>
                                  {q.q}
                              </CardTitle>
                              {isCorrect ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Correct</Badge>
                              ) : isUnanswered ? (
                                  <Badge variant="secondary">Unanswered</Badge>
                              ) : (
                                  <Badge variant="destructive">Incorrect</Badge>
                              )}
                          </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {options.map((opt, i) => {
                                  const optNum = i + 1;
                                  const isUserSelected = selected === optNum;
                                  const isTheCorrectAns = q.ans === optNum;

                                  let style = "border-gray-100 bg-white";
                                  if (isTheCorrectAns) style = "border-green-200 bg-green-50 text-green-800 font-medium";
                                  else if (isUserSelected && !isCorrect) style = "border-red-200 bg-red-50 text-red-800";

                                  return (
                                      <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 text-sm ${style}`}>
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${isTheCorrectAns ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-100 border-gray-200'}`}>
                                              {String.fromCharCode(65 + i)}
                                          </div>
                                          <span className="flex-1">{opt}</span>
                                          {isTheCorrectAns && <CheckCircle2 size={16} className="text-green-600" />}
                                          {isUserSelected && !isCorrect && <XCircle size={16} className="text-red-600" />}
                                      </div>
                                  );
                              })}
                          </div>

                          {(q.exp) && (
                              <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm">
                                  <div className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                                      <Info size={16} />
                                      Explanation:
                                  </div>
                                  <p className="text-gray-700 leading-relaxed">{q.exp}</p>
                              </div>
                          )}
                      </CardContent>
                  </Card>
              );
          })}
      </div>
    </div>
  );
}
