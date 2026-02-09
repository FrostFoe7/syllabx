'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useDatabases, appwriteConfig } from '@/appwrite';
import { Query } from 'appwrite';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Course } from '@/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function AdminCoursesPage() {
  const { data: dbCourses, isLoading, mutate: refreshCourses } = useCollection<Course>(appwriteConfig.coursesCollectionId, [Query.limit(100)]);
  const databases = useDatabases();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const displayCourses = dbCourses && dbCourses.length > 0 ? dbCourses : [];

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    
    setDeletingId(courseId);
    try {
        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId, courseId);
        toast({ title: 'Success', description: 'Course deleted successfully.' });
        refreshCourses();
    } catch (error) {
        const err = error as { message?: string };
        toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete course.' });
    } finally {
        setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-muted-foreground">
            View and manage courses directly from the database.
          </p>
        </div>
        <Link href="/admin/courses/create">
          <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Course
          </Button>
        </Link>
      </div>

      {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
          </div>
      ) : displayCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayCourses.map((course: Course) => (
                <Card key={course.$id}>
                    <CardHeader className="p-0">
                        <Image src={course.image} alt={course.title} width={400} height={200} className="w-full h-32 object-cover rounded-t-lg" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription className="font-bold text-primary mt-1">{course.price}</CardDescription>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{course.description}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={14} /> {course.disabled ? 'Disabled' : 'Active'}
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/admin/courses/${course.$id}`}>
                                <Button variant="ghost" size="sm" className="gap-1">
                                    <Pencil size={14} />
                                    Edit
                                </Button>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(course.$id)}
                                disabled={deletingId === course.$id}
                            >
                                {deletingId === course.$id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground mb-4">No courses found in database.</p>
              <Link href="/admin/courses/create">
                <Button>Add Your First Course</Button>
              </Link>
          </div>
      )}
    </div>
  );
}
