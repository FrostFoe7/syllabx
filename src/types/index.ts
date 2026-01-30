import { Models } from 'appwrite';

export interface UserData extends Models.Document {
    userId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    enrolledCourses: string[];
    roll?: string;
    institution?: string;
}

export interface Course extends Models.Document {
    title: string;
    slug: string;
    price: string;
    description: string;
    startDate?: string;
    features: string[];
    image: string;
    imageHint?: string;
    disabled: boolean;
    categoryId: string;
    createdAt?: string;
}

export interface Exam extends Models.Document {
    originalId?: string;
    title: string;
    duration: number;
    totalQuestions: number;
    subject?: string;
    searchTags?: string;
    startTime: string;
    endTime: string;
    negativeMark: number;
    courseId: string;
    courseName: string;
}

export interface Question extends Models.Document {
    examId: string;
    q: string;
    a1: string;
    a2: string;
    a3: string;
    a4: string;
    ans: number;
    exp: string;
}

export interface Result extends Models.Document {
    userId: string;
    userName?: string;
    examId: string;
    examTitle: string;
    courseId?: string;
    marks: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    submittedAt: string;
    answersJSON: string;
}

export interface Category extends Models.Document {
    name: string;
    slug: string;
}

export interface Routine extends Models.Document {
    courseId: string;
    date: string;
    topic: string;
    time?: string;
}

export interface CalendarEvent extends Models.Document {
    subject: string;
    date: string;
    time?: string;
    examDateTime?: string;
}
