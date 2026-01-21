'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ID } from 'appwrite';
import { useDatabases, useCollection, appwriteConfig } from '@/appwrite';
import { ExamFormSchema, ExamFormValues } from './schema';
import { Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const jsonFormatPlaceholder = `[
  {
    "question": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Optional explanation"
  }
]`;

export default function AdminQuestionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const databases = useDatabases();
  const { data: existingExams, isLoading: examsLoading } = useCollection<any>(appwriteConfig.examsCollectionId);
  const { data: courses, isLoading: coursesLoading } = useCollection<any>(appwriteConfig.coursesCollectionId);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(ExamFormSchema),
    defaultValues: {
      courseName: '',
      examName: '',
      startTime: '',
      endTime: '',
      duration: 60,
      negativeMark: 0.25,
      questionsJson: '',
    },
  });

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam and all its questions?')) return;
    
    try {
        setIsLoading(true);
        // 1. Delete questions associated with the exam
        const questionsResult = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            [`equal("examId", "${examId}")`]
        );
        
        const deletePromises = questionsResult.documents.map(q => 
            databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId, q.$id)
        );
        await Promise.all(deletePromises);

        // 2. Delete the exam itself
        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.examsCollectionId, examId);
        
        toast({ title: 'Exam deleted successfully' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ExamFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const questionsData = JSON.parse(data.questionsJson);
      if (!Array.isArray(questionsData)) {
          throw new Error("Questions JSON must be an array");
      }

      const examId = ID.unique();

      // 1. Create Exam Document
      const examDataPayload = {
        originalId: examId,
        title: data.examName,
        courseName: data.courseName,
        duration: Math.floor(Number(data.duration)),
        totalQuestions: questionsData.length,
        negativeMark: Number(data.negativeMark),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        subject: data.courseName, 
        searchTags: data.examName
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        examId,
        examDataPayload
      );

      // 2. Create Question Documents
      const questionPromises = questionsData.map(async (q: any) => {
          const options = q.options || [];
          let ansIndex = 0;
          if (q.answer.startsWith("Option ")) {
              const char = q.answer.split(" ")[1];
              if (char === 'A') ansIndex = 1;
              else if (char === 'B') ansIndex = 2;
              else if (char === 'C') ansIndex = 3;
              else if (char === 'D') ansIndex = 4;
          } else {
              const idx = options.indexOf(q.answer);
              if (idx !== -1) ansIndex = idx + 1;
          }
          if (ansIndex === 0) ansIndex = 1;

          return databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.questionsCollectionId,
              ID.unique(),
              {
                  examId: examId,
                  q: q.question,
                  a1: options[0] || "",
                  a2: options[1] || "",
                  a3: options[2] || "",
                  a4: options[3] || "",
                  ans: ansIndex,
                  exp: q.explanation || ""
              }
          );
      });

      await Promise.all(questionPromises);
      
      toast({
        title: 'Success!',
        description: 'The exam and questions have been uploaded successfully.',
      });
      form.reset();
    } catch (error: any) {
      console.error('Error uploading exam:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold">Exam & Question Management</h1>
        <p className="text-muted-foreground">Manage your exams and questions from here.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Upload New Exam</CardTitle>
                <CardDescription>
                    Fill in the details below to create a new exam.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="courseName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Course</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {courses?.map((course: any) => (
                                <SelectItem key={course.$id} value={course.title} disabled={course.disabled}>
                                    {course.title}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="examName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Exam Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Physics Chapter 1 Quiz" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Duration (in minutes)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 60" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="negativeMark"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Negative Marking</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 0.25" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="questionsJson"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Questions (JSON Format)</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder={jsonFormatPlaceholder}
                                className="min-h-[250px] font-mono text-xs"
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Uploading...' : 'Upload Exam'}
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>

        {/* Existing Exams List */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Existing Exams ({existingExams?.length || 0})</CardTitle>
                    <CardDescription>View and manage already uploaded exams.</CardDescription>
                </CardHeader>
                <CardContent>
                    {examsLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : existingExams && existingExams.length > 0 ? (
                        <div className="space-y-4">
                            {existingExams.map((exam: any) => (
                                <div key={exam.$id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold truncate">{exam.title}</h4>
                                        <p className="text-xs text-muted-foreground">{exam.courseName} • {exam.totalQuestions} Questions</p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteExam(exam.$id)}
                                        disabled={isLoading}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No exams found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Deleting an exam will also delete all associated questions and student responses for that exam. This action is permanent.
                </AlertDescription>
            </Alert>
        </div>
      </div>
    </div>
  );
}