'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, BookOpen, BarChart3 } from 'lucide-react';
import { useUser, useCollection, appwriteConfig } from '@/appwrite';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
  const { user } = useUser();
  const { data: students, isLoading: loadingStudents } = useCollection(appwriteConfig.usersCollectionId);
  const { data: exams, isLoading: loadingExams } = useCollection(appwriteConfig.examsCollectionId);
  const { data: results, isLoading: loadingResults } = useCollection(appwriteConfig.resultsCollectionId);

  const stats = [
    { title: 'মোট ছাত্র', value: students?.length || 0, icon: Users, color: 'text-blue-600', loading: loadingStudents },
    { title: 'মোট পরীক্ষা', value: exams?.length || 0, icon: BookOpen, color: 'text-green-600', loading: loadingExams },
    { title: 'মোট ফলাফল', value: results?.length || 0, icon: BarChart3, color: 'text-purple-600', loading: loadingResults },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-tiro-bangla">অ্যাডমিন ড্যাশবোর্ড</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <CardTitle>স্বাগতম, {user?.name || 'Admin'}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-tiro-bangla">
            এটি আপনার প্ল্যাটফর্মের কেন্দ্রীয় নিয়ন্ত্রণ কক্ষ। এখান থেকে আপনি কোর্স, শিক্ষার্থী এবং পরীক্ষার সকল তথ্য পরিচালনা করতে পারবেন।
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
