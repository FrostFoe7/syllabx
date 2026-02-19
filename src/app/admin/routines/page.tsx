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
  CardHeader,
  CardTitle,
  CardDescription,
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
    DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Loader2, CalendarPlus, ListPlus, Trash } from 'lucide-react';

const bengaliToEnglishDigits = (str: string) => {
  const digits: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (w) => digits[w]);
};

const bengaliMonths: { [key: string]: number } = {
  'জানুয়ারি': 0,
  'ফেব্রুয়ারি': 1,
  'মার্চ': 2,
  'এপ্রিল': 3,
  'মে': 4,
  'জুন': 5,
  'জুলাই': 6,
  'আগস্ট': 7,
  'সেপ্টেম্বর': 8,
  'অক্টোবর': 9,
  'নভেম্বর': 10,
  'ডিসেম্বর': 11,
};

const parseBengaliDate = (dateStr: string) => {
  try {
    const normalizedDate = dateStr.replace(',', '');
    const parts = normalizedDate.split(/\s+/);
    if (parts.length < 2) return new Date(0);
    const day = parseInt(bengaliToEnglishDigits(parts[0]));
    const monthName = parts[1];
    const month = bengaliMonths[monthName] !== undefined ? bengaliMonths[monthName] : 0;
    let year = new Date().getFullYear();
    if (parts.length >= 3) {
      year = parseInt(bengaliToEnglishDigits(parts[2]));
    }
    return new Date(year, month, day);
  } catch {
    return new Date(0);
  }
};

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
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [editingRoutine, setEditingRoutine] = React.useState<Routine | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [bulkText, setBulkText] = React.useState('');

  const { toast } = useToast();
  const databases = useDatabases();
  
  const { data: allRoutines, isLoading: routinesLoading, mutate: refreshRoutines } = useCollection<Routine>(
      appwriteConfig.routinesCollectionId, 
      [Query.limit(500), Query.orderDesc('$createdAt')]
  );
  
  const { data: courses } = useCollection<Course>(appwriteConfig.coursesCollectionId);

  const filteredRoutines = React.useMemo(() => {
    if (!allRoutines) return [];
    const filtered = selectedCourseId 
        ? allRoutines.filter(r => r.courseId === selectedCourseId)
        : allRoutines;
    return [...filtered].sort((a, b) => parseBengaliDate(a.date).getTime() - parseBengaliDate(b.date).getTime());
  }, [allRoutines, selectedCourseId]);

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
      courseId: selectedCourseId || '',
      date: '',
      topic: '',
      time: 'সকাল ১০টা - রাত ১০টা',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RoutineFormValues) => {
    setIsSaving(true);
    try {
        const selectedCourse = courses?.find((c: Course) => c.$id === data.courseId);
        const payload = { ...data, courseName: selectedCourse?.title || 'Unknown' };

        if (editingRoutine) {
            await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, editingRoutine.$id, payload);
            toast({ title: 'Success', description: 'Routine item updated.' });
        } else {
            await databases.createDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, ID.unique(), payload);
            toast({ title: 'Success', description: 'Routine item created.' });
        }
        refreshRoutines();
        setDialogOpen(false);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to save routine item.';
        toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedCourseId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a course first.' });
        return;
    }
    if (!bulkText.trim()) return;

    setIsSaving(true);
    const lines = bulkText.split('\n').filter(line => line.trim());
    const selectedCourse = courses?.find((c: Course) => c.$id === selectedCourseId);
    
    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        // Expected format: "Date | Topic | Time" or "Date | Topic"
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 2) {
            failCount++;
            continue;
        }

        try {
            await databases.createDocument(
                appwriteConfig.databaseId, 
                appwriteConfig.routinesCollectionId, 
                ID.unique(), 
                {
                    courseId: selectedCourseId,
                    courseName: selectedCourse?.title || 'Unknown',
                    date: parts[0],
                    topic: parts[1],
                    time: parts[2] || 'সকাল ১০টা - রাত ১০টা'
                }
            );
            successCount++;
        } catch {
            failCount++;
        }
    }

    toast({
        title: 'Bulk Upload Complete',
        description: `Successfully added ${successCount} items. ${failCount} failed.`,
    });
    
    setBulkText('');
    setBulkDialogOpen(false);
    refreshRoutines();
    setIsSaving(false);
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm('Are you sure you want to delete this routine item?')) return;
    try {
        await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, routineId);
        toast({ title: 'Success', description: 'Routine item deleted.' });
        refreshRoutines();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete item.';
        toast({ variant: 'destructive', title: 'Error', description: message });
    }
  };

  const handleDeleteAll = async () => {
      if (!selectedCourseId) return;
      const courseName = courses?.find(c => c.$id === selectedCourseId)?.title;
      if (!confirm(`Are you sure you want to delete ALL routine items for "${courseName}"?`)) return;

      setIsSaving(true);
      try {
          const toDelete = allRoutines?.filter(r => r.courseId === selectedCourseId) || [];
          for (const item of toDelete) {
              await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.routinesCollectionId, item.$id);
          }
          toast({ title: 'Success', description: `Deleted all items for ${courseName}.` });
          refreshRoutines();
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to delete items.';
          toast({ variant: 'destructive', title: 'Error', description: message });
      } finally {
          setIsSaving(false);
      }
  };
  
  const getCourseName = (courseId: string) => courses?.find((c: Course) => c.$id === courseId)?.title || courseId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-tiro-bangla">রুটিন ম্যানেজমেন্ট</h1>
          <p className="text-muted-foreground">কোর্সের রুটিন যোগ, এডিট বা ডিলিট করুন।</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="gap-2">
                <ListPlus size={18} /> Bulk Add
            </Button>
            <Button onClick={() => handleOpenDialog()} className="gap-2 bg-primary text-black hover:bg-yellow-500">
                <Plus size={18} /> Add Item
            </Button>
        </div>
      </div>

      <Card className="bg-white shadow-sm border-yellow-100">
          <CardHeader className="pb-3">
              <CardTitle className="text-lg font-tiro-bangla">কোর্স সিলেক্ট করুন</CardTitle>
              <CardDescription>প্রথমে একটি কোর্স সিলেক্ট করুন রুটিন দেখার বা যোগ করার জন্য।</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                <SelectTrigger className="w-full md:w-[400px] h-12 text-lg">
                    <SelectValue placeholder="কোর্স নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all_courses_view">সব কোর্সের রুটিন (View All)</SelectItem>
                    {courses?.map((c: Course) => (
                        <SelectItem key={c.$id} value={c.$id}>{c.title}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </CardContent>
      </Card>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="sm:max-w-[600px] font-tiro-bangla">
              <DialogHeader>
                  <DialogTitle>বাল্ক রুটিন আপলোড</DialogTitle>
                  <DialogDescription>
                      নিচের ফরম্যাটে রুটিন লিখুন (প্রতি লাইনে একটি): <br/>
                      <code className="bg-gray-100 p-1 rounded text-xs">তারিখ | টপিক | সময় (ঐচ্ছিক)</code>
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <FormLabel>কোর্স</FormLabel>
                      <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                          <SelectContent>{courses?.map((c: Course) => <SelectItem key={c.$id} value={c.$id}>{c.title}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <FormLabel>রুটিন ডাটা</FormLabel>
                      <Textarea 
                        placeholder="১ ফেব্রুয়ারি | তাপগতিবিদ্যা | সকাল ১০টা - রাত ১০টা&#10;৩ ফেব্রুয়ারি | স্থির তড়িৎ" 
                        className="min-h-[200px] font-mono"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleBulkUpload} disabled={isSaving || !selectedCourseId}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload All
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="font-tiro-bangla">
          <DialogHeader>
            <DialogTitle>{editingRoutine ? 'রুটিন এডিট করুন' : 'নতুন রুটিন যোগ করুন'}</DialogTitle>
            <DialogDescription>রুটিনের বিস্তারিত তথ্য প্রদান করুন।</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>কোর্স</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger></FormControl>
                        <SelectContent>{courses?.map((c: Course) => <SelectItem key={c.$id} value={c.$id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>তারিখ</FormLabel><FormControl><Input placeholder="উদা: ১ ফেব্রুয়ারি, ২০২৬" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="topic" render={({ field }) => (<FormItem><FormLabel>বিষয়/টপিক</FormLabel><FormControl><Input placeholder="উদা: তাপগতিবিদ্যা" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>সময় (ঐচ্ছিক)</FormLabel><FormControl><Input placeholder="উদা: সকাল ১০টা - রাত ১০টা" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                  <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving} className="bg-primary text-black hover:bg-yellow-500">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card className="bg-white shadow-sm border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
                <CardTitle className="font-tiro-bangla">রুটিন লিস্ট</CardTitle>
                <CardDescription>
                    {selectedCourseId && selectedCourseId !== 'all_courses_view' 
                        ? `"${getCourseName(selectedCourseId)}" এর রুটিন দেখা হচ্ছে।`
                        : "সব কোর্সের রুটিন দেখা হচ্ছে।"}
                </CardDescription>
            </div>
            {selectedCourseId && selectedCourseId !== 'all_courses_view' && filteredRoutines.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={isSaving} className="gap-2">
                    <Trash size={16} /> Delete All
                </Button>
            )}
        </CardHeader>
        <CardContent>
          {routinesLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredRoutines.length > 0 ? (
            <div className="rounded-md border border-gray-100 overflow-hidden">
                <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                    <TableHead className="font-bold">Course</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Topic</TableHead>
                    <TableHead className="font-bold">Time</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRoutines.map((item: Routine) => (
                    <TableRow key={item.$id} className="hover:bg-yellow-50/30 transition-colors">
                        <TableCell className="font-medium text-accent">{getCourseName(item.courseId)}</TableCell>
                        <TableCell className="font-tiro-bangla">{item.date}</TableCell>
                        <TableCell className="font-tiro-bangla font-semibold">{item.topic}</TableCell>
                        <TableCell className="font-tiro-bangla text-gray-500">{item.time || 'সকাল ১০টা - রাত ১০টা'}</TableCell>
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} className="hover:bg-yellow-100 hover:text-yellow-700"><Edit size={16} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.$id)} className="text-destructive hover:bg-red-50"><Trash2 size={16} /></Button>
                        </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-gray-50/50">
                <CalendarPlus className="mx-auto h-12 w-12 text-gray-300" />
                <p className="text-muted-foreground mt-4 font-tiro-bangla">এই কোর্সের জন্য কোনো রুটিন পাওয়া যায়নি।</p>
                {selectedCourseId && selectedCourseId !== 'all_courses_view' && (
                    <Button onClick={() => handleOpenDialog()} className="mt-4 bg-primary text-black hover:bg-yellow-500 font-tiro-bangla">রুটিন যোগ করুন</Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
