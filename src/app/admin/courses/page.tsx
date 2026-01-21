'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, appwriteConfig } from '@/appwrite';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Plus } from 'lucide-react';

export default function AdminCoursesPage() {
  const { data: dbCourses, isLoading } = useCollection<any>(appwriteConfig.coursesCollectionId);

  const displayCourses = dbCourses && dbCourses.length > 0 ? dbCourses : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-muted-foreground">
            View and manage courses directly from the database.
          </p>
        </div>
        <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Course
        </Button>
      </div>

      {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
          </div>
      ) : displayCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayCourses.map((course: any) => (
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
                        <Button variant="ghost" size="sm">Edit</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground mb-4">No courses found in database.</p>
              <Button>Add Your First Course</Button>
          </div>
      )}
    </div>
  );
}
