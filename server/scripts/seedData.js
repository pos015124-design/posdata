const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dukani_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Sale.deleteMany({});
    await Category.deleteMany({});
    await Settings.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create categories
    const categories = await Category.insertMany([
      { name: 'Electronics', description: 'Electronic devices and accessories', color: '#3b82f6' },
      { name: 'Clothing', description: 'Apparel and fashion items', color: '#8b5cf6' },
      { name: 'Food & Beverages', description: 'Food items and drinks', color: '#10b981' },
      { name: 'Books', description: 'Books and educational materials', color: '#f59e0b' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies', color: '#ef4444' },
    ]);

    console.log('📂 Created categories');

    // Create admin user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const adminUser = await User.create({
      email: 'test@dukani.com',
      password: hashedPassword,
      role: 'admin',
      permissions: {
        dashboard: true,
        pos: true,
        inventory: true,
        customers: true,
        staff: true,
        reports: true,
        settings: true
      },
      isApproved: true
    });

    console.log('👤 Created admin user');

    // Create products
    const products = await Product.insertMany([
      {
        name: 'iPhone 14 Pro',
        code: 'IPH14PRO',
        description: 'Latest Apple smartphone with advanced features',
        price: 999.99,
        purchasePrice: 750.00,
        stock: 25,
        reorderPoint: 5,
        barcode: '1234567890123',
        category: 'Electronics',
        supplier: 'Apple Inc.'
      },
      {
        name: 'Samsung Galaxy S23',
        code: 'SAM23GAL',
        description: 'Premium Android smartphone',
        price: 899.99,
        purchasePrice: 650.00,
        stock: 30,
        reorderPoint: 5,
        barcode: '1234567890124',
        category: 'Electronics',
        supplier: 'Samsung'
      },
      {
        name: 'Nike Air Max',
        code: 'NIKEAIRMAX',
        description: 'Comfortable running shoes',
        price: 129.99,
        purchasePrice: 80.00,
        stock: 50,
        reorderPoint: 10,
        barcode: '1234567890125',
        category: 'Clothing',
        supplier: 'Nike'
      },
      {
        name: 'Coca Cola 500ml',
        code: 'COKE500',
        description: 'Refreshing soft drink',
        price: 2.99,
        purchasePrice: 1.50,
        stock: 100,
        reorderPoint: 20,
        barcode: '1234567890126',
        category: 'Food & Beverages',
        supplier: 'Coca Cola Company'
      },
      {
        name: 'JavaScript Guide',
        code: 'JSGUIDE',
        description: 'Complete guide to JavaScript programming',
        price: 39.99,
        purchasePrice: 25.00,
        stock: 15,
        reorderPoint: 5,
        barcode: '1234567890127',
        category: 'Books',
        supplier: 'Tech Books Ltd'
      },
      {
        name: 'Garden Hose 50ft',
        code: 'HOSE50FT',
        description: 'Durable garden hose for watering',
        price: 49.99,
        purchasePrice: 30.00,
        stock: 20,
        reorderPoint: 5,
        barcode: '1234567890128',
        category: 'Home & Garden',
        supplier: 'Garden Supplies Co'
      }
    ]);

    console.log('📦 Created products');

    // Create customers
    const customers = await Customer.insertMany([
      {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+255 123 456 789',
        address: '123 Main Street, Dar es Salaam',
        creditLimit: 1000.00,
        currentCredit: 0.00,
        isActive: true
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '+255 987 654 321',
        address: '456 Oak Avenue, Arusha',
        creditLimit: 500.00,
        currentCredit: 0.00,
        isActive: true
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@email.com',
        phone: '+255 555 123 456',
        address: '789 Pine Road, Mwanza',
        creditLimit: 750.00,
        currentCredit: 0.00,
        isActive: true
      }
    ]);

    console.log('👥 Created customers');

    // Create sample sales (for analytics)
    const salesData = [];
    const today = new Date();
    
    // Create sales for the last 30 days
    for (let i = 0; i < 30; i++) {
      const saleDate = new Date(today);
      saleDate.setDate(today.getDate() - i);
      
      // Random number of sales per day (1-5)
      const salesPerDay = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < salesPerDay; j++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const total = randomProduct.price * quantity;
        
        const finalTotal = total * 1.18;

        salesData.push({
          customer: randomCustomer._id,
          staff: adminUser._id,
          items: [{
            product: randomProduct._id,
            name: randomProduct.name,
            quantity: quantity,
            price: randomProduct.price,
            total: total
          }],
          subtotal: total,
          tax: total * 0.18, // 18% tax
          taxRate: 18,
          total: finalTotal,
          amountPaid: finalTotal,
          paymentMethod: ['cash', 'card', 'mobile'][Math.floor(Math.random() * 3)],
          status: 'completed',
          createdAt: saleDate,
          updatedAt: saleDate
        });
      }
    }

    await Sale.insertMany(salesData);
    console.log('💰 Created sample sales');

    // Create default settings
    await Settings.create({
      business: {
        name: 'Dukani Store',
        address: '123 Main Street, Dar es Salaam',
        phone: '+255 123 456 789',
        email: 'info@dukanistore.com',
        taxId: 'TIN12345678'
      },
      tax: {
        defaultTaxRate: '18',
        taxIncluded: false,
        enableTax: true
      },
      receipt: {
        showLogo: true,
        showTaxId: true,
        footerText: 'Thank you for shopping with us!',
        receiptPrefix: 'INV-',
        printAutomatically: true
      },
      payment: {
        acceptCash: true,
        acceptCard: true,
        acceptMobile: true,
        acceptCredit: true,
        defaultPaymentMethod: 'cash'
      },
      storeId: 'default'
    });

    console.log('⚙️  Created default settings');

    console.log('✅ Data seeding completed successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${salesData.length} sales transactions`);
    console.log(`   - 1 admin user (test@dukani.com)`);
    console.log(`   - Default settings`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding
seedData();
