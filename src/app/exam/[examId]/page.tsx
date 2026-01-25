'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, appwriteConfig, useDatabases } from '@/appwrite';
import { Models, Query, ID } from 'appwrite';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, AlertTriangle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ExamDoc extends Models.Document {
    title: string;
    courseId: string;
    duration: number;
    startTime: string;
    endTime: string;
    negativeMark: number;
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

interface UserData extends Models.Document {
    enrolledCourses: string[];
}

export default function ExamEnginePage() {
  const params = useParams();
  const examId = params.examId as string;
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  const { user } = useUser();

  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [isSubmitting, setIsSaving] = React.useState(false);
  const [isFinished, setIsFinished] = React.useState(false);

  const { data: exam, isLoading: examLoading } = useDoc<ExamDoc>(appwriteConfig.examsCollectionId, examId);
  const { data: questions, isLoading: questionsLoading } = useCollection<QuestionDoc>(
    appwriteConfig.questionsCollectionId,
    [Query.equal('examId', examId)]
  );
  const { data: userData } = useDoc<UserData>(appwriteConfig.usersCollectionId, user?.$id || null);

  // Enrollment Check - Move up to avoid conditional hook issues
  const isEnrolled = React.useMemo(() => {
      if (!userData || !exam) return true; // Loading or not found yet
      // Check both Name (preferred as per dashboard logic) and ID (fallback) to be safe
      return (exam.courseName && userData.enrolledCourses.includes(exam.courseName)) || 
             userData.enrolledCourses.includes(exam.courseId);
  }, [userData, exam]);

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting || isFinished) return;
    setIsSaving(true);

    try {
        let correctCount = 0;
        let wrongCount = 0;
        
        questions?.forEach(q => {
            const selected = selectedAnswers[q.$id];
            if (selected) {
                if (selected === q.ans) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        });

        const totalMarks = correctCount - (wrongCount * (exam?.negativeMark || 0));

        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.resultsCollectionId,
            ID.unique(),
            {
                userId: user?.$id,
                userName: user?.name,
                examId: examId,
                examTitle: exam?.title,
                courseId: exam?.courseId,
                totalQuestions: questions?.length,
                correctAnswers: correctCount,
                wrongAnswers: wrongCount,
                marks: totalMarks,
                submittedAt: new Date().toISOString(),
                answersJSON: JSON.stringify(selectedAnswers)
            }
        );

        setIsFinished(true);
        toast({ title: "Submitted", description: "Your exam has been submitted successfully!" });
        router.push('/dashboard/results');
    } catch (error) {
        const err = error as { message?: string };
        console.error(error);
        toast({ title: "Error", description: err.message || "Failed to submit exam. Please try again.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }, [isSubmitting, isFinished, questions, selectedAnswers, exam, databases, user, examId, router, toast]);

  // Security: Block right click and copy
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
            e.preventDefault();
            toast({ title: "Action Blocked", description: "Copy-paste is not allowed during exam.", variant: "destructive" });
        }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  // Timer Logic
  React.useEffect(() => {
    if (exam && timeLeft === null) {
        setTimeLeft(exam.duration * 60);
    }

    if (timeLeft === 0) {
        handleSubmit();
        return;
    }

    if (timeLeft !== null && !isFinished) {
        const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
        return () => clearInterval(timer);
    }
  }, [exam, timeLeft, isFinished, handleSubmit]);

  if (examLoading || questionsLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!exam || !questions) return <div>Exam not found.</div>;

  if (!isEnrolled) {
      return (
          <div className="flex flex-col items-center justify-center h-screen space-y-4 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p>You are not enrolled in the course &quot;{exam.courseId}&quot; to take this exam.</p>
              <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
      );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Exam Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
            <div>
                <h1 className="font-bold text-lg md:text-xl truncate max-w-[200px] md:max-w-md">{exam.title}</h1>
                <p className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1 rounded-full ${timeLeft && timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100'}`}>
                    <Clock size={18} />
                    <span>{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
                </div>
                <Button variant="default" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit
                </Button>
            </div>
        </div>
        <Progress value={progress} className="h-1 mt-4" />
      </header>

      <main className="container mx-auto p-4 md:p-8 mt-4 max-w-3xl">
        <Card className="shadow-xl border-none">
            <CardContent className="pt-8">
                <h2 className="text-lg md:text-xl font-medium mb-8 leading-relaxed">
                    <span className="font-bold mr-2">{currentQuestionIndex + 1}.</span>
                    {currentQuestion.q}
                </h2>

                <RadioGroup 
                    value={selectedAnswers[currentQuestion.$id]?.toString()} 
                    onValueChange={(val) => setSelectedAnswers(prev => ({ ...prev, [currentQuestion.$id]: parseInt(val) }))}
                    className="space-y-4"
                >
                    {[currentQuestion.a1, currentQuestion.a2, currentQuestion.a3, currentQuestion.a4].map((opt, i) => (
                        <div key={i} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer hover:bg-gray-50 ${selectedAnswers[currentQuestion.$id] === i + 1 ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-100'}`}>
                            <RadioGroupItem value={(i + 1).toString()} id={`opt-${i}`} />
                            <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-base py-1">{opt}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6 mt-8">
                <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)} 
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                >
                    <ChevronLeft size={18} /> Previous
                </Button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        Final Submit
                    </Button>
                ) : (
                    <Button 
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="gap-2"
                    >
                        Next <ChevronRight size={18} />
                    </Button>
                )}
            </CardFooter>
        </Card>
      </main>
    </div>
  );
}