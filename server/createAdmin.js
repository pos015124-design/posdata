require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Staff = require('./models/Staff');
const { connectDB } = require('./config/database');

const createAdminUser = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@dukani.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user with all permissions
    const adminUser = new User({
      email: 'admin@dukani.com',
      password: 'admin123', // This will be hashed by the pre-save hook
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
    
    await adminUser.save();
    
    // Create staff record for admin
    const adminStaff = new Staff({
      name: 'Admin User',
      role: 'Manager',
      email: 'admin@dukani.com',
      phone: '1234567890',
      user: adminUser._id
    });
    
    await adminStaff.save();
    
    console.log('Admin user created successfully');
    console.log('Email: admin@dukani.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();