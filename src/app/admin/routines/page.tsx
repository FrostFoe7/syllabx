'use client';

import * as React from 'react';
import { useCollection, useDatabases, appwriteConfig } from '@/appwrite';
import { Models, ID, Query } from 'appwrite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Loader2, CalendarPlus } from 'lucide-react';

interface Routine extends Models.Document {
  courseId: string;
  courseName?: string;
  date: string;
  topic: string;
  time?: string;
}

interface Course extends Models.Document {
  title: string;
  slug: string;
}

const routineSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  date: z.string().min(1, 'Date is required'),
  topic: z.string().min(3, 'Topic is required'),
  time: z.string().optional(),
});

type RoutineFormValues = z.infer<typeof routineSchema>;

export default function AdminRoutinesPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRoutine, setEditingRoutine] = React.useState<Routine | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const { toast } = useToast();
  const databases = useDatabases();
  const { data: routines, isLoading: routinesLoading } = useCollection<Routine>(appwriteConfig.routinesCollectionId, [Query.orderDesc('$createdAt')]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(appwriteConfig.coursesCollectionId);

  const form = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      courseId: '',
      date: '',
      topic: '',
      time: '',
    },
  });
  
  const handleOpenDialog = (routine: Routine | null = null) => {
    setEditingRoutine(routine);
    form.reset(routine ? {
      courseId: routine.courseId,
      date: routine.date,
      topic: routine.topic,
      time: routine.time || '',
    } : {
      courseId: '',
      date: '',
      topic: '',
      time: 'সকাল ১০টা - রাত ১০টা',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RoutineFormValues) => {
    setIsSaving(true);
    try {
        const selectedCourse = courses?.find(c => c.$id === data.courseId);
        const payload = { ...data, courseName: selectedCourse?.title || 'Unknown' };

        if (editingRoutine) {
            await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, editingRoutine.$id, payload);
            toast({ title: 'Success', description: 'Routine item updated.' });
        } else {
            await databases.createDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, ID.unique(), payload);
            toast({ title: 'Success', description: 'Routine item created.' });
        }
        setDialogOpen(false);
    } catch (error) {
        const err = error as { message?: string };
        toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to save routine item.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this routine item?')) return;
    try {
        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, routineId);
        toast({ title: 'Success', description: 'Routine item deleted.' });
    } catch (error) {
        const err = error as { message?: string };
        toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete item.' });
    }
  };
  
  const getCourseName = (courseId: string) => courses?.find(c => c.$id === courseId)?.title || courseId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Routine Management</h1>
          <p className="text-muted-foreground">Add, edit, or delete course routines.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus /> Add Routine Item
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoutine ? 'Edit Routine Item' : 'Create New Routine Item'}</DialogTitle>
            <DialogDescription>Fill in the details for the course routine.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger></FormControl>
                        <SelectContent>{coursesLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : courses?.map(c => <SelectItem key={c.$id} value={c.$id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input placeholder="e.g., February 1st, 2026" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="topic" render={({ field }) => (<FormItem><FormLabel>Topic / Subject</FormLabel><FormControl><Input placeholder="e.g., Thermodynamics" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Time (Optional)</FormLabel><FormControl><Input placeholder="e.g., 10 AM - 10 PM" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                  <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="mt-6">
          {routinesLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : routines && routines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routines.map((item) => (
                  <TableRow key={item.$id}>
                    <TableCell className="font-medium">{getCourseName(item.courseId)}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.topic}</TableCell>
                    <TableCell>{item.time || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.$id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <CalendarPlus className="mx-auto h-12 w-12 text-gray-300" />
                <p className="text-muted-foreground mt-4 mb-4">No routine items found.</p>
                <Button onClick={() => handleOpenDialog()}>Add First Routine Item</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
