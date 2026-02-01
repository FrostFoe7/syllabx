import { Client, Teams } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing env vars');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const teams = new Teams(client);

async function addToAdmin(userId, name) {
    try {
        await teams.createMembership('admins', [], undefined, userId);
        console.log(`✅ Added ${name} (${userId}) to 'admins' team.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`ℹ️ ${name} (${userId}) is already in 'admins' team.`);
        } else {
            console.error(`❌ Error adding ${name}:`, e.message);
        }
    }
}

async function main() {
    // 1. The 'admin_user' from setup script
    await addToAdmin('admin_user', 'System Admin');

    // 2. The phone-based admin from setup-demo-accounts.js
    // I need to know the User ID. In setup-demo-accounts, it was logged. 
    // It is usually not deterministic unless we fetched it.
    // However, setup-demo-accounts used `list()` to find by email `user_01010101010@syllabx.com`.
    
    // I will try to find the user by email/phone logic if possible, but here I can just use the known ID if I had it.
    // Since I don't have the ID handy, I'll use the 'Users' service to find it.
    
    const { Users } = await import('node-appwrite');
    const users = new Users(client);
    
    try {
        const userList = await users.list();
        const phoneAdmin = userList.users.find(u => u.email === 'user_01010101010@syllabx.com');
        
        if (phoneAdmin) {
            await addToAdmin(phoneAdmin.$id, 'Phone Admin (01010101010)');
        } else {
            console.log('⚠️ Phone admin user not found.');
        }
    } catch (e) {
        console.error('Error listing users:', e.message);
    }
}

main();
