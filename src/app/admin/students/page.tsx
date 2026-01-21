'use client';

import { useCollection, appwriteConfig } from '@/appwrite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { format } from 'date-fns';

export default function AdminStudentsPage() {
  const { data: students, isLoading } = useCollection<any>(
    appwriteConfig.usersCollectionId
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students?.filter(student => 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">
            View and search all registered students.
          </p>
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>All Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-center py-4">
                <Input
                    placeholder="Search students by name or email..."
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          
          {isLoading ? (
               <div className="space-y-2">
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
               </div>
          ) : filteredStudents.length > 0 ? (
               <div className="rounded-md border">
                   <div className="grid grid-cols-4 p-4 font-medium border-b bg-muted/50">
                       <div>Name</div>
                       <div>Email</div>
                       <div>Phone</div>
                       <div>Joined</div>
                   </div>
                   {filteredStudents.map((student) => (
                       <div key={student.$id} className="grid grid-cols-4 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                           <div className="font-medium">{student.name}</div>
                           <div className="text-sm text-muted-foreground">{student.email}</div>
                           <div className="text-sm text-muted-foreground">{student.phone || 'N/A'}</div>
                           <div className="text-sm text-muted-foreground">
                               {student.createdAt ? format(new Date(student.createdAt), 'PP') : 'N/A'}
                           </div>
                       </div>
                   ))}
               </div>
          ) : (
            <div className="text-center py-10 border rounded-lg">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">Student data will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
