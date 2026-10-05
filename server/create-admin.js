import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase, closeDatabase } from './database.js';
import { User } from './models.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Campus Administrator';
const phone = process.env.ADMIN_PHONE?.trim() || 'Update this phone in profile';
const department = process.env.ADMIN_DEPARTMENT?.trim() || 'Student Services';

if (!email || !password || password.length < 12) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in the environment before running npm run admin:create.');
  process.exit(1);
}

try {
  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.error('That email already has an account. Use the account-management process rather than overwriting its password.');
    process.exitCode = 1;
  } else {
    const user = await User.create({ name, email, phone, department, role: 'admin', isActive: true, password: await bcrypt.hash(password, 12) });
    console.log(`Administrator created: ${user.email}`);
  }
} catch (error) {
  console.error(`Administrator creation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
