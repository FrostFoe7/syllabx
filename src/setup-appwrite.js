import { Client, Databases, Permission, Role, ID, Storage, Users } from 'node-appwrite';
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
const BUCKET_ID = 'main_storage';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

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
        await sleep(500); 
    } catch (error) {
        if (error.code === 409) {
            console.log(`Attribute '${key}' already exists in '${collectionId}'`);
        } else {
            console.error(`Error creating attribute '${key}':`, error.message);
        }
    }
}

async function createIndex(databaseId, collectionId, key, type, attributes) {
    try {
        await databases.createIndex(databaseId, collectionId, key, type, attributes);
        console.log(`Created index '${key}' for collection '${collectionId}'`);
        await sleep(500);
    } catch (error) {
        if (error.code === 409) {
            console.log(`Index '${key}' already exists in '${collectionId}'`);
        } else {
            console.error(`Error creating index '${key}':`, error.message);
        }
    }
}

async function setup() {
    console.log('Starting Appwrite Setup...');

    const ADMIN_PHONE = '00001';
    const ADMIN_PASSWORD = 'admin12345';
    const ADMIN_NAME = 'System Admin';
    const ADMIN_VIRTUAL_EMAIL = `user_${ADMIN_PHONE}@syllabx.com`;

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
        Permission.create(Role.any()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
    ];

    try {
        await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
        console.log(`Collection '${USERS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, USERS_COLLECTION_ID, 'Users', usersPermissions);
            console.log(`Created collection '${USERS_COLLECTION_ID}'`);
        }
    }

    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'userId', 36, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'phone', 20, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'name', 100, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'createdAt', 30, true);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'email', 100, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'roll', 50, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'institution', 200, false);
    await createAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'string', 'enrolledCourses', 100, false, true);

    // 2.5 Create Admins Collection
    const adminPermissions = [
        Permission.read(Role.any()),
    ];

    try {
        await databases.getCollection(DATABASE_ID, ADMINS_COLLECTION_ID);
        console.log(`Collection '${ADMINS_COLLECTION_ID}' already exists. Updating permissions...`);
        await databases.updateCollection(DATABASE_ID, ADMINS_COLLECTION_ID, 'Admins', adminPermissions);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, ADMINS_COLLECTION_ID, 'Admins', adminPermissions);
            console.log(`Created collection '${ADMINS_COLLECTION_ID}'`);
        }
    }
    await createAttribute(DATABASE_ID, ADMINS_COLLECTION_ID, 'string', 'userId', 36, true);

    // 2.6 Create Default Admin User
    let adminUserId = 'admin_user';
    try {
        await users.delete(adminUserId);
        console.log('Deleted old admin user for refresh.');
    } catch (err) {}

    try {
        const newUser = await users.create(adminUserId, ADMIN_VIRTUAL_EMAIL, undefined, ADMIN_PASSWORD, ADMIN_NAME);
        console.log(`Created admin auth user: ${newUser.$id}`);
        
        // Ensure profile exists in users collection
        try { await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, adminUserId); } catch(e){}
        await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, adminUserId, {
            userId: adminUserId,
            name: ADMIN_NAME,
            email: ADMIN_VIRTUAL_EMAIL,
            phone: ADMIN_PHONE,
            createdAt: new Date().toISOString(),
            enrolledCourses: []
        });
    } catch (err) {
        console.log('Admin user creation failed:', err.message);
    }

    // Add to Admins Collection if not there
    try {
        await databases.getDocument(DATABASE_ID, ADMINS_COLLECTION_ID, adminUserId);
        console.log('Admin already registered in admins collection.');
    } catch (error) {
        await databases.createDocument(DATABASE_ID, ADMINS_COLLECTION_ID, adminUserId, {
            userId: adminUserId
        });
        console.log('Admin registered in admins collection.');
    }

    // 3. Create Exams Collection
    try {
        await databases.getCollection(DATABASE_ID, EXAMS_COLLECTION_ID);
        console.log(`Collection '${EXAMS_COLLECTION_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await databases.createCollection(DATABASE_ID, EXAMS_COLLECTION_ID, 'Exams', [
                Permission.read(Role.any()),
                Permission.write(Role.users()), // Note: Should be restricted to admins in production
            ]);
            console.log(`Created collection '${EXAMS_COLLECTION_ID}'`);
        }
    }

    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'originalId', 50, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'title', 255, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'duration', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'totalQuestions', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'subject', 100, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'searchTags', 500, false);
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
                Permission.write(Role.users()), // Note: Should be restricted to admins in production
            ]);
            console.log(`Created collection '${QUESTIONS_COLLECTION_ID}'`);
        }
    }

    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'examId', 50, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'q', 1000, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a1', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a2', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a3', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'a4', 500, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'integer', 'ans', null, true);
    await createAttribute(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'string', 'exp', 2000, false);

    // IMPORTANT: Create Index for Queries
    await createIndex(DATABASE_ID, QUESTIONS_COLLECTION_ID, 'examId_index', 'key', ['examId']);

    // 5. Create Storage Bucket
    try {
        await storage.getBucket(BUCKET_ID);
        console.log(`Bucket '${BUCKET_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await storage.createBucket(BUCKET_ID, 'Main Storage', [
                Permission.read(Role.any()),
                Permission.write(Role.users()),
            ], false, true, undefined, ['jpg', 'png', 'svg', 'webp']);
            console.log(`Created bucket '${BUCKET_ID}'`);
        }
    }

    console.log('Waiting for indexing...');
    await sleep(3000);
    console.log('Setup complete!');
}

setup().catch(console.error);
