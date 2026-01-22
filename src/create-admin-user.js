import { Client, Databases, ID, Users } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'syllabx_db';
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users';
const ADMINS_COLLECTION_ID = 'admins';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);
const users = new Users(client);

async function createAdmin() {
    const PHONE = '01010101010';
    const PASSWORD = 'admin1234';
    const NAME = 'Main Admin';
    const EMAIL = `user_${PHONE}@syllabx.com`;
    const USER_ID = ID.unique();

    console.log(`Creating Admin: ${NAME} (${PHONE})...`);

    try {
        // 1. Create Auth User
        const newUser = await users.create(USER_ID, EMAIL, undefined, PASSWORD, NAME);
        console.log(`✅ Created auth user: ${newUser.$id}`);

        // 2. Create User Profile Document
        await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, USER_ID, {
            userId: USER_ID,
            name: NAME,
            phone: PHONE,
            email: EMAIL,
            createdAt: new Date().toISOString(),
            enrolledCourses: []
        });
        console.log(`✅ Created user profile document`);

        // 3. Add to Admins Collection
        await databases.createDocument(DATABASE_ID, ADMINS_COLLECTION_ID, USER_ID, {
            userId: USER_ID
        });
        console.log(`✅ Registered as admin`);

        console.log('\nAdmin creation complete!');
        console.log(`Login Phone: ${PHONE}`);
        console.log(`Login Password: ${PASSWORD}`);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }
}

createAdmin();
