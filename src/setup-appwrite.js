import { Client, Databases, Permission, Role, Storage, Users, Teams } from 'node-appwrite';
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
const CATEGORIES_COLLECTION_ID = 'categories';
const ROUTINES_COLLECTION_ID = 'routines';
const RESULTS_COLLECTION_ID = 'results';
const CALENDAR_COLLECTION_ID = 'calendar';
const BUCKET_ID = 'main_storage';
const ADMIN_TEAM_ID = 'admins';

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
const teams = new Teams(client);

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
            console.error(`Error creating attribute '${key}' in '${collectionId}':`, error.message);
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

    const FORCE_RECREATE = false; // Set to true to reset collections

    const ADMIN_PHONE = '01010101010';
    const ADMIN_PASSWORD = 'admin1234';
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

    // 1.5 Create Admins Team
    try {
        await teams.get(ADMIN_TEAM_ID);
        console.log(`Team '${ADMIN_TEAM_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await teams.create(ADMIN_TEAM_ID, 'Admins');
            console.log(`Created team '${ADMIN_TEAM_ID}'`);
        }
    }

    // Helper to recreate collection
    async function getOrCreateCollection(id, name, permissions) {
                if (FORCE_RECREATE) {
                    try {
                        await databases.deleteCollection(DATABASE_ID, id);
                        console.log(`Deleted collection '${id}' for recreation.`);
                        await sleep(1000);
                    } catch { }
                }
        
                try {
                    const col = await databases.getCollection(DATABASE_ID, id);
                    // Update permissions for existing collection
                    try {
                        await databases.updateCollection(DATABASE_ID, id, name, permissions);
                        console.log(`Updated permissions for collection '${id}'`);
                    } catch {
                        // Permissions might not change, which is ok
                    }
                    return col;
                } catch (error) {
            if (error.code === 404) {
                const col = await databases.createCollection(DATABASE_ID, id, name, permissions);
                console.log(`Created collection '${id}'`);
                await sleep(500);
                return col;
            }
            throw error;
        }
    }

    // 2. Create Users Collection
    const usersPermissions = [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.users()), // NOTE: Ideally should be Document Security, keeping for compatibility
        Permission.delete(Role.users()),
    ];
    await getOrCreateCollection(USERS_COLLECTION_ID, 'Users', usersPermissions);

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
        Permission.write(Role.team(ADMIN_TEAM_ID))
    ];
    await getOrCreateCollection(ADMINS_COLLECTION_ID, 'Admins', adminPermissions);
    await createAttribute(DATABASE_ID, ADMINS_COLLECTION_ID, 'string', 'userId', 36, true);

    // 2.6 Create or Update Default Admin User
    let adminUserId;
    
    console.log(`Checking for admin user (${ADMIN_VIRTUAL_EMAIL})...`);
    
    try {
        const userList = await users.list([
             // Search by email is reliable if unique
             // We can't query by email directly in list() easily without Query class on server-side SDK sometimes, 
             // but here we can filter.
        ]);
        const existingAdmin = userList.users.find(u => u.email === ADMIN_VIRTUAL_EMAIL || u.phone === ADMIN_PHONE);
        
        if (existingAdmin) {
            adminUserId = existingAdmin.$id;
            console.log(`✅ Found existing admin user: ${adminUserId}`);
        } else {
            // Create new
            try {
                const newAdmin = await users.create('admin_user', ADMIN_VIRTUAL_EMAIL, undefined, ADMIN_PASSWORD, ADMIN_NAME);
                adminUserId = newAdmin.$id;
                console.log(`✅ Created new admin user: ${adminUserId}`);
            } catch (createErr) {
                // Fallback: If 'admin_user' ID is taken but email/phone didn't match (unlikely but possible)
                if (createErr.code === 409) {
                     console.log('⚠️ User ID "admin_user" taken or conflict. Fetching...');
                     // Try to just get 'admin_user'
                     try {
                         const u = await users.get('admin_user');
                         adminUserId = u.$id;
                     } catch {
                         console.error("Could not find or create admin user.");
                         process.exit(1);
                     }
                } else {
                    throw createErr;
                }
            }
        }
    } catch (err) {
        console.error('Error resolving admin user:', err.message);
    }

    if (adminUserId) {
        // A. Ensure Profile Exists
        try {
            await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, adminUserId, {
                userId: adminUserId,
                name: ADMIN_NAME,
                email: ADMIN_VIRTUAL_EMAIL,
                phone: ADMIN_PHONE,
                createdAt: new Date().toISOString(),
                enrolledCourses: []
            });
            console.log(`✅ Created admin profile document.`);
        } catch (e) {
            if (e.code === 409) {
                console.log(`ℹ️ Admin profile document already exists.`);
            } else {
                console.error(`Error creating admin profile: ${e.message}`);
            }
        }

        // B. Add to Admins Team
        try {
            await teams.createMembership(ADMIN_TEAM_ID, [], undefined, adminUserId);
            console.log(`✅ Added ${adminUserId} to 'admins' team.`);
        } catch (e) {
            if (e.code === 409) {
                console.log(`ℹ️ User ${adminUserId} is already in 'admins' team.`);
            } else {
                console.error(`❌ Error adding to admin team: ${e.message}`);
            }
        }

        // C. Register in Admins Collection
        try {
            await databases.createDocument(DATABASE_ID, ADMINS_COLLECTION_ID, adminUserId, {
                userId: adminUserId
            });
            console.log(`✅ Admin registered in admins collection.`);
        } catch (e) {
             if (e.code === 409) {
                console.log(`ℹ️ Admin already registered in admins collection.`);
            } else {
                console.error(`Error registering in admins collection: ${e.message}`);
            }
        }
    }

    // 3. Create Exams Collection
    await getOrCreateCollection(EXAMS_COLLECTION_ID, 'Exams', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);

    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'originalId', 50, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'title', 255, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'duration', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'integer', 'totalQuestions', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'subject', 100, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'searchTags', 500, false);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'startTime', 30, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'endTime', 30, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'float', 'negativeMark', null, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'courseId', 50, true);
    await createAttribute(DATABASE_ID, EXAMS_COLLECTION_ID, 'string', 'courseName', 255, true);

    // 4. Create Questions Collection
    await getOrCreateCollection(QUESTIONS_COLLECTION_ID, 'Questions', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);

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

    // 5. Create Categories Collection
    await getOrCreateCollection(CATEGORIES_COLLECTION_ID, 'Categories', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);
    await createAttribute(DATABASE_ID, CATEGORIES_COLLECTION_ID, 'string', 'name', 100, true);
    await createAttribute(DATABASE_ID, CATEGORIES_COLLECTION_ID, 'string', 'slug', 100, true);

    // 6. Create Courses Collection
    await getOrCreateCollection(COURSES_COLLECTION_ID, 'Courses', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'title', 255, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'slug', 255, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'price', 50, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'description', 1000, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'startDate', 100, false);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'features', 500, true, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'image', 1000, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'imageHint', 255, false);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'boolean', 'disabled', false, true);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'categoryId', 100, false);
    await createAttribute(DATABASE_ID, COURSES_COLLECTION_ID, 'string', 'createdAt', 30, false);

    // 7. Create Routines Collection
    await getOrCreateCollection(ROUTINES_COLLECTION_ID, 'Routines', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'courseId', 100, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'date', 100, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'topic', 255, true);
    await createAttribute(DATABASE_ID, ROUTINES_COLLECTION_ID, 'string', 'time', 100, false);

    // 8. Create Results Collection
    await getOrCreateCollection(RESULTS_COLLECTION_ID, 'Results', [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.team(ADMIN_TEAM_ID)),
        Permission.delete(Role.team(ADMIN_TEAM_ID)),
    ]);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'userId', 36, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'userName', 100, false);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'examId', 50, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'examTitle', 255, false);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'courseId', 50, false);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'float', 'marks', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'totalQuestions', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'correctAnswers', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'integer', 'wrongAnswers', null, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'submittedAt', 30, true);
    await createAttribute(DATABASE_ID, RESULTS_COLLECTION_ID, 'string', 'answersJSON', 50000, false);

    // 8.5 Create Calendar Collection
    await getOrCreateCollection(CALENDAR_COLLECTION_ID, 'Calendar', [
        Permission.read(Role.any()),
        Permission.write(Role.team(ADMIN_TEAM_ID)),
    ]);
    await createAttribute(DATABASE_ID, CALENDAR_COLLECTION_ID, 'string', 'subject', 255, true);
    await createAttribute(DATABASE_ID, CALENDAR_COLLECTION_ID, 'string', 'date', 100, true);
    await createAttribute(DATABASE_ID, CALENDAR_COLLECTION_ID, 'string', 'time', 100, false);
    await createAttribute(DATABASE_ID, CALENDAR_COLLECTION_ID, 'datetime', 'examDateTime', null, false);

    // 9. Create Storage Bucket
    try {
        await storage.getBucket(BUCKET_ID);
        console.log(`Bucket '${BUCKET_ID}' already exists.`);
    } catch (error) {
        if (error.code === 404) {
            await storage.createBucket(BUCKET_ID, 'Main Storage', [
                Permission.read(Role.any()),
                Permission.write(Role.team(ADMIN_TEAM_ID)), // Restrict bucket writes to admins
            ], false, true, undefined, ['jpg', 'png', 'svg', 'webp']);
            console.log(`Created bucket '${BUCKET_ID}'`);
        }
    }

    // 10. Seeding
    console.log('Seeding data...');
    const courseTabsData = [
        {
          "name": "HSC 26",
          "id": "hsc-26",
          "courses": [
            {
              "id": "physics-second-part",
              "title": "Physics Second Part",
              "price": "FREE",
              "description": "A comprehensive course covering the second part of HSC Physics, designed to build a strong foundation and problem-solving skills.",
              "startDate": "কোর্স শুরু: February 1st",
              "features": [
                "১০ টি অধ্যায় ভিত্তিক MCQ Exam",
                "১টি সাবজেক্ট ফাইনাল এক্সাম",
                "পরীক্ষার সময়: সকাল ১০টা থেকে রাত ১০টা",
                "কোর্স শেষে CQ সাজেশন পিডিএফ ফাইল প্রদান"
              ],
              "image": "https://raw.githubusercontent.com/shuyaib105/syllabuserbaire/refs/heads/main/phy2f.webp",
              "imageHint": "physics textbook",
              "disabled": false
            }
          ]
        },
        {
          "name": "QB course",
          "id": "qb-course",
          "courses": [
            {
              "id": "hsc-question-bank-solve",
              "title": "HSC প্রশ্নব্যাংক সলভ",
              "price": "৳700",
              "description": "এইচএসসি পরীক্ষার জন্য বিগত বছরের প্রশ্নব্যাংক সলভ ও বিশ্লেষণ।",
              "startDate": "Coming Soon",
              "features": ["বিগত বছরের প্রশ্ন সমাধান", "অধ্যায়ভিত্তিক আলোচনা", "বিশেষ মডেল টেস্ট"],
              "image": "https://images.unsplash.com/photo-1592698765727-387c9464cd7f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxxdWVzdGlvbiUyMGJhbmt8ZW58MHx8fHwxNzY4NTg5NzkyfDA&ixlib=rb-4.1.0&q=80&w=1080",
              "imageHint": "question bank",
              "disabled": false
            }
          ]
        }
    ];

    for (const cat of courseTabsData) {
        try {
            await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION_ID, cat.id, {
                name: cat.name,
                slug: cat.id
            });
            console.log(`Seeded category: ${cat.name}`);
        } catch (e) {
            if (e.code === 409) console.log(`Category ${cat.name} already exists.`);
        }

        for (const course of cat.courses) {
            try {
                await databases.createDocument(DATABASE_ID, COURSES_COLLECTION_ID, course.id, {
                    title: course.title,
                    slug: course.id,
                    price: course.price,
                    description: course.description,
                    startDate: course.startDate || "",
                    features: course.features,
                    image: course.image,
                    imageHint: course.imageHint || "",
                    disabled: course.disabled,
                    categoryId: cat.id
                });
                console.log(`Seeded course: ${course.title}`);
            } catch (e) {
                if (e.code === 409) console.log(`Course ${course.title} already exists.`);
            }
        }
    }

    // Seed Routine for Physics
    const physicsRoutine = [
        { date: '১ ফেব্রুয়ারি, ২০২৬', topic: 'তাপগতিবিদ্যা' },
        { date: '৩ ফেব্রুয়ারি, ২০২৬', topic: 'স্থির তড়িৎ' },
        { date: '৫ ফেব্রুয়ারি, ২০২৬', topic: 'চল তড়িৎ' },
        { date: '৭ ফেব্রুয়ারি, ২০২৬', topic: 'তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব' },
        { date: '৯ ফেব্রুয়ারি, ২০২৬', topic: 'তড়িৎচুম্বকীয় আবেশ ও পরবর্তী প্রবাহ' },
        { date: '১১ ফেব্রুয়ারি, ২০২৬', topic: 'জ্যামিতিক ও ভৌত আলোকবিজ্ঞান' },
        { date: '১৩ ফেব্রুয়ারি, ২০২৬', topic: 'আধুনিক পদার্থবিজ্ঞানের সূচনা' },
        { date: '১৫ ফেব্রুয়ারি, ২০২৬', topic: 'পরমাণুর মডেল এবং নিউক্লিয়ার পদার্থবিজ্ঞান' },
        { date: '১৭ ফেব্রুয়ারি, ২০২৬', topic: 'সেমিকন্ডাক্টর ও ইলেকট্রনিক্স' },
        { date: '১৯ ফেব্রুয়ারি, ২০২৬', topic: 'জ্যোতির্বিজ্ঞান' },
        { date: '২১ ফেব্রুয়ারি, ২০২৬', topic: 'Physics Second Part Final Exam' }
    ];

    for (const [index, item] of physicsRoutine.entries()) {
        try {
            await databases.createDocument(DATABASE_ID, ROUTINES_COLLECTION_ID, `physics_routine_${index}`, {
                courseId: 'physics-second-part',
                date: item.date,
                topic: item.topic,
                time: 'সকাল ১০ টা - রাত ১০ টা'
            });
        } catch (e) {
             if (e.code !== 409) console.error(`Error seeding routine: ${e.message}`);
        }
    }

    console.log('Waiting for indexing...');
    await sleep(3000);
    console.log('Setup complete!');
}

setup().catch(console.error);

    