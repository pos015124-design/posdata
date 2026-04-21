const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dukani');
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // Check if users collection exists
    const collections = await db.listCollections().toArray();
    const usersCollection = collections.find(col => col.name === 'users');
    
    if (usersCollection) {
      console.log('Users collection exists');
      
      // Get indexes on users collection
      const indexes = await db.collection('users').indexes();
      console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
      
      // Check if refreshToken index exists
      const refreshTokenIndex = indexes.find(idx => idx.key && idx.key.refreshToken);
      if (refreshTokenIndex) {
        console.log('Found refreshToken index, dropping it...');
        await db.collection('users').dropIndex('refreshToken_1');
        console.log('Dropped refreshToken index');
      }
      
      // List all users
      const users = await db.collection('users').find({}).toArray();
      console.log('Current users:', users.map(u => ({ email: u.email, role: u.role, isApproved: u.isApproved })));
      
      // Remove refreshToken field from all users if it exists
      const updateResult = await db.collection('users').updateMany(
        { refreshToken: { $exists: true } },
        { $unset: { refreshToken: "" } }
      );
      console.log('Removed refreshToken field from', updateResult.modifiedCount, 'users');
    }

    console.log('Database cleanup completed');

  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixDatabase();
