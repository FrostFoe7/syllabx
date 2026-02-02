import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'syllabx_db';
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || process.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users';
const COURSES_COLLECTION_ID = 'courses';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function migrate() {
    console.log('Starting Enrollment Migration (Titles -> IDs)...');

    try {
        // 1. Fetch all courses to create a map of Title -> ID
        const coursesList = await databases.listDocuments(DATABASE_ID, COURSES_COLLECTION_ID, [Query.limit(100)]);
        const courseMap = {};
        coursesList.documents.forEach(doc => {
            courseMap[doc.title] = doc.$id;
            courseMap[doc.$id] = doc.$id; // Also map ID to ID for safety
        });
        
        console.log(`Loaded ${coursesList.total} courses.`);

        // 2. Fetch all users
        let hasNext = true;
        let lastId = null;
        let processedCount = 0;
        let updatedCount = 0;

        while (hasNext) {
            const queries = [Query.limit(50)];
            if (lastId) queries.push(Query.cursorAfter(lastId));

            const usersList = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, queries);
            
            if (usersList.documents.length === 0) {
                hasNext = false;
                break;
            }

            for (const user of usersList.documents) {
                lastId = user.$id;
                processedCount++;
                
                if (!user.enrolledCourses || user.enrolledCourses.length === 0) continue;

                let needsUpdate = false;
                const newEnrollments = new Set();

                for (const entry of user.enrolledCourses) {
                    if (courseMap[entry]) {
                        // It's a known title or ID, use the mapped ID
                        const resolvedId = courseMap[entry];
                        if (resolvedId !== entry) needsUpdate = true;
                        newEnrollments.add(resolvedId);
                    } else {
                        // Unknown entry, keep it but warn (or maybe it's a legacy ID not in our current fetch limit?)
                        // If it looks like an ID (alphanumeric, no spaces), keep it.
                        // If it looks like a Title (has spaces), it might be broken.
                        console.warn(`User ${user.name} (${user.$id}) has unknown enrollment: "${entry}"`);
                        newEnrollments.add(entry);
                    }
                }

                if (needsUpdate) {
                    const finalEnrollments = Array.from(newEnrollments);
                    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, user.$id, {
                        enrolledCourses: finalEnrollments
                    });
                    console.log(`Updated user ${user.name}: ${JSON.stringify(user.enrolledCourses)} -> ${JSON.stringify(finalEnrollments)}`);
                    updatedCount++;
                }
            }
        }

        console.log(`Migration Complete. Processed: ${processedCount}, Updated: ${updatedCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
