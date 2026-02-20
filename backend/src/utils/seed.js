/**
 * Seed script - Creates initial platform admin user
 * Usage: npm run seed
 * 
 * NOTE: This only creates the admin user if none exists.
 * Customers self-register via the /auth/customer-register endpoint.
 * 
 * Environment variables:
 *   ADMIN_EMAIL    - Admin email (default: admin@whatsapp-saas.com)
 *   ADMIN_PASSWORD - Admin password (required, no default in production)
 *   ADMIN_NAME     - Admin display name (default: Platform Admin)
 */
const connectDB = require('../config/db');
const User = require('../models/User');
const logger = require('./logger');
const env = require('../config/env');

const seed = async () => {
  await connectDB();

  // Check if admin already exists
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    logger.info('Admin already exists. Skipping seed.');
    logger.info(`Admin email: ${existingAdmin.email}`);
    process.exit(0);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@whatsapp-saas.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Platform Admin';

  if (!adminPassword) {
    logger.error('ADMIN_PASSWORD environment variable is required to seed the admin account.');
    logger.error('Usage: ADMIN_PASSWORD=YourStrongPassword npm run seed');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    logger.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  // Create platform admin
  const admin = await User.create({
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role: 'admin',
  });

  logger.info('Seed completed successfully!');
  logger.info('=================================');
  logger.info('Admin Account:');
  logger.info(`  Email: ${admin.email}`);
  logger.info('  Password: [set via ADMIN_PASSWORD env var]');
  logger.info('');
  logger.info('Customers can self-register at /register');
  logger.info('=================================');

  process.exit(0);
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
