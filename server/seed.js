import 'dotenv/config';
import { connectDatabase, closeDatabase } from './database.js';
import { seedDemoData } from './seed-data.js';

try {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed data is disabled in production.');
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI to a persistent development MongoDB instance before running the manual seed command.');
  await connectDatabase();
  await seedDemoData();
  console.log('Seed complete. Existing user records were preserved.');
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
