'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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
import { ID, Query } from 'appwrite';
import { useDatabases, useCollection, appwriteConfig } from '@/appwrite';
import { ExamFormSchema, ExamFormValues } from '../schema';
import { Trash2, Plus, FileJson, LayoutList, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Course, Exam, Question } from '@/types';
import Link from 'next/link';
import { formatISO, parseISO, format } from 'date-fns';

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

export default function EditExamPage(props: { params: Promise<{ examId: string }> }) {
  const params = use(props.params);
  const examId = params.examId;
  
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(appwriteConfig.coursesCollectionId);
  
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(ExamFormSchema),
    defaultValues: {
      courseId: '',
      examName: '',
      startTime: '',
      endTime: '',
      duration: 60,
      negativeMark: 0.25,
      uploadMode: 'manual',
      questionsJson: '',
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch Exam and Questions
  useEffect(() => {
    async function fetchExamData() {
        try {
            // 1. Fetch Exam Details
            const exam = await databases.getDocument<Exam>(
                appwriteConfig.databaseId, 
                appwriteConfig.examsCollectionId, 
                examId
            );

            // 2. Fetch Questions
            // Note: If > 100 questions, we need pagination, but for now assuming < 100 or increasing limit
            const questionsRes = await databases.listDocuments<Question>(
                appwriteConfig.databaseId,
                appwriteConfig.questionsCollectionId,
                [
                    Query.equal('examId', examId),
                    Query.limit(200) 
                ]
            );

            setExistingQuestions(questionsRes.documents);

            // 3. Populate Form
            form.reset({
                courseId: exam.courseId,
                examName: exam.title,
                startTime: exam.startTime ? format(parseISO(exam.startTime), "yyyy-MM-dd'T'HH:mm") : '',
                endTime: exam.endTime ? format(parseISO(exam.endTime), "yyyy-MM-dd'T'HH:mm") : '',
                duration: exam.duration,
                negativeMark: exam.negativeMark,
                uploadMode: 'manual',
                questions: questionsRes.documents.map(q => {
                    const options = [q.a1, q.a2, q.a3, q.a4];
                    // Map numeric ans (1-4) back to string value
                    const answerValue = options[q.ans - 1] || ''; 
                    
                    return {
                        question: q.q,
                        options: options,
                        answer: answerValue
                    };
                })
            });

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error fetching exam',
                description: 'Could not load exam details.'
            });
            router.push('/admin/questions');
        } finally {
            setIsInitialLoading(false);
        }
    }

    if (examId) {
        fetchExamData();
    }
  }, [examId, databases, form, toast, router]);


  const onSubmit: SubmitHandler<ExamFormValues> = async (data) => {
    if (!confirm("Are you sure you want to update this exam? Old questions will be replaced.")) return;

    setIsSaving(true);
    try {
      let newQuestionsData: QuestionInput[] = [];
      
      if (data.uploadMode === 'json') {
          if (!data.questionsJson) throw new Error("JSON is required in JSON mode");
          newQuestionsData = JSON.parse(data.questionsJson);
      } else {
          newQuestionsData = (data.questions || []) as QuestionInput[];
      }

      if (!Array.isArray(newQuestionsData) || newQuestionsData.length === 0) {
          throw new Error("You must have at least one question");
      }

      const selectedCourse = courses?.find((c: Course) => c.$id === data.courseId);

      // 1. Update Exam Document
      const examDataPayload = {
        title: data.examName,
        courseId: data.courseId,
        courseName: selectedCourse?.title || 'Unknown',
        duration: Math.floor(Number(data.duration)),
        totalQuestions: newQuestionsData.length,
        negativeMark: Number(data.negativeMark),
        startTime: formatISO(new Date(data.startTime)),
        endTime: formatISO(new Date(data.endTime)),
        subject: selectedCourse?.title || data.examName, 
        searchTags: data.examName
      };

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        examId,
        examDataPayload
      );

      // 2. Handle Questions Update
      // Strategy: Delete all existing questions and recreate them. 
      // Upserting is complex because question IDs change or need tracking.
      // Deleting is safer for ensuring consistency with the new list.
      
      // Delete old questions
      const existingIds = existingQuestions.map(q => q.$id);
      // Chunk deletions
      const delChunkSize = 10;
      for (let i = 0; i < existingIds.length; i += delChunkSize) {
          const chunk = existingIds.slice(i, i + delChunkSize);
          await Promise.all(chunk.map(id => 
            databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId, id)
          ));
      }

      // Create new questions
      const chunkSize = 5;
      for (let i = 0; i < newQuestionsData.length; i += chunkSize) {
          const chunk = newQuestionsData.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (q) => {
            const options = q.options || [];
            let ansIndex = 0;
            
            // Determine answer index
            const idx = options.indexOf(q.answer);
            if (idx !== -1) {
                ansIndex = idx + 1;
            } else if (q.answer.startsWith("Option ")) {
                const char = q.answer.split(" ")[1];
                ansIndex = char.charCodeAt(0) - 64;
            } else if (q.answer.length === 1 && /^[A-D]$/i.test(q.answer)) {
                ansIndex = q.answer.toUpperCase().charCodeAt(0) - 64;
            }

            if (ansIndex < 1 || ansIndex > 4) ansIndex = 1; // Default fallback

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
          }));
      }
      
      toast({
        title: 'Success!',
        description: 'Exam updated successfully.',
      });
      
      router.push('/admin/questions');
      router.refresh();

    } catch (error) {
      const err = error as { message?: string };
      console.error("Update error:", err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/questions">
            <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold">Edit Exam</h1>
            <p className="text-muted-foreground">Update exam details and questions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Configuration</CardTitle>
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
                            ) : courses?.map((course: Course) => (
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
                    <h3 className="text-lg font-bold">Questions ({fields.length})</h3>
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

              <div className="sticky bottom-4">
                  <Button type="submit" disabled={isSaving} className="w-full h-14 text-lg font-bold shadow-xl">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                      )}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
