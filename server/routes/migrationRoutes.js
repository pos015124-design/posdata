const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * POST /api/migrate/indexes
 * Run database migration to fix product indexes
 * This endpoint should only be called once and ideally protected
 */
router.post('/indexes', async (req, res) => {
  try {
    console.log('🚀 Starting product index migration...');

    const Product = mongoose.model('Product');

    // Get current indexes
    const currentIndexes = await Product.collection.indexes();
    console.log('Current indexes:', JSON.stringify(currentIndexes, null, 2));

    const results = {
      dropped: [],
      created: [],
      errors: []
    };

    // Drop old unique indexes if they exist
    try {
      await Product.collection.dropIndex('code_1');
      results.dropped.push('code_1');
      console.log('✓ Dropped code_1 index');
    } catch (error) {
      console.log('⚠ code_1 index not found or already dropped');
    }

    try {
      await Product.collection.dropIndex('barcode_1');
      results.dropped.push('barcode_1');
      console.log('✓ Dropped barcode_1 index');
    } catch (error) {
      console.log('⚠ barcode_1 index not found or already dropped');
    }

    // Create new compound unique indexes
    try {
      await Product.collection.createIndex(
        { userId: 1, code: 1 },
        { 
          unique: true, 
          partialFilterExpression: { code: { $type: 'string' } },
          name: 'userId_1_code_1'
        }
      );
      results.created.push('userId_1_code_1');
      console.log('✓ Created userId_1_code_1 unique index');
    } catch (error) {
      results.errors.push(`Failed to create userId_1_code_1: ${error.message}`);
      console.error('Error creating userId_1_code_1:', error.message);
    }

    try {
      await Product.collection.createIndex(
        { userId: 1, barcode: 1 },
        { 
          unique: true, 
          partialFilterExpression: { barcode: { $type: 'string' } },
          name: 'userId_1_barcode_1'
        }
      );
      results.created.push('userId_1_barcode_1');
      console.log('✓ Created userId_1_barcode_1 unique index');
    } catch (error) {
      results.errors.push(`Failed to create userId_1_barcode_1: ${error.message}`);
      console.error('Error creating userId_1_barcode_1:', error.message);
    }

    // Verify new indexes
    const newIndexexes = await Product.collection.indexes();

    res.json({
      success: true,
      message: 'Migration completed',
      results,
      currentIndexes: newIndexexes
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// GET /api/migrate/status - Check current indexes
router.get('/status', async (req, res) => {
  try {
    const Product = mongoose.model('Product');
    const indexes = await Product.collection.indexes();
    
    res.json({
      success: true,
      indexes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/migrate/backfill-business-userid
 * Backfill the userId field on Business documents that were created before
 * userId was added to the schema. Matches each Business to its owner User
 * via the User.businessId reference and writes the ObjectId back.
 *
 * Safe to run multiple times (skips businesses that already have userId set).
 */
router.post('/backfill-business-userid', async (req, res) => {
  try {
    const Business = mongoose.model('Business');
    const User = mongoose.model('User');

    // Find businesses that are missing userId
    const businesses = await Business.find({
      $or: [{ userId: { $exists: false } }, { userId: null }]
    }).lean();

    console.log(`[Backfill] Found ${businesses.length} businesses without userId`);

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const biz of businesses) {
      try {
        // Find the business_admin user whose businessId matches this business
        const owner = await User.findOne({
          businessId: biz._id,
          role: 'business_admin'
        }).select('_id');

        if (!owner) {
          skipped++;
          console.log(`[Backfill] No owner found for business ${biz._id} (${biz.name})`);
          continue;
        }

        await Business.updateOne(
          { _id: biz._id },
          { $set: { userId: owner._id } }
        );
        updated++;
        console.log(`[Backfill] ✓ Set userId=${owner._id} on business ${biz._id} (${biz.name})`);
      } catch (err) {
        errors.push(`Business ${biz._id}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Backfill complete. Updated: ${updated}, Skipped (no owner): ${skipped}, Errors: ${errors.length}`,
      updated,
      skipped,
      errors
    });
  } catch (error) {
    console.error('[Backfill] Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
