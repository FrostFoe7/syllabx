'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ID } from 'appwrite';
import { useDatabases, appwriteConfig, useCollection } from '@/appwrite';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Category } from '@/types';

const courseSchema = z.object({
  title: z.string().min(3, 'Course title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  pricingType: z.enum(['free', 'paid']),
  price: z.string().optional(),
  image: z.string().url('Please provide a valid image URL'),
  features: z.string().optional(),
  slug: z.string().optional(),
  startDate: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
}).refine((data) => {
  if (data.pricingType === 'paid' && (!data.price || data.price.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Price is required for paid courses",
  path: ["price"],
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  const [isLoading, setIsLoading] = useState(false);

  const { data: categories } = useCollection<Category>(appwriteConfig.categoriesCollectionId);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      pricingType: 'free',
      price: '',
      image: '',
      features: '',
      slug: '',
      startDate: '',
      categoryId: '',
    },
  });

  const pricingType = form.watch('pricingType');

  const onSubmit: SubmitHandler<CourseFormValues> = async (data) => {
    setIsLoading(true);
    try {
      let finalPrice = 'FREE';
      if (data.pricingType === 'paid' && data.price) {
          const cleanPrice = data.price.replace('৳', '').trim();
          finalPrice = `৳${cleanPrice}`;
      }

      const courseData = {
        title: data.title,
        description: data.description,
        price: finalPrice,
        image: data.image,
        features: data.features ? data.features.split('\n').filter(f => f.trim()) : [],
        slug: data.slug || data.title.toLowerCase().replace(/\s+/g, '-'),
        startDate: data.startDate || new Date().toISOString(),
        disabled: false,
        createdAt: new Date().toISOString(),
        categoryId: data.categoryId || '',
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.coursesCollectionId,
        ID.unique(),
        courseData
      );

      toast({
        title: 'Success',
        description: 'Course created successfully!',
      });

      router.push('/admin/courses');
    } catch (error) {
      const appwriteErr = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Error',
        description: appwriteErr.message || 'Failed to create course',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground">
            Add a new course to the platform
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>
            Fill in the course details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Advanced JavaScript" {...field} />
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
                      <Textarea
                        placeholder="Describe the course content and learning outcomes"
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {pricingType === 'paid' && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Amount)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 700" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.$id} value={cat.slug}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Course Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/course-image.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="auto-generated from title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Features (Optional, one per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Live Classes&#10;Doubt Solving&#10;Practice Tests"
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </Button>
                <Link href="/admin/courses">
                  <Button variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
