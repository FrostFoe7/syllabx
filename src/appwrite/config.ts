import { Client, Account, Databases, Storage } from 'appwrite';

export const appwriteConfig = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
    usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '',
    examsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EXAMS_COLLECTION_ID || 'exams',
    questionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_QUESTIONS_COLLECTION_ID || 'questions',
    coursesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COURSES_COLLECTION_ID || 'courses',
    categoriesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories',
    routinesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ROUTINES_COLLECTION_ID || 'routines',
    resultsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_RESULTS_COLLECTION_ID || 'results',
    calendarCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_COLLECTION_ID || 'calendar',
    adminsCollectionId: 'admins',
    bucketId: 'main_storage',
};

const client = new Client();

if (appwriteConfig.endpoint) {
    client.setEndpoint(appwriteConfig.endpoint);
}

if (appwriteConfig.projectId) {
    client.setProject(appwriteConfig.projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };
