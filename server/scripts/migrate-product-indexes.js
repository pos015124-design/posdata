/**
 * Migration Script: Fix Product Barcode/Code Unique Constraints
 * 
 * This script removes the global unique indexes on barcode and code,
 * and replaces them with compound unique indexes per user (userId + barcode/code).
 * 
 * Run this script once after deploying the new Product model.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DATABASE_URL;

async function migrateProductIndexes() {
  console.log('🚀 Starting product index migration...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get current indexes
    console.log('📋 Current indexes:');
    const currentIndexes = await Product.collection.indexes();
    console.log(JSON.stringify(currentIndexes, null, 2));
    console.log('');

    // Drop old unique indexes if they exist
    console.log('🗑️  Dropping old unique indexes...');
    try {
      await Product.collection.dropIndex('code_1');
      console.log('  ✓ Dropped code_1 index');
    } catch (error) {
      console.log('  ⚠ code_1 index not found or already dropped');
    }

    try {
      await Product.collection.dropIndex('barcode_1');
      console.log('  ✓ Dropped barcode_1 index');
    } catch (error) {
      console.log('  ⚠ barcode_1 index not found or already dropped');
    }

    // Create new compound unique indexes
    console.log('\n🔨 Creating new compound unique indexes...');
    
    await Product.collection.createIndex(
      { userId: 1, code: 1 },
      { 
        unique: true, 
        partialFilterExpression: { code: { $type: 'string' } },
        name: 'userId_1_code_1'
      }
    );
    console.log('  ✓ Created userId_1_code_1 unique index');

    await Product.collection.createIndex(
      { userId: 1, barcode: 1 },
      { 
        unique: true, 
        sparse: true,
        partialFilterExpression: { barcode: { $type: 'string' } },
        name: 'userId_1_barcode_1'
      }
    );
    console.log('  ✓ Created userId_1_barcode_1 unique index');

    // Verify new indexes
    console.log('\n✅ New indexes created successfully!');
    const newIndexexes = await Product.collection.indexes();
    console.log('\n📋 Updated indexes:');
    console.log(JSON.stringify(newIndexexes, null, 2));

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration
migrateProductIndexes();
