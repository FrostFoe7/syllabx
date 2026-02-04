'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useDoc, useCollection, appwriteConfig, useDatabases } from '@/appwrite';
import { Models, Query, ID } from 'appwrite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Exam, Question, UserData, Result } from '@/types';
import { isUserEnrolled } from '@/lib/enrollment';
import { parseISO, isAfter, isBefore, differenceInSeconds } from 'date-fns';

const QuestionNavigation = ({ questions, onQuestionSelect, currentQuestionIndex }: { questions: Question[], onQuestionSelect: (index: number) => void, currentQuestionIndex: number }) => {
    return (
        <div className="sticky top-20 h-fit hidden md:block">
            <Card>
                <CardHeader><CardTitle className="text-lg">Questions</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-5 gap-2">
                    {questions.map((q, index) => (
                        <Button
                            key={q.$id}
                            variant={index === currentQuestionIndex ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => onQuestionSelect(index)}
                        >
                            {index + 1}
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default function ExamEnginePage() {
  const params = useParams();
  const examId = params.examId as string;
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  const { user, profile: globalProfile } = useUser();

  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, number>>({});
  const answersRef = React.useRef(selectedAnswers);
  answersRef.current = selectedAnswers;

  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFinished, setIsFinished] = React.useState(false);
  const [isCheckingResult, setIsCheckingResult] = React.useState(true);
  const [accessError, setAccessError] = React.useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const questionRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const { data: exam, isLoading: examLoading } = useDoc<Exam>(appwriteConfig.examsCollectionId, examId);
  const { data: questions, isLoading: questionsLoading } = useCollection<Question>(
    appwriteConfig.questionsCollectionId,
    [Query.equal('examId', examId)]
  );
  
  const userData = globalProfile as UserData | null;

  const isEnrolled = React.useMemo(() => {
      return isUserEnrolled(userData, exam?.courseId || '', exam?.courseName);
  }, [userData, exam]);

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting || isFinished) return;
    setIsSubmitting(true);

    if (!user || !exam || !questions) {
        toast({ title: "Error", description: "Cannot submit, user or exam data is missing.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
        let correctCount = 0;
        let wrongCount = 0;
        const currentAnswers = answersRef.current;
        
        questions.forEach((q: Question) => {
            const selected = currentAnswers[q.$id];
            if (selected) {
                if (selected === q.ans) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        });

        const totalMarks = correctCount - (wrongCount * (exam.negativeMark || 0));
        
        // Determine if this is a practice submission (exam has already ended)
        const isPractice = isAfter(new Date(), parseISO(exam.endTime));

        const resultPayload = {
            userId: user.$id,
            userName: user.name,
            examId: examId,
            examTitle: exam.title,
            courseId: exam.courseId,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            marks: totalMarks,
            submittedAt: new Date().toISOString(),
            answersJSON: JSON.stringify(currentAnswers),
            isPractice: isPractice
        };

        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.resultsCollectionId,
            ID.unique(),
            resultPayload
        );

        setIsFinished(true);
        toast({ title: "Submitted", description: "Your exam has been submitted successfully!" });
        router.push('/dashboard/results');
    } catch (error) {
        const err = error as { message?: string };
        toast({ title: "Error", description: err.message || "Failed to submit exam. Please try again.", variant: "destructive" });
        setIsSubmitting(false);
    }
  }, [isSubmitting, isFinished, questions, exam, databases, user, examId, router, toast]);

  // Security: Block right click and copy
  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key)) {
            e.preventDefault();
            toast({ title: "Action Blocked", description: "This action is not allowed during an exam.", variant: "destructive" });
        }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  // Check for existing result
  React.useEffect(() => {
    async function checkExistingResult() {
        if (!user || !examId || !exam) return;
        try {
            const results = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.resultsCollectionId,
                [
                    Query.equal('userId', user.$id),
                    Query.equal('examId', examId)
                ]
            );
            
            // If the exam is currently LIVE and user has a result, block them.
            // If it's PRACTICE mode, we allow multiple attempts (or you could filter by isPractice).
            const isLive = !isAfter(new Date(), parseISO(exam.endTime)) && !isBefore(new Date(), parseISO(exam.startTime));
            
            if (isLive && results.total > 0) {
                setAccessError("You have already submitted this exam during the live window.");
            }
        } catch (error) {
            console.error("Error checking existing results:", error);
        } finally {
            setIsCheckingResult(false);
        }
    }
    if (exam) checkExistingResult();
  }, [user, examId, databases, exam]);

  // Timer and Access Logic
  React.useEffect(() => {
    if (exam && !isFinished && !isCheckingResult && !accessError) {
      const now = new Date();
      const startTime = parseISO(exam.startTime);
      const endTime = parseISO(exam.endTime);

      if (isBefore(now, startTime)) {
          setAccessError(`This exam has not started yet. It will start at ${format(startTime, 'PPpp')}`);
          return;
      }

      const isLive = isWithinInterval(now, { start: startTime, end: endTime });
      const isPast = isAfter(now, endTime);

      if (timeLeft === null) {
          const durationInSeconds = exam.duration * 60;
          
          if (isLive) {
              const secondsUntilEnd = differenceInSeconds(endTime, now);
              const initialTime = Math.min(durationInSeconds, secondsUntilEnd);
              setTimeLeft(Math.max(0, initialTime));
          } else if (isPast) {
              // For practice, give full duration
              setTimeLeft(durationInSeconds);
          }
      }
    }
  }, [exam, timeLeft, isFinished, isCheckingResult, accessError]);
  
  React.useEffect(() => {
      if (timeLeft === null || isFinished) return;
      
      if (timeLeft <= 0) {
          handleSubmit();
          return;
      }

      const timerId = setInterval(() => {
          setTimeLeft(prev => (prev !== null ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(timerId);
  }, [timeLeft, isFinished, handleSubmit]);

  const handleQuestionSelect = (index: number) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  React.useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt((entry.target as HTMLElement).dataset.index || '0', 10);
                    setCurrentQuestionIndex(index);
                }
            });
        },
        { rootMargin: '-50% 0px -50% 0px' }
    );

    const refs = questionRefs.current;
    refs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        refs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
    };
}, [questions]);


  if (examLoading || questionsLoading || isCheckingResult) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (accessError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Access Restricted</h1>
            <p>{accessError}</p>
            <Button onClick={() => router.push('/dashboard/exams')}>Back to Exams</Button>
        </div>
      );
  }

  if (!exam || !questions || questions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold">Exam Not Available</h1>
            <p>This exam could not be loaded or has no questions.</p>
            <Button onClick={() => router.push('/dashboard/exams')}>Back to Exams</Button>
        </div>
      );
  }

  if (!isEnrolled) {
      return (
          <div className="flex flex-col items-center justify-center h-screen space-y-4 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p>You are not enrolled in the course required for this exam.</p>
              <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
      );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isPractice = exam ? isAfter(new Date(), parseISO(exam.endTime)) : false;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-lg md:text-xl truncate max-w-[150px] md:max-w-md">{exam.title}</h1>
                    {isPractice && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Practice Mode</span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Total Questions: {questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1 rounded-full text-lg ${timeLeft !== null && timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100'}`}>
                    <Clock size={18} />
                    <span>{timeLeft !== null ? formatTime(timeLeft) : '...'}</span>
                </div>
                <Button variant="destructive" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 mt-4">
        <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
            <div className="space-y-6">
                {questions.map((question: Question, index: number) => (
                    <Card 
                        key={question.$id} 
                        className="shadow-xl border-none"
                        ref={(el) => { questionRefs.current[index] = el; }}
                        data-index={index}
                    >
                    <CardContent className="pt-8">
                        <h2 className="text-lg md:text-xl font-medium mb-8 leading-relaxed">
                            <span className="font-bold mr-2">{index + 1}.</span>
                            {question.q}
                        </h2>

                        <RadioGroup 
                            value={selectedAnswers[question.$id]?.toString()} 
                            onValueChange={(val) => setSelectedAnswers(prev => ({ ...prev, [question.$id]: parseInt(val) }))}
                            className="space-y-4"
                        >
                            {[question.a1, question.a2, question.a3, question.a4].map((opt, i) => (
                                <div key={i} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer hover:bg-gray-50 ${selectedAnswers[question.$id] === i + 1 ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-100'}`}>
                                    <RadioGroupItem value={(i + 1).toString()} id={`q-${question.$id}-opt-${i}`} />
                                    <Label htmlFor={`q-${question.$id}-opt-${i}`} className="flex-1 cursor-pointer text-base py-1">{opt}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                    </Card>
                ))}
                <div className="mt-8 text-center">
                    <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 gap-2">
                        <Send size={18} /> Final Submit
                    </Button>
                </div>
            </div>

            <QuestionNavigation 
                questions={questions} 
                onQuestionSelect={handleQuestionSelect}
                currentQuestionIndex={currentQuestionIndex} 
            />
        </div>
      </main>
    </div>
  );
}
