import { Models } from 'appwrite';
import { UserData } from '@/types';

export function isUserEnrolled(user: UserData | Models.Document | null, courseId: string, courseName?: string): boolean {
    const userData = user as UserData;
    if (!userData || !userData.enrolledCourses || !Array.isArray(userData.enrolledCourses)) return false;
    
    // Check if enrolled by ID (Primary)
    if (userData.enrolledCourses.includes(courseId)) return true;
    
    // Check if enrolled by Title (Legacy)
    if (courseName && userData.enrolledCourses.includes(courseName)) return true;

    return false;
}
