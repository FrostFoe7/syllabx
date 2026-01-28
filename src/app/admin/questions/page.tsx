'use client';

import { useState } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
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
import { Trash2, AlertCircle, Plus, FileJson, LayoutList } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Models } from 'appwrite';

const jsonFormatPlaceholder = `[
  {
    "question": "আপনার প্রশ্ন এখানে লিখুন?",
    "options": ["অপশন ১", "অপশন ২", "অপশন ৩", "অপশন ৪"],
    "answer": "অপশন ১",
    "explanation": "ব্যাখ্যা (ঐচ্ছিক)"
  }
]`;

interface QuestionInput {
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
}

interface Course extends Models.Document {
    title: string;
}

interface Exam extends Models.Document {
    title: string;
    courseId: string;
    courseName?: string;
    totalQuestions: number;
}

export default function AdminQuestionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const databases = useDatabases();
  const { data: existingExams, isLoading: examsLoading } = useCollection<Exam>(appwriteConfig.examsCollectionId);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(appwriteConfig.coursesCollectionId);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(ExamFormSchema),
    defaultValues: {
      courseId: '',
      examName: '',
      startTime: '',
      endTime: '',
      duration: 60,
      negativeMark: 0.25,
      uploadMode: 'json',
      questionsJson: '',
      questions: [{ question: '', options: ['', '', '', ''], answer: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam and all its questions?')) return;
    
    try {
        setIsLoading(true);
        const questionsResult = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.questionsCollectionId,
            [`equal("examId", "${examId}")`]
        );
        
        const deletePromises = questionsResult.documents.map(q => 
            databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId, q.$id)
        );
        await Promise.all(deletePromises);

        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.examsCollectionId, examId);
        
        toast({ title: 'Exam deleted successfully' });
    } catch (error) {
        const err = error as { message?: string };
        toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
    } finally {
        setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ExamFormValues> = async (data) => {
    setIsLoading(true);
    try {
      let questionsData: QuestionInput[] = [];
      
      if (data.uploadMode === 'json') {
          if (!data.questionsJson) throw new Error("JSON is required in JSON mode");
          questionsData = JSON.parse(data.questionsJson);
      } else {
          questionsData = (data.questions || []) as QuestionInput[];
      }

      if (!Array.isArray(questionsData) || questionsData.length === 0) {
          throw new Error("You must add at least one question");
      }

      const examId = ID.unique();
      const selectedCourse = courses?.find(c => c.$id === data.courseId);

      const examDataPayload = {
        originalId: examId,
        title: data.examName,
        courseId: data.courseId,
        courseName: selectedCourse?.title || 'Unknown',
        duration: Math.floor(Number(data.duration)),
        totalQuestions: questionsData.length,
        negativeMark: Number(data.negativeMark),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        subject: selectedCourse?.title || data.examName, 
        searchTags: data.examName
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        examId,
        examDataPayload
      );

      const questionPromises = questionsData.map(async (q) => {
          const options = q.options || [];
          let ansIndex = 0;
          
          const idx = options.indexOf(q.answer);
          if (idx !== -1) {
              ansIndex = idx + 1;
          } else if (q.answer.startsWith("Option ")) {
              const char = q.answer.split(" ")[1];
              ansIndex = char.charCodeAt(0) - 64;
          } else if (q.answer.length === 1 && /^[A-D]$/i.test(q.answer)) {
              ansIndex = q.answer.toUpperCase().charCodeAt(0) - 64;
          }

          if (ansIndex < 1 || ansIndex > 4) ansIndex = 1;

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
    } catch (error) {
      const err = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold">Exam & Question Management</h1>
            <p className="text-muted-foreground">Manage your exams and questions from here.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Create New Exam</CardTitle>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="courseId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Target Course (Batch)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {coursesLoading ? (
                                        <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                                    ) : courses?.map((course) => (
                                    <SelectItem key={course.$id} value={course.$id}>
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
                                <FormLabel>Exam Title</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Physics Chapter 1 Quiz" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

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
                            <FormLabel>Duration (Minutes)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
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
                            <FormLabel>Negative Marking (per wrong ans)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">Questions</h3>
                            <div className="flex bg-muted p-1 rounded-lg">
                                <Button 
                                    type="button"
                                    variant={form.watch('uploadMode') === 'json' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => form.setValue('uploadMode', 'json')}
                                    className="gap-2"
                                >
                                    <FileJson size={14} /> JSON
                                </Button>
                                <Button 
                                    type="button"
                                    variant={form.watch('uploadMode') === 'manual' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => form.setValue('uploadMode', 'manual')}
                                    className="gap-2"
                                >
                                    <LayoutList size={14} /> Manual
                                </Button>
                            </div>
                        </div>

                        {form.watch('uploadMode') === 'json' ? (
                            <FormField
                                control={form.control}
                                name="questionsJson"
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                    <Textarea
                                        placeholder={jsonFormatPlaceholder}
                                        className="min-h-[300px] font-mono text-xs"
                                        {...field}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        ) : (
                            <div className="space-y-6">
                                {fields.map((field, index) => (
                                    <Card key={field.id} className="relative overflow-hidden border-2">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                        <CardHeader className="py-3 flex flex-row items-center justify-between bg-muted/30">
                                            <CardTitle className="text-sm font-bold">Question {index + 1}</CardTitle>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <FormField
                                                control={form.control}
                                                name={`questions.${index}.question`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>The Question</FormLabel>
                                                        <FormControl><Input placeholder="What is...?" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[0, 1, 2, 3].map((optIdx) => (
                                                    <FormField
                                                        key={optIdx}
                                                        control={form.control}
                                                        name={`questions.${index}.options.${optIdx}`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Option {String.fromCharCode(65 + optIdx)}</FormLabel>
                                                                <FormControl><Input {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`questions.${index}.answer`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Correct Answer</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select correct option" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value={form.getValues(`questions.${index}.options.0`) || "Option A"}>Option A</SelectItem>
                                                                    <SelectItem value={form.getValues(`questions.${index}.options.1`) || "Option B"}>Option B</SelectItem>
                                                                    <SelectItem value={form.getValues(`questions.${index}.options.2`) || "Option C"}>Option C</SelectItem>
                                                                    <SelectItem value={form.getValues(`questions.${index}.options.3`) || "Option D"}>Option D</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => append({ question: '', options: ['', '', '', ''], answer: '' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                        )}
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg font-bold">
                        {isLoading ? 'Processing...' : 'Save Exam & Questions'}
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Exams ({existingExams?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {examsLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : existingExams && existingExams.length > 0 ? (
                        <div className="space-y-4">
                            {existingExams.map((exam) => (
                                <div key={exam.$id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold truncate text-sm">{exam.title}</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{exam.courseName || 'General'}</p>
                                        <p className="text-[10px] text-muted-foreground">{exam.totalQuestions} Questions</p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => handleDeleteExam(exam.$id)}
                                        disabled={isLoading}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground text-sm">No exams found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Alert variant="destructive" className="bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase">Critical Action</AlertTitle>
                <AlertDescription className="text-[10px]">
                    Deleting an exam permanently removes all associated data.
                </AlertDescription>
            </Alert>
        </div>
      </div>
    </div>
  );
}
