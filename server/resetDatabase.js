require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');
const { exec } = require('child_process');

const resetDatabase = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    console.log('Connected to MongoDB. Dropping all collections...');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    // Drop each collection
    for (const collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }
    
    console.log('All collections dropped successfully.');
    console.log('Database reset complete.');
    
    // Run the createAdmin script to create a new admin user
    console.log('Creating admin user...');
    exec('node createAdmin.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating admin user: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Admin creation stderr: ${stderr}`);
        return;
      }
      console.log(stdout);
      console.log('Database reset and admin user creation complete.');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

// Confirm before proceeding
console.log('WARNING: This will delete all data in the database.');
console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

setTimeout(() => {
  console.log('Proceeding with database reset...');
  resetDatabase();
}, 5000);