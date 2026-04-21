/**
 * Database Index Creation Script
 * Creates strategic indexes for optimal query performance
 * Run with: node scripts/createIndexes.js
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');

// Import models to ensure they're registered
require('../models/Product');
require('../models/Sale');
require('../models/Customer');
require('../models/Inventory');
require('../models/Staff');
require('../models/Expense');
require('../models/User');
require('../models/CustomerPayment');

const createIndexes = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/dukani_system');
    logger.info('Connected to MongoDB for index creation');

    // Product indexes
    const Product = mongoose.model('Product');
    await Product.collection.createIndex({ name: 'text', code: 'text', barcode: 'text' }, {
      name: 'product_text_search',
      weights: { name: 10, code: 5, barcode: 3 }
    });
    await Product.collection.createIndex({ category: 1, price: 1 }, { name: 'category_price' });
    await Product.collection.createIndex({ category: 1, stock: 1 }, { name: 'category_stock' });
    await Product.collection.createIndex({ supplier: 1, createdAt: -1 }, { name: 'supplier_date' });
    await Product.collection.createIndex({ stock: 1, reorderPoint: 1 }, { name: 'stock_reorder' });
    await Product.collection.createIndex({ price: 1 }, { name: 'price_range' });
    await Product.collection.createIndex({ updatedAt: -1 }, { name: 'recent_updates' });
    logger.info('✅ Product indexes created');

    // Sale indexes
    const Sale = mongoose.model('Sale');
    await Sale.collection.createIndex({ createdAt: -1, staff: 1 }, { name: 'date_staff' });
    await Sale.collection.createIndex({ createdAt: -1, paymentMethod: 1 }, { name: 'date_payment' });
    await Sale.collection.createIndex({ customer: 1, createdAt: -1 }, { name: 'customer_date' });
    await Sale.collection.createIndex({ total: 1, createdAt: -1 }, { name: 'total_date' });
    await Sale.collection.createIndex({ 'items.product': 1, createdAt: -1 }, { name: 'product_sales' });
    await Sale.collection.createIndex({ staff: 1, createdAt: -1 }, { name: 'staff_performance' });
    await Sale.collection.createIndex({ paymentMethod: 1, total: 1 }, { name: 'payment_total' });
    // Compound index for date range queries with filters
    await Sale.collection.createIndex({
      createdAt: -1,
      paymentMethod: 1,
      staff: 1
    }, { name: 'analytics_compound' });
    logger.info('✅ Sale indexes created');

    // Customer indexes
    const Customer = mongoose.model('Customer');
    await Customer.collection.createIndex({ name: 'text', email: 'text', phone: 'text' }, {
      name: 'customer_text_search',
      weights: { name: 10, email: 5, phone: 3 }
    });
    await Customer.collection.createIndex({ type: 1, currentCredit: -1 }, { name: 'type_credit' });
    await Customer.collection.createIndex({ email: 1 }, { sparse: true, name: 'email_sparse' });
    await Customer.collection.createIndex({ phone: 1 }, { sparse: true, name: 'phone_sparse' });
    await Customer.collection.createIndex({ createdAt: -1 }, { name: 'customer_recent' });
    logger.info('✅ Customer indexes created');

    // Inventory indexes
    const Inventory = mongoose.model('Inventory');
    await Inventory.collection.createIndex({ product: 1, createdAt: -1 }, { name: 'product_history' });
    await Inventory.collection.createIndex({ type: 1, createdAt: -1 }, { name: 'type_date' });
    await Inventory.collection.createIndex({ staff: 1, createdAt: -1 }, { name: 'staff_activity' });
    await Inventory.collection.createIndex({ createdAt: -1, type: 1, product: 1 }, { name: 'analytics_inventory' });
    await Inventory.collection.createIndex({ supplier: 1, createdAt: -1 }, {
      sparse: true,
      name: 'supplier_history'
    });
    logger.info('✅ Inventory indexes created');

    // Staff indexes
    const Staff = mongoose.model('Staff');
    await Staff.collection.createIndex({ name: 'text', email: 'text' }, {
      name: 'staff_text_search',
      weights: { name: 10, email: 5 }
    });
    await Staff.collection.createIndex({ role: 1, createdAt: -1 }, { name: 'role_date' });
    await Staff.collection.createIndex({ user: 1 }, { unique: true, name: 'user_unique' });
    logger.info('✅ Staff indexes created');

    // Expense indexes
    const Expense = mongoose.model('Expense');
    await Expense.collection.createIndex({ description: 'text', category: 'text' }, {
      name: 'expense_text_search',
      weights: { description: 10, category: 5 }
    });
    await Expense.collection.createIndex({ date: -1, category: 1 }, { name: 'date_category' });
    await Expense.collection.createIndex({ category: 1, amount: -1 }, { name: 'category_amount' });
    await Expense.collection.createIndex({ staff: 1, date: -1 }, { name: 'staff_expense_date' });
    await Expense.collection.createIndex({ date: -1, amount: -1 }, { name: 'expense_analytics' });
    logger.info('✅ Expense indexes created');

    // User indexes
    const User = mongoose.model('User');
    await User.collection.createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
    await User.collection.createIndex({ role: 1, isApproved: 1 }, { name: 'role_approval' });
    await User.collection.createIndex({ isApproved: 1, createdAt: -1 }, { name: 'approval_date' });
    logger.info('✅ User indexes created');

    // CustomerPayment indexes
    const CustomerPayment = mongoose.model('CustomerPayment');
    await CustomerPayment.collection.createIndex({ customer: 1, date: -1 }, { name: 'customer_payment_date' });
    await CustomerPayment.collection.createIndex({ date: -1, paymentMethod: 1 }, { name: 'payment_method_date' });
    await CustomerPayment.collection.createIndex({ amount: -1, date: -1 }, { name: 'amount_date' });
    logger.info('✅ CustomerPayment indexes created');

    logger.info('🎉 All database indexes created successfully');

    // Display index statistics
    await displayIndexStats();

  } catch (error) {
    logger.error('Failed to create indexes', { error: error.message });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
};

/**
 * Display index statistics for all collections
 */
const displayIndexStats = async () => {
  try {
    const collections = ['products', 'sales', 'customers', 'inventories', 'staff', 'expenses', 'users', 'customerpayments'];

    logger.info('📊 Index Statistics:');

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes();
        const stats = await collection.stats();

        logger.info(`\n${collectionName.toUpperCase()}:`);
        logger.info(`  Documents: ${stats.count}`);
        logger.info(`  Indexes: ${indexes.length}`);
        logger.info(`  Index Names: ${indexes.map(idx => idx.name).join(', ')}`);
        logger.info(`  Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        logger.warn(`Could not get stats for ${collectionName}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error('Failed to display index stats', { error: error.message });
  }
};

/**
 * Analyze query performance for common operations
 */
const analyzeQueryPerformance = async () => {
  try {
    logger.info('🔍 Analyzing Query Performance...');

    const Product = mongoose.model('Product');
    const Sale = mongoose.model('Sale');
    const Customer = mongoose.model('Customer');

    // Test product search performance
    const productSearchStart = Date.now();
    await Product.find({ $text: { $search: 'test' } }).limit(10);
    const productSearchTime = Date.now() - productSearchStart;
    logger.info(`Product text search: ${productSearchTime}ms`);

    // Test sales analytics performance
    const salesAnalyticsStart = Date.now();
    await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);
    const salesAnalyticsTime = Date.now() - salesAnalyticsStart;
    logger.info(`Sales analytics aggregation: ${salesAnalyticsTime}ms`);

    // Test customer search performance
    const customerSearchStart = Date.now();
    await Customer.find({ $text: { $search: 'john' } }).limit(10);
    const customerSearchTime = Date.now() - customerSearchStart;
    logger.info(`Customer text search: ${customerSearchTime}ms`);

    logger.info('✅ Query performance analysis completed');

  } catch (error) {
    logger.error('Failed to analyze query performance', { error: error.message });
  }
};

// Run the script
if (require.main === module) {
  require('dotenv').config();

  createIndexes()
    .then(() => analyzeQueryPerformance())
    .then(() => {
      logger.info('🎉 Database optimization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database optimization failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = { createIndexes, displayIndexStats, analyzeQueryPerformance };