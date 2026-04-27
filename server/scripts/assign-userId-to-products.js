/**
 * Migration Script: Assign userId to existing products
 * 
 * This script fixes products that were created before userId filtering was implemented.
 * It assigns all products without userId to a specific admin user.
 * 
 * Usage:
 * 1. Update ADMIN_USER_ID with your admin user's MongoDB ObjectId
 * 2. Run: node server/scripts/assign-userId-to-products.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

// Configuration - UPDATE THIS WITH YOUR ADMIN USER ID
const ADMIN_USER_ID = 'UPDATE_WITH_ADMIN_USER_OBJECT_ID';

async function migrate() {
  try {
    console.log('🚀 Starting product userId migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count products without userId
    const productsWithoutUserId = await Product.countDocuments({ 
      userId: { $exists: false } 
    });
    
    console.log(`📊 Found ${productsWithoutUserId} products without userId\n`);

    if (productsWithoutUserId === 0) {
      console.log('✅ All products already have userId. No migration needed.');
      process.exit(0);
    }

    // Verify admin user exists
    const adminUser = await User.findById(ADMIN_USER_ID);
    if (!adminUser) {
      console.error(`❌ Admin user with ID ${ADMIN_USER_ID} not found!`);
      console.log('Please update ADMIN_USER_ID in this script with a valid user ID.');
      
      // List available users
      const users = await User.find().select('_id email name').limit(10);
      console.log('\nAvailable users:');
      users.forEach(u => {
        console.log(`  - ${u.email}: ${u._id}`);
      });
      
      process.exit(1);
    }

    console.log(`👤 Assigning products to: ${adminUser.email} (${ADMIN_USER_ID})\n`);

    // Update all products without userId
    const result = await Product.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: new mongoose.Types.ObjectId(ADMIN_USER_ID) } }
    );

    console.log('✅ Migration completed!');
    console.log(`   - Modified: ${result.modifiedCount} products`);
    console.log(`   - Matched: ${result.matchedCount} products\n`);

    // Verify migration
    const remainingWithoutUserId = await Product.countDocuments({ 
      userId: { $exists: false } 
    });
    
    const totalWithUserId = await Product.countDocuments({ 
      userId: { $exists: true } 
    });

    console.log('📊 Final Statistics:');
    console.log(`   - Products with userId: ${totalWithUserId}`);
    console.log(`   - Products without userId: ${remainingWithoutUserId}`);
    
    if (remainingWithoutUserId === 0) {
      console.log('\n✅ SUCCESS! All products now have userId assigned.');
    } else {
      console.log('\n⚠️  WARNING: Some products still don\'t have userId!');
    }

    // Show product count for admin user
    const adminProductCount = await Product.countDocuments({ userId: ADMIN_USER_ID });
    console.log(`\n📦 ${adminUser.email} now owns ${adminProductCount} products`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
