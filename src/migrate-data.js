import { Client, Databases, ID } from 'node-appwrite';
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
const COURSES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COURSES_COLLECTION_ID || 'courses';
const CATEGORIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Missing required environment variables.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const categoriesData = [
  {
    "name": "HSC 26",
    "slug": "hsc-26",
  },
  {
    "name": "QB course",
    "slug": "qb-course",
  }
];

const coursesData = [
  {
    "slug": "physics-second-part",
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
    "disabled": false,
    "categoryId": "hsc-26"
  },
  {
    "slug": "hsc-question-bank-solve",
    "title": "HSC প্রশ্নব্যাংক সলভ",
    "price": "৳700",
    "description": "এইচএসসি পরীক্ষার জন্য বিগত বছরের প্রশ্নব্যাংক সলভ ও বিশ্লেষণ।",
    "startDate": "শীঘ্রই আসছে",
    "features": ["বিগত বছরের প্রশ্ন সমাধান", "অধ্যায়ভিত্তিক আলোচনা", "বিশেষ মডেল টেস্ট"],
    "image": "https://images.unsplash.com/photo-1592698765727-387c9464cd7f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxxdWVzdGlvbiUyMGJhbmt8ZW58MHx8fHwxNzY4NTg5NzkyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "imageHint": "question bank",
    "disabled": false,
    "categoryId": "qb-course"
  }
];

async function migrate() {
    console.log('Starting migration...');

    // 1. Migrate Categories
    for (const cat of categoriesData) {
        try {
            await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION_ID, cat.slug, cat);
            console.log(`✅ Category created: ${cat.name}`);
        } catch (e) {
            if (e.code === 409) {
                console.log(`ℹ️ Category already exists: ${cat.name}`);
            } else {
                console.error(`❌ Error creating category ${cat.name}:`, e.message);
            }
        }
    }

    // 2. Migrate Courses
    for (const course of coursesData) {
        try {
            await databases.createDocument(DATABASE_ID, COURSES_COLLECTION_ID, course.slug, course);
            console.log(`✅ Course created: ${course.title}`);
        } catch (e) {
             if (e.code === 409) {
                console.log(`ℹ️ Course already exists: ${course.title}`);
            } else {
                console.error(`❌ Error creating course ${course.title}:`, e.message);
            }
        }
    }

    console.log('Migration complete!');
}

migrate();