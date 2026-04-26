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

module.exports = router;
