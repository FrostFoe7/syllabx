'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useDatabases, appwriteConfig, useCollection } from '@/appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { Course, Category } from '@/types';
import { Switch } from '@/components/ui/switch';

const courseSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  pricingType: z.enum(['free', 'paid']),
  price: z.string().optional(),
  description: z.string().min(10, 'Description is too short'),
  image: z.string().url('Invalid image URL'),
  disabled: z.boolean().default(false),
  startDate: z.string().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
}).refine((data) => {
  if (data.pricingType === 'paid' && (!data.price || data.price.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Price is required for paid courses",
  path: ["price"],
});

type CourseValues = z.infer<typeof courseSchema>;

export default function CourseEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const databases = useDatabases();
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: course, isLoading } = useDoc<Course>(
    appwriteConfig.coursesCollectionId,
    id
  );

  const { data: categories } = useCollection<Category>(appwriteConfig.categoriesCollectionId);

  const form = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      pricingType: 'free',
      price: '',
      description: '',
      image: '',
      disabled: false,
      startDate: '',
      categoryId: ''
    }
  });

  const pricingType = form.watch('pricingType');

  React.useEffect(() => {
    if (course) {
      const currentPrice = course.price || '';
      const isPaid = currentPrice.toUpperCase() !== 'FREE' && 
                     currentPrice.toUpperCase() !== 'EXPIRED' && 
                     currentPrice !== '';
      
      // Extract only numbers from price for the input field
      const displayPrice = isPaid ? currentPrice.replace(/[^0-9]/g, '') : '';
      
      form.reset({
        title: course.title,
        pricingType: isPaid ? 'paid' : 'free',
        price: displayPrice,
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
      let finalPrice = 'FREE';
      if (data.pricingType === 'paid' && data.price) {
          const cleanPrice = data.price.replace('৳', '').trim();
          finalPrice = `৳${cleanPrice}`;
      }

      const updateData = {
          ...data,
          price: finalPrice
      };
      
      // @ts-expect-error - removing pricingType which is not in the DB schema
      delete updateData.pricingType;

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.coursesCollectionId,
        id,
        updateData
      );
      toast({ title: 'Success', description: 'Course updated successfully' });
      router.push('/admin/courses');
    } catch (error) {
      const appErr = error as { message?: string };
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
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
              </div>

              {pricingType === 'paid' && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Amount)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!categories ? (
                              <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                          ) : (
                            categories.map((cat) => (
                              <SelectItem key={cat.$id} value={cat.slug}>
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
