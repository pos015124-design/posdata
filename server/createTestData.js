const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('./models/Product');
const Category = require('./models/Category');
const Customer = require('./models/Customer');

async function createTestData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Create categories
    console.log('📂 Creating categories...');
    let categories = await Category.find();
    if (categories.length === 0) {
      categories = await Category.insertMany([
        {
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          slug: 'electronics',
          isActive: true
        },
        {
          name: 'Clothing',
          description: 'Apparel and fashion items',
          slug: 'clothing',
          isActive: true
        },
        {
          name: 'Books',
          description: 'Books and educational materials',
          slug: 'books',
          isActive: true
        }
      ]);
      console.log(`✅ Created ${categories.length} categories`);
    } else {
      console.log(`✅ Found existing ${categories.length} categories`);
    }

    // Create products
    console.log('📦 Creating products...');
    let products = await Product.find();
    if (products.length === 0) {
      products = await Product.insertMany([
      {
        name: 'iPhone 15',
        description: 'Latest iPhone with advanced features',
        code: 'IPH15-001',
        price: 999.99,
        purchasePrice: 750.00,
        sku: 'IPH15-001',
        barcode: '1234567890123',
        category: 'Electronics',
        supplier: 'Apple Inc.',
        stock: 50,
        reorderPoint: 10,
        isActive: true,
        tags: ['smartphone', 'apple', 'electronics']
      },
      {
        name: 'Samsung Galaxy S24',
        description: 'Premium Android smartphone',
        code: 'SAM-S24-001',
        price: 899.99,
        purchasePrice: 650.00,
        sku: 'SAM-S24-001',
        barcode: '1234567890124',
        category: 'Electronics',
        supplier: 'Samsung Electronics',
        stock: 30,
        reorderPoint: 5,
        isActive: true,
        tags: ['smartphone', 'samsung', 'android']
      },
      {
        name: 'Nike Air Max',
        description: 'Comfortable running shoes',
        code: 'NIKE-AM-001',
        price: 129.99,
        purchasePrice: 80.00,
        sku: 'NIKE-AM-001',
        barcode: '1234567890125',
        category: 'Clothing',
        supplier: 'Nike Inc.',
        stock: 75,
        reorderPoint: 15,
        isActive: true,
        tags: ['shoes', 'nike', 'running']
      },
      {
        name: 'JavaScript: The Good Parts',
        description: 'Essential JavaScript programming book',
        code: 'BOOK-JS-001',
        price: 29.99,
        purchasePrice: 15.00,
        sku: 'BOOK-JS-001',
        barcode: '1234567890126',
        category: 'Books',
        supplier: 'O\'Reilly Media',
        stock: 100,
        reorderPoint: 20,
        isActive: true,
        tags: ['book', 'programming', 'javascript']
      },
      {
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones',
        code: 'WH-001',
        price: 199.99,
        purchasePrice: 120.00,
        sku: 'WH-001',
        barcode: '1234567890127',
        category: 'Electronics',
        supplier: 'Sony Corporation',
        stock: 25,
        reorderPoint: 5,
        isActive: true,
        tags: ['headphones', 'wireless', 'audio']
      }
      ]);
      console.log(`✅ Created ${products.length} products`);
    } else {
      console.log(`✅ Found existing ${products.length} products`);
    }

    // Create customers
    console.log('👥 Creating customers...');
    let customers = await Customer.find();
    if (customers.length === 0) {
      customers = await Customer.insertMany([
      {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+255123456789',
        address: '123 Main St, Dar es Salaam',
        creditLimit: 1000.00,
        isActive: true
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '+255987654321',
        address: '456 Oak Ave, Arusha',
        creditLimit: 500.00,
        isActive: true
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@email.com',
        phone: '+255555123456',
        address: '789 Pine Rd, Mwanza',
        creditLimit: 750.00,
        isActive: true
      }
      ]);
      console.log(`✅ Created ${customers.length} customers`);
    } else {
      console.log(`✅ Found existing ${customers.length} customers`);
    }

    console.log('🎉 Test data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${categories.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Customers: ${customers.length}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestData();
