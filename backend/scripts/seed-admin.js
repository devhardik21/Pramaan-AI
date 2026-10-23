/**
 * Admin Seeder — run once to create the first admin account.
 * Usage: node scripts/seed-admin.js
 * Credentials are read from .env (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
 * This script does NOT expose a public API endpoint.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  try {
    const uri = process.env.MONGO_URI.includes('PramaanAI')
      ? process.env.MONGO_URI
      : `${process.env.MONGO_URI}/PramaanAI`;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@pramaanai.local';
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'System Administrator';

    if (!password || password === 'ChangeMe@123') {
      console.error(
        'ERROR: Set a strong ADMIN_PASSWORD in .env before running this seeder in production.'
      );
      // Allow in development
      if (process.env.NODE_ENV === 'production') process.exit(1);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save({ validateBeforeSave: false });
        console.log(`Existing user ${email} promoted to admin.`);
      } else {
        console.log(`Admin user ${email} already exists. Nothing changed.`);
      }
    } else {
      const admin = await User.create({ name, email, password, role: 'admin' });
      console.log(`Admin user created: ${admin.email}`);
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seeder failed:', err.message);
    process.exit(1);
  }
})();
