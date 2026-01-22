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

async function setupAccount(phone, password, name, isAdmin = false) {
    const email = `user_${phone}@syllabx.com`;
    let userId;

    console.log(`Setting up ${isAdmin ? 'Admin' : 'User'}: ${name} (${phone})...`);

    try {
        // 1. Check if user already exists in Auth
        const existingUsers = await users.list();
        const existingUser = existingUsers.users.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.$id;
            console.log(`ℹ️ Auth user already exists: ${userId}`);
        } else {
            // Create Auth User
            const newUser = await users.create(ID.unique(), email, undefined, password, name);
            userId = newUser.$id;
            console.log(`✅ Created auth user: ${userId}`);
        }

        // 2. Upsert User Profile Document
        try {
            await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, userId, {
                userId: userId,
                name: name,
                phone: phone,
                email: email,
                createdAt: new Date().toISOString(),
                enrolledCourses: []
            });
            console.log(`✅ Created user profile document`);
        } catch (e) {
            if (e.code === 409) {
                await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, userId, {
                    name: name,
                    phone: phone,
                });
                console.log(`✅ Updated existing user profile document`);
            } else {
                throw e;
            }
        }

        // 3. Admin logic
        if (isAdmin) {
            try {
                await databases.createDocument(DATABASE_ID, ADMINS_COLLECTION_ID, userId, {
                    userId: userId
                });
                console.log(`✅ Registered as admin`);
            } catch (e) {
                if (e.code === 409) {
                    console.log(`ℹ️ Already registered as admin`);
                } else {
                    throw e;
                }
            }
        }

        console.log(`
--- ${isAdmin ? 'ADMIN' : 'USER'} DETAILS ---`);
        console.log(`Phone: ${phone}`);
        console.log(`Password: ${password}`);
        console.log(`--------------------------
`);

    } catch (error) {
        console.error(`❌ Error setting up account:`, error.message);
    }
}

async function main() {
    // Demo Admin
    await setupAccount('01010101010', 'admin1234', 'System Admin', true);
    
    // Demo Regular User
    await setupAccount('01700000000', 'user1234', 'Demo Student', false);
}

main();