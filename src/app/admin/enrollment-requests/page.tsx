'use client';

import { useState } from 'react';
import { Query } from 'appwrite';
import { useCollection, useDatabases, appwriteConfig } from '@/appwrite';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnrollmentRequest, UserData } from '@/types';

export default function EnrollmentRequestsPage() {
    const databases = useDatabases();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data: requests, isLoading, mutate: refreshRequests } = useCollection<EnrollmentRequest>(
        appwriteConfig.enrollmentRequestsCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(100)]
    );

    const filteredRequests = requests?.filter(req => 
        req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.paymentNumber.includes(searchTerm)
    );

    const handleApprove = async (request: EnrollmentRequest) => {
        setProcessingId(request.$id);
        try {
            // 1. Get current user profile
            const userProfile = await databases.getDocument<UserData>(
                appwriteConfig.databaseId,
                appwriteConfig.usersCollectionId,
                request.userId
            );

            const enrolledCourses = userProfile.enrolledCourses || [];
            if (!enrolledCourses.includes(request.courseId)) {
                // 2. Add course to user's enrolledCourses
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.usersCollectionId,
                    request.userId,
                    {
                        enrolledCourses: [...enrolledCourses, request.courseId]
                    }
                );
            }

            // 3. Update request status
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.enrollmentRequestsCollectionId,
                request.$id,
                {
                    status: 'approved'
                }
            );

            toast({
                title: "Approved",
                description: `${request.userName} has been enrolled in ${request.courseName}`,
            });
            refreshRequests();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Something went wrong during approval.";
            toast({
                variant: "destructive",
                title: "Error",
                description: message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (request: EnrollmentRequest) => {
        setProcessingId(request.$id);
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.enrollmentRequestsCollectionId,
                request.$id,
                {
                    status: 'rejected'
                }
            );

            toast({
                title: "Rejected",
                description: `Request from ${request.userName} has been rejected.`,
            });
            refreshRequests();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Something went wrong during rejection.";
            toast({
                variant: "destructive",
                title: "Error",
                description: message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-tiro-bangla">এনরোলমেন্ট রিকোয়েস্ট</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>পেন্ডিং রিকোয়েস্টসমূহ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input 
                                placeholder="নাম, কোর্স বা নম্বর দিয়ে খুঁজুন..." 
                                className="pl-10" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>নাম</TableHead>
                                    <TableHead>কোর্স</TableHead>
                                    <TableHead>পেমেন্ট নম্বর</TableHead>
                                    <TableHead>তারিখ</TableHead>
                                    <TableHead>স্ট্যাটাস</TableHead>
                                    <TableHead className="text-right">অ্যাকশন</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            <Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRequests && filteredRequests.length > 0 ? (
                                    filteredRequests.map((request) => (
                                        <TableRow key={request.$id}>
                                            <TableCell className="font-medium">{request.userName}</TableCell>
                                            <TableCell>{request.courseName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">{request.paymentNumber}</Badge>
                                            </TableCell>
                                            <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    request.status === 'pending' ? 'bg-yellow-500' : 
                                                    request.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                                                )}>
                                                    {request.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {request.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                            onClick={() => handleApprove(request)}
                                                            disabled={processingId === request.$id}
                                                        >
                                                            {processingId === request.$id ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                                                            <span className="ml-1">Approve</span>
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => handleReject(request)}
                                                            disabled={processingId === request.$id}
                                                        >
                                                            {processingId === request.$id ? <Loader2 className="animate-spin h-4 w-4" /> : <X className="h-4 w-4" />}
                                                            <span className="ml-1">Reject</span>
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            কোনো রিকোয়েস্ট পাওয়া যায়নি
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
