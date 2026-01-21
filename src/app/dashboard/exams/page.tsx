'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useUser, useDatabases, useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Exam {
    $id: string;
    title: string;
    courseName: string;
    startTime: string; // ISO string in Appwrite
    endTime: string; // ISO string in Appwrite
    duration: number;
}

function ExamCard({ exam }: { exam: Exam }) {
    const router = useRouter();
    const [status, setStatus] = useState<'upcoming' | 'active' | 'finished'>('upcoming');

    const startTime = useMemo(() => new Date(exam.startTime), [exam.startTime]);
    const endTime = useMemo(() => new Date(exam.endTime), [exam.endTime]);

    useEffect(() => {
        const updateStatus = () => {
            const now = new Date();
            if (now < startTime) {
                setStatus('upcoming');
            } else if (now > endTime) {
                setStatus('finished');
            } else {
                setStatus('active');
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 1000);

        return () => clearInterval(interval);
    }, [startTime, endTime]);

    const handleStartExam = () => {
        if (status === 'active') {
            router.push(`/exam/${exam.$id}`);
        }
    };

    let buttonText: string;
    switch (status) {
        case 'active':
            buttonText = 'Start Exam';
            break;
        case 'finished':
            buttonText = 'Finished';
            break;
        case 'upcoming':
        default:
            buttonText = 'Upcoming';
            break;
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{exam.title}</CardTitle>
                <CardDescription>{exam.courseName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(startTime, 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(startTime, 'p')} - {format(endTime, 'p')}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Duration: {exam.duration} minutes</span>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    disabled={status !== 'active'}
                    onClick={handleStartExam}
                >
                    {buttonText}
                </Button>
            </CardFooter>
        </Card>
    );
}


function ExamList({ exams, status }: { exams: Exam[] | null, status: 'loading' | 'error' | 'success' }) {
    if (status === 'loading') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-56 w-full" />
            </div>
        );
    }

    if (!exams || exams.length === 0) {
        return <p className="font-tiro-bangla text-center text-muted-foreground py-8">এই সেকশনে কোনো পরীক্ষা পাওয়া যায়নি।</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(exam => <ExamCard key={exam.$id} exam={exam} />)}
        </div>
    );
}

export default function ExamsPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { data: userData, isLoading: isDataLoading } = useDoc<any>(
        appwriteConfig.usersCollectionId,
        user?.$id || null
    );

    const { data: allExams, isLoading: examsLoading } = useCollection<Exam & any>(
        appwriteConfig.examsCollectionId
    );
    
    const enrolledCourses = userData?.enrolledCourses || [];

    const filteredExams = useMemo(() => {
        if (!allExams) return [];
        return allExams.filter(exam => enrolledCourses.includes(exam.courseName));
    }, [allExams, enrolledCourses]);

    const categorizedExams = useMemo(() => {
        if (!filteredExams) {
            return { today: [], past: [], upcoming: [] };
        }

        const now = new Date();
        const today: Exam[] = [];
        const past: Exam[] = [];
        const upcoming: Exam[] = [];

        for (const exam of filteredExams) {
            const startTime = new Date(exam.startTime);
            const endTime = new Date(exam.endTime);

            if (endTime < now) {
                past.push(exam);
            } else if (startTime > now) {
                upcoming.push(exam);
            } else {
                today.push(exam);
            }
        }
        return { today, past, upcoming };
    }, [filteredExams]);

    const isLoading = isUserLoading || isDataLoading || examsLoading;

    return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-tiro-bangla">পরীক্ষাসমূহ</h1>
        <p className="text-muted-foreground font-tiro-bangla">আপনার চলমান, অতীত এবং আসন্ন পরীক্ষাসমূহ দেখুন।</p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">আজকের পরীক্ষা</TabsTrigger>
          <TabsTrigger value="past">গত পরীক্ষা</TabsTrigger>
          <TabsTrigger value="upcoming">আগামী পরীক্ষা</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today">
            <ExamList exams={categorizedExams.today} status={isLoading ? 'loading' : 'success'} />
        </TabsContent>
        
        <TabsContent value="past">
            <ExamList exams={categorizedExams.past} status={isLoading ? 'loading' : 'success'} />
        </TabsContent>
        
        <TabsContent value="upcoming">
            <ExamList exams={categorizedExams.upcoming} status={isLoading ? 'loading' : 'success'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
