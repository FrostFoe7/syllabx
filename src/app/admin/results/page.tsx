'use client';

import * as React from 'react';
import { useCollection, useDatabases, appwriteConfig } from '@/appwrite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, User as UserIcon, BookText, FileQuestion, FileText, Printer, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Query } from 'appwrite';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Result, UserData as Student, Exam, Course } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminResultsPage() {
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const databases = useDatabases();
  const { toast } = useToast();
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(appwriteConfig.coursesCollectionId);
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(appwriteConfig.examsCollectionId, selectedCourseId ? [Query.equal('courseId', selectedCourseId)] : []);
  const { data: results, isLoading: resultsLoading, mutate: refreshResults } = useCollection<Result>(appwriteConfig.resultsCollectionId, selectedExamId ? [Query.equal('examId', selectedExamId)] : []);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(appwriteConfig.usersCollectionId);

  const isLoading = coursesLoading || examsLoading || resultsLoading || studentsLoading;

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result? This cannot be undone.')) return;
    setDeletingId(id);
    try {
        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.resultsCollectionId, id);
        toast({ title: 'Result deleted' });
        refreshResults();
    } catch (error) {
        const err = error as { message?: string };
        toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
    } finally {
        setDeletingId(null);
    }
  };

  const getStudentName = (id: string) => students?.find((s: Student) => s.$id === id)?.name || 'Unknown Student';
  const getExamTitle = (id: string) => exams?.find((e: Exam) => e.$id === id)?.title || 'Unknown Exam';

  const sortedResults = React.useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => b.marks - a.marks);
  }, [results]);
  
  React.useEffect(() => {
    setSelectedExamId(null);
  }, [selectedCourseId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Result Management</h1>
        <p className="text-muted-foreground">
          Filter and view all student results across different exams.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>Select a course and an exam to view results.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Select onValueChange={setSelectedCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Course" />
            </SelectTrigger>
            <SelectContent>
              {coursesLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                courses?.map((course: Course) => <SelectItem key={course.$id} value={course.$id}>{course.title}</SelectItem>)
              }
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedExamId} disabled={!selectedCourseId || examsLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select an Exam" />
            </SelectTrigger>
            <SelectContent>
              {examsLoading ? <SelectItem value="loading" disabled>Loading exams...</SelectItem> :
               exams && exams.length > 0 ?
                exams.map((exam: Exam) => <SelectItem key={exam.$id} value={exam.$id}>{exam.title}</SelectItem>) :
                <SelectItem value="no-exams" disabled>No exams for this course</SelectItem>
              }
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {selectedExamId && (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Download Assets</CardTitle>
                    <CardDescription>Download question or solution PDF for the selected exam.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/print/exam/${selectedExamId}?mode=questions`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                            <FileQuestion /> Questions PDF
                        </Button>
                    </Link>
                    <Link href={`/admin/print/exam/${selectedExamId}?mode=solutions`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                            <FileText /> Solutions PDF
                        </Button>
                    </Link>
                    <Link href={`/admin/print/merit-list/${selectedExamId}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" className="gap-2">
                            <Printer /> Merit List PDF
                        </Button>
                    </Link>
                </div>
            </CardHeader>
        </Card>
      )}

      {isLoading && selectedExamId ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : selectedExamId && results ? (
        results.length > 0 ? (
          <div className="grid gap-4">
            {sortedResults.map((result, index) => (
              <Card key={result.$id}>
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-lg w-8 text-center">{index + 1}</div>
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
                  
                  <div className="flex gap-8 text-center ml-auto pl-4">
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
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteResult(result.$id)}
                        disabled={deletingId === result.$id}
                    >
                        {deletingId === result.$id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
             <Card>
                <CardContent className="text-center py-10">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500">No results have been submitted for this exam yet.</p>
                </CardContent>
            </Card>
        )
      ) : (
        <Card>
          <CardContent className="text-center py-10">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select an Exam</h3>
            <p className="mt-1 text-sm text-gray-500">Please select a course and an exam to view the results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
