const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Staff = require('../models/Staff');

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dukani');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
    } else {
      // Create admin user with explicit refreshToken to avoid unique constraint issues
      const adminUser = new User({
        email: 'admin@dukani.com',
        password: 'AdminPassword123!',
        role: 'admin',
        isApproved: true,
        permissions: {
          dashboard: true,
          pos: true,
          inventory: true,
          customers: true,
          staff: true,
          reports: true,
          settings: true
        }
      });

      // Handle potential refreshToken field if it exists in the database
      if (adminUser.schema.paths.refreshToken) {
        adminUser.refreshToken = null;
      }

      await adminUser.save();
      console.log('Admin user created:', adminUser.email);

      // Create corresponding staff record
      const adminStaff = new Staff({
        name: 'System Administrator',
        role: 'Manager',
        email: 'admin@dukani.com',
        user: adminUser._id
      });
      await adminStaff.save();
      console.log('Admin staff record created');
    }

    // Approve the test user and give them proper permissions
    const testUser = await User.findOne({ email: 'test@dukani.com' });
    if (testUser) {
      testUser.isApproved = true;
      testUser.permissions = {
        dashboard: true,
        pos: true,
        inventory: true,
        customers: true,
        staff: false, // Sales clerks shouldn't manage staff
        reports: true,
        settings: false // Sales clerks shouldn't change settings
      };
      await testUser.save();
      console.log('Test user approved and permissions updated');

      // Update staff record
      const testStaff = await Staff.findOne({ email: 'test@dukani.com' });
      if (testStaff) {
        testStaff.name = 'Test User';
        await testStaff.save();
        console.log('Test staff record updated');
      }
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\nAdmin credentials:');
    console.log('Email: admin@dukani.com');
    console.log('Password: AdminPassword123!');
    console.log('\nTest user has been approved with Sales Clerk permissions.');

  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup
setupAdmin();
