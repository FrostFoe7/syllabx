
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useDatabases, appwriteConfig } from '@/appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { Models } from 'appwrite';
import { Switch } from '@/components/ui/switch';

const courseSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  price: z.string().min(1, 'Price is required'),
  description: z.string().min(10, 'Description is too short'),
  image: z.string().url('Invalid image URL'),
  disabled: z.boolean().default(false),
  startDate: z.string().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
});

type CourseValues = z.infer<typeof courseSchema>;

interface CourseDoc extends Models.Document {
    title: string;
    price: string;
    description: string;
    image: string;
    disabled: boolean;
    startDate?: string;
    categoryId: string;
}

export default function CourseEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: course, isLoading } = useDoc<CourseDoc>(
    appwriteConfig.coursesCollectionId,
    id
  );

  const form = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      price: '',
      description: '',
      image: '',
      disabled: false,
      startDate: '',
      categoryId: ''
    }
  });

  React.useEffect(() => {
    if (course) {
      form.reset({
        title: course.title,
        price: course.price,
        description: course.description,
        image: course.image,
        disabled: !!course.disabled,
        startDate: course.startDate || '',
        categoryId: course.categoryId
      });
    }
  }, [course, form]);

  const onSubmit: SubmitHandler<CourseValues> = async (data) => {
    setIsSaving(true);
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.coursesCollectionId,
        id,
        data
      );
      toast({ title: 'Success', description: 'Course updated successfully' });
      router.push('/admin/courses');
    } catch (error) {
      const appErr = error as { message?: string };
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: appErr.message || 'Failed to update course',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Course not found</h2>
        <Link href="/admin/courses">
          <Button variant="link">Back to courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Course</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Update the information for &quot;{course.title}&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. FREE or ৳700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. hsc-26" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date/Status (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. February 1st" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Disable Course</FormLabel>
                      <CardDescription>
                        Hide this course from the public list.
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving} className="w-full gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
