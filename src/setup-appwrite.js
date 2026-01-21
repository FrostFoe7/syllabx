import { Client, Databases, Permission, Role, ID } from 'node-appwrite';
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
const ADMINS_COLLECTION_ID = 'admins';
const EXAMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EXAMS_COLLECTION_ID || 'exams';
const QUESTIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUESTIONS_COLLECTION_ID || 'questions';
const COURSES_COLLECTION_ID = 'courses';
const ROUTINES_COLLECTION_ID = 'routines';
const RESULTS_COLLECTION_ID = 'results';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createAttribute(databaseId, collectionId, type, key, size, required, array = false) {
    try {
        if (type === 'string') {
            await databases.createStringAttribute(databaseId, collectionId, key, size, required, undefined, array);
        } else if (type === 'integer') {
            await databases.createIntegerAttribute(databaseId, collectionId, key, required, undefined, undefined, undefined, array);
        } else if (type === 'boolean') {
            await databases.createBooleanAttribute(databaseId, collectionId, key, required, undefined, array);
        } else if (type === 'float') {
            await databases.createFloatAttribute(databaseId, collectionId, key, required, undefined, undefined, undefined, array);
        } else if (type === 'datetime') {
             await databases.createDatetimeAttribute(databaseId, collectionId, key, required, undefined, array);
        }
        console.log(`Created attribute '${key}' for collection '${collectionId}'`);
        // Small delay to allow Appwrite to process
        await sleep(500); 
    } catch (error) {
        // If attribute already exists, ignore
        if (error.code === 409) {
            console.log(`Attribute '${key}' already exists in '${collectionId}'`);
        } else {
            console.error(`Error creating attribute '${key}':`, error.message);
        }
    }
}

async function setup() {
    console.log('Starting Appwrite Setup...');

    // 1. Create Database
    try {
        await databases.get(DATABASE_ID);
        console.log(`Database '${DATABASE_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.create(DATABASE_ID, DATABASE_ID);
            console.log(`Created database '${DATABASE_ID}'`);
        } else {
            throw error;
        }
    }

    // 2. Create Users Collection
    const usersPermissions = [
        Permission.read(Role.any()),
        Permission.create(Role.any()), // Changed to any to allow registration
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
    ];

    try {
        await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
        console.log(`Collection '${USERS_COLLECTION_ID}' already exists. Updating permissions...`);
        await databases.updateCollection(DATABASE_ID, USERS_COLLECTION_ID, 'Users', usersPermissions);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, USERS_COLLECTION_ID, 'Users', usersPermissions);
            console.log(`Created collection '${USERS_COLLECTION_ID}'`);
        }
    }

    // Users Attributes
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'userId', 36, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'phone', 20, false); // Changed to false as it might be optional initially
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'name', 100, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'createdAt', 30, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'email', 100, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'roll', 50, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'institution', 200, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'enrolledCourses', 100, false, true); // Array of strings

    // 2.5 Create Admins Collection
    try {
        await databases.getCollection(DATABASE_ID, ADMINS_COLLECTION_ID);
        console.log(`Collection '${ADMINS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, ADMINS_COLLECTION_ID, 'Admins', [
                Permission.read(Role.any()),
            ]);
            console.log(`Created collection '${ADMINS_COLLECTION_ID}'`);
        }
    }
    await createAttribute(DATABASE_ID, ADMINS_COLLECTION_ID, 'string', 'userId', 36, true);

    // 3. Create Exams Collection
    try {
        await databases.getCollection(DATABASE_ID, EXAMS_COLLECTION_ID);
        console.log(`Collection '${EXAMS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, EXAMS_COLLECTION_ID, 'Exams', [
                Permission.read(Role.any()),
            ]);
            console.log(`Created collection '${EXAMS_COLLECTION_ID}'`);
        }
    }

    // Exams Attributes
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'originalId', 50, false); // Optional now
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'title', 255, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'duration', null, true); // Changed to integer
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'totalQuestions', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'subject', 100, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'searchTags', 500, false);
    
    // New Attributes for Exams
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'startTime', 30, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'endTime', 30, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'float', 'negativeMark', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'courseName', 255, true);


    // 4. Create Questions Collection
    try {
        await databases.getCollection(DATABASE_ID, QUESTIONS_COLLECTION_ID);
        console.log(`Collection '${QUESTIONS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'Questions', [
                Permission.read(Role.any()),
            ]);
            console.log(`Created collection '${QUESTIONS_COLLECTION_ID}'`);
        }
    }

    // Questions Attributes
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'examId', 50, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'q', 1000, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a1', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a2', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a3', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a4', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'ans', 50, true); // Changed to string to support "Option A"
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'exp', 2000, false);

    // 5. Create Courses Collection
    try {
        await databases.getCollection(DATABASE_ID, COURSES_COLLECTION_ID);
        console.log(`Collection '${COURSES_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, COURSES_COLLECTION_ID, 'Courses', [
                Permission.read(Role.any()),
            ]);
            console.log(`Created collection '${COURSES_COLLECTION_ID}'`);
        }
    }
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'title', 255, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'price', 50, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'image', 500, false);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'description', 1000, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'features', 500, false, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'category', 50, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'boolean', 'isDisabled', false, false);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'enrollButtonText', 50, false);

    // 6. Create Routines Collection
    try {
        await databases.getCollection(DATABASE_ID, ROUTINES_COLLECTION_ID);
        console.log(`Collection '${ROUTINES_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, ROUTINES_COLLECTION_ID, 'Routines', [
                Permission.read(Role.any()),
            ]);
            console.log(`Created collection '${ROUTINES_COLLECTION_ID}'`);
        }
    }
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'courseId', 50, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'date', 100, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'subject', 255, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'time', 50, true);

    // 7. Create Results Collection
    try {
        await databases.getCollection(DATABASE_ID, RESULTS_COLLECTION_ID);
        console.log(`Collection '${RESULTS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, RESULTS_COLLECTION_ID, 'Results', [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
            ]);
            console.log(`Created collection '${RESULTS_COLLECTION_ID}'`);
        }
    }
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'userId', 36, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'examId', 50, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'score', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'totalQuestions', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'percentage', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'duration', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'submittedAt', 30, true);

    console.log('Waiting for attributes to index...');
    await sleep(3000); // Give it some time

    console.log('Setup complete!');
}

setup().catch(console.error);
