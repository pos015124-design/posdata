const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongoServer = null;

// Connect mongoose to a real MongoDB instance. Uses MONGODB_TEST_URI when set
// (CI / pointing at a dedicated test database on a real server), otherwise
// spins up an in-process mongod via mongodb-memory-server. The test DB is
// disposable — teardown drops it — so never point MONGODB_TEST_URI at a
// database that holds real data.
async function setupTestDB() {
  if (mongoose.connection.readyState === 1) return;

  const configuredUri = process.env.MONGODB_TEST_URI;
  let mongoUri = configuredUri;
  if (!mongoUri) {
    // Single-node replica set: createOrderFromCart uses transactions, which
    // are only supported on replica sets / mongos.
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    mongoUri = mongoServer.getUri();
  }

  // Suites that boot server.js (e.g. performance tests) connect via DATABASE_URL.
  // Point it at the same instance so they start instead of aborting.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = mongoUri;
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    bufferCommands: false, // Disable mongoose buffering
    autoIndex: false // Background index builds change the catalog mid-transaction and break multi-doc transactions
  });
}

async function teardownTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

beforeAll(async () => {
  try {
    await setupTestDB();
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
  await teardownTestDB();
});

module.exports = { setupTestDB, teardownTestDB };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-purposes-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster for testing
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173'; // Add allowed origins for testing
