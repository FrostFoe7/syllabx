'use client';

import { useCollection, useDatabases, appwriteConfig } from '@/appwrite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Models } from 'appwrite';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/types';

interface Student extends Models.Document {
    name: string;
    email: string;
    phone?: string;
    createdAt?: string;
    enrolledCourses: string[]; // Array of Course IDs
}

export default function AdminStudentsPage() {
  const { data: students, isLoading: studentsLoading, mutate: refreshStudents } = useCollection<Student>(
    appwriteConfig.usersCollectionId
  );
  const { data: courses } = useCollection<Course>(
    appwriteConfig.coursesCollectionId
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredStudents = useMemo(() => {
    return students?.filter(student => 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm)
    ) || [];
  }, [students, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">
            Manage student enrollments and access.
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
                    placeholder="Search students by name, email, or phone..."
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          
          {studentsLoading ? (
               <div className="space-y-2">
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
               </div>
          ) : filteredStudents.length > 0 ? (
               <div className="rounded-md border">
                   <div className="grid grid-cols-1 md:grid-cols-5 p-4 font-medium border-b bg-muted/50 text-sm gap-4">
                       <div className="md:col-span-1">Name</div>
                       <div className="md:col-span-1">Login ID</div>
                       <div className="md:col-span-1">Joined</div>
                       <div className="md:col-span-1 text-center">Enrolled</div>
                       <div className="md:col-span-1 text-right">Actions</div>
                   </div>
                   {filteredStudents.map((student) => (
                       <div key={student.$id} className="grid grid-cols-1 md:grid-cols-5 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors items-center gap-4">
                           <div className="font-medium">
                                {student.name}
                                <div className="text-xs text-muted-foreground md:hidden">{student.email}</div>
                           </div>
                           <div className="text-sm text-muted-foreground">
                                {student.phone || 'N/A'}
                                <div className="text-xs opacity-50 hidden md:block">{student.email}</div>
                           </div>
                           <div className="text-sm text-muted-foreground">
                               {student.createdAt ? format(new Date(student.createdAt), 'PP') : 'N/A'}
                           </div>
                           <div className="text-sm text-center">
                               <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                   {student.enrolledCourses?.length || 0} Courses
                               </span>
                           </div>
                           <div className="text-right">
                               <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedStudent(student);
                                        setIsDialogOpen(true);
                                    }}
                                >
                                   Manage Access
                               </Button>
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

      <EnrollmentDialog 
        student={selectedStudent} 
        isOpen={isDialogOpen} 
        setIsOpen={setIsDialogOpen}
        allCourses={courses || []}
        refreshStudents={refreshStudents}
      />
    </div>
  );
}

function EnrollmentDialog({ 
    student, 
    isOpen, 
    setIsOpen, 
    allCourses, 
    refreshStudents 
}: { 
    student: Student | null, 
    isOpen: boolean, 
    setIsOpen: (v: boolean) => void,
    allCourses: Course[],
    refreshStudents: () => void
}) {
    const { toast } = useToast();
    const databases = useDatabases();
    const [isSaving, setIsSaving] = useState(false);
    // Local state to track changes before saving
    const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

    // Reset local state when student changes
    useMemo(() => {
        if (student) {
            setEnrolledIds(student.enrolledCourses || []);
        }
    }, [student]);

    const handleToggle = (courseId: string, isChecked: boolean) => {
        setEnrolledIds(prev => {
            if (isChecked) {
                return [...prev, courseId];
            } else {
                return prev.filter(id => id !== courseId);
            }
        });
    };

    const handleSave = async () => {
        if (!student) return;
        setIsSaving(true);
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.usersCollectionId,
                student.$id,
                {
                    enrolledCourses: enrolledIds
                }
            );
            toast({ title: "Enrollments updated successfully" });
            refreshStudents();
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to update enrollments" });
        } finally {
            setIsSaving(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Enrollments</DialogTitle>
                    <DialogDescription>
                        Control course access for <span className="font-bold text-foreground">{student.name}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {allCourses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No courses available.</p>
                    ) : (
                        allCourses.map(course => {
                            const isEnrolled = enrolledIds.includes(course.$id);
                            return (
                                <div key={course.$id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                        <Label htmlFor={course.$id} className="font-semibold cursor-pointer">
                                            {course.title}
                                        </Label>
                                        <div className="text-xs text-muted-foreground flex gap-2">
                                            <span>{course.price}</span>
                                            {isEnrolled && <span className="text-green-600 flex items-center gap-1"><Check size={10} /> Active</span>}
                                        </div>
                                    </div>
                                    <Switch
                                        id={course.$id}
                                        checked={isEnrolled}
                                        onCheckedChange={(c) => handleToggle(course.$id, c)}
                                    />
                                </div>
                            )
                        })
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
