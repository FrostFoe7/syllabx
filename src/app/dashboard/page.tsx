'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useUser, useDatabases, useDoc, useCollection, appwriteConfig } from '@/appwrite';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Models } from 'appwrite';

interface UserData extends Models.Document {
    enrolledCourses: string[];
    name: string;
    email: string;
    phone: string;
    institution?: string;
}

interface Course extends Models.Document {
    title: string;
    image: string;
    slug: string;
    startDate?: string;
    imageHint?: string;
}

export default function DashboardCoursesPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const databases = useDatabases();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const { data: userData, isLoading: isDataLoading } = useDoc<UserData>(
    appwriteConfig.usersCollectionId, 
    user?.$id || null
  );

  const { data: allCourses, isLoading: isCoursesLoading } = useCollection<Course>(
      appwriteConfig.coursesCollectionId
  );

  // Handle auto-enrollment from URL query parameter
  useEffect(() => {
    const enrollCourse = async () => {
      const courseToEnroll = searchParams.get('course');
      // Exit if no course in URL, or if user/data is still loading
      if (!courseToEnroll || !user || !databases || isDataLoading) {
        return;
      }

      const decodedCourseName = decodeURIComponent(courseToEnroll);
      const collectionId = appwriteConfig.usersCollectionId;
      const documentId = user.$id;

      // Check if already enrolled using data from our hook
      if (userData?.enrolledCourses?.includes(decodedCourseName)) {
        // Just remove the query param and do nothing else
        router.replace('/dashboard');
        return;
      }

      try {
        // If userData is not null, document exists, so update it.
        if (userData) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            collectionId,
            documentId,
            {
              enrolledCourses: [...(userData.enrolledCourses || []), decodedCourseName]
            }
          );
        } else {
          // If userData is null, document doesn't exist, so create it.
          const phoneFromEmail = user.email.startsWith('user_') && user.email.endsWith('@syllabx.com')
            ? user.email.substring(5, user.email.indexOf('@'))
            : '';

          await databases.createDocument(
            appwriteConfig.databaseId,
            collectionId,
            documentId,
            {
                userId: user.$id,
                name: user.name,
                email: user.email,
                createdAt: new Date().toISOString(),
                enrolledCourses: [decodedCourseName],
                phone: phoneFromEmail,
            }
          );
        }
        toast({
          title: "Success",
          description: `Enrolled in ${decodedCourseName} successfully!`,
        });
      } catch (e) {
          const err = e as { message?: string };
          toast({
              variant: "destructive",
              title: "Error",
              description: err.message || "There was a problem enrolling in the course.",
          });
      } finally {
        // Clean up URL
        router.replace('/dashboard');
      }
    };

    if (!isUserLoading) {
        enrollCourse();
    }
  }, [user, isUserLoading, isDataLoading, userData, searchParams, databases, router, toast]);

  if (isUserLoading || isDataLoading || isCoursesLoading) {
    return (
       <>
        <h1 className="text-3xl font-bold mb-8 font-tiro-bangla">আমার কোর্সসমূহ</h1>
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="overflow-hidden shadow-lg bg-white rounded-2xl flex flex-col md:flex-row">
              <div className="md:w-1/3 flex-shrink-0 bg-gray-100">
                <Skeleton className="w-full h-full min-h-[200px]" />
              </div>
              <div className="p-6 flex flex-col justify-between md:w-2/3">
                <div>
                  <Skeleton className="h-7 w-3/4 mb-4" />
                </div>
                <div className="mt-6 self-start md:self-end">
                  <Skeleton className="h-11 w-36" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const enrolledCourseNames = userData?.enrolledCourses || [];
  const enrolledCourses = allCourses?.filter((course: Course) => enrolledCourseNames.includes(course.title)) || [];

  return (
    <>
      <h1 className="text-3xl font-bold mb-8 font-tiro-bangla">আমার কোর্সসমূহ</h1>
      
      {enrolledCourses.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {enrolledCourses.map((course) => (
            <Card key={course.$id} className="overflow-hidden shadow-lg transition-all hover:shadow-xl bg-white rounded-2xl flex flex-col md:flex-row">
              <div className="md:w-1/3 flex-shrink-0">
                <Image
                  src={course.image}
                  alt={course.title}
                  width={250}
                  height={250}
                  className="object-cover w-full h-full"
                  data-ai-hint={course.imageHint}
                />
              </div>
              <div className="p-6 grow md:w-2/3">
                <div className="flex justify-between items-start">
                  <div className="pr-4">
                    <h3 className="text-xl font-bold font-tiro-bangla mb-2">{course.title}</h3>
                    {course.startDate && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="mr-2 h-4 w-4 text-accent" />
                        <span className="font-tiro-bangla">{course.startDate}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/courses/${course.slug}`} className="flex-shrink-0">
                    <Button className="bg-black text-white hover:bg-gray-800 font-montserrat">রুটিন দেখুন</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
          <Card className="bg-white rounded-xl shadow-md text-center py-10">
              <CardHeader className="flex flex-col items-center">
                  <div className="bg-yellow-100 p-4 rounded-full mb-4">
                      <BookOpen className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="font-tiro-bangla text-2xl">এখনো কোনো কোর্স এনরোল করেননি</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-gray-500 font-tiro-bangla mb-6">আপনার পছন্দের কোর্সটি বেছে নিন এবং শেখা শুরু করুন।</p>
                  <Link href="/#courses-section">
                      <Button className="bg-primary text-black hover:bg-yellow-500 font-montserrat">সকল কোর্স দেখুন</Button>
                  </Link>
              </CardContent>
          </Card>
      )}
    </>
  );
}
