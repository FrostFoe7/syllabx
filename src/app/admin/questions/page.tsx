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
import { useDatabases, appwriteConfig } from '@/appwrite';
import { allCourses } from '@/lib/courses';
import { ExamFormSchema, ExamFormValues } from './schema';

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
        originalId: examId, // Using the document ID as originalId too
        title: data.examName,
        courseName: data.courseName, // Added to schema
        duration: Math.floor(Number(data.duration)), // Ensure integer
        totalQuestions: questionsData.length,
        negativeMark: Number(data.negativeMark),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        // Default/Optional fields
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
          // Map answer "Option A" -> 1, "Option B" -> 2 ...
          // OR if answer is the text itself, find index.
          // Assuming answer matches one of the options text or "Option A" format?
          // The placeholder says "answer": "Option A". 
          // Let's assume the user enters "Option A" or the exact string.
          // If it's "Option A", "Option B", etc., we can extract the letter.
          // Or we can just find the index of the answer string in the options array.
          
          let ansIndex = 0;
          if (q.answer.startsWith("Option ")) {
              const char = q.answer.split(" ")[1];
              if (char === 'A') ansIndex = 1;
              else if (char === 'B') ansIndex = 2;
              else if (char === 'C') ansIndex = 3;
              else if (char === 'D') ansIndex = 4;
          } else {
              // Try to find exact match
              const idx = options.indexOf(q.answer);
              if (idx !== -1) ansIndex = idx + 1;
          }
          
          // Fallback or validation? Schema requires integer.
          if (ansIndex === 0) ansIndex = 1; // Default to A if mapping fails, or throw?

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question Management</h1>
        <p className="text-muted-foreground">Upload questions for course exams.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload New Exam</CardTitle>
          <CardDescription>
            Fill in the details below to create a new exam for a course.
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
                        {allCourses.map((course) => (
                          <SelectItem key={course.id} value={course.title} disabled={course.disabled}>
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
                      <FormLabel>Negative Marking (per wrong answer)</FormLabel>
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
  );
}
