/**
 * Seed script - Creates initial platform admin user
 * Usage: npm run seed
 * 
 * NOTE: This only creates the admin user if none exists.
 * Customers self-register via the /auth/customer-register endpoint.
 */
const connectDB = require('../config/db');
const User = require('../models/User');
const logger = require('./logger');

const seed = async () => {
  await connectDB();

  // Check if admin already exists
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    logger.info('Admin already exists. Skipping seed.');
    logger.info(`Admin email: ${existingAdmin.email}`);
    process.exit(0);
  }

  // Create platform admin
  const admin = await User.create({
    email: 'admin@whatsapp-saas.com',
    password: 'Admin@123456',
    name: 'Platform Admin',
    role: 'admin',
  });

  logger.info('Seed completed successfully!');
  logger.info('=================================');
  logger.info('Admin Account:');
  logger.info(`  Email: ${admin.email}`);
  logger.info(`  Password: Admin@123456`);
  logger.info('');
  logger.info('Customers can self-register at /register');
  logger.info('=================================');

  process.exit(0);
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
