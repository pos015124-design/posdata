const mongoose = require('mongoose');

// Setup test database
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dukani_test';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      bufferCommands: false // Disable mongoose buffering
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB for testing:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-purposes-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster for testing
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173'; // Add allowed origins for testing