/**
 * Migration: Populate Seller and SellerInventory from existing users and products
 * Run this script once to bootstrap initial multi-vendor data
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SellerInventory = require('../models/SellerInventory');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dukani', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // 1. Create Seller for each business_admin user (if not already present)
  const adminUsers = await User.find({ role: 'business_admin' });
  for (const user of adminUsers) {
    let seller = await Seller.findOne({ userId: user._id });
    if (!seller) {
      seller = new Seller({
        userId: user._id,
        businessName: user.firstName + ' ' + user.lastName,
        contactEmail: user.email,
        status: 'active',
        isVerified: true
      });
      await seller.save();
      console.log(`Created Seller for user ${user.email}`);
    }
  }

  // 2. For each product, create SellerInventory for each seller (with default price/stock)
  const sellers = await Seller.find();
  const products = await Product.find();
  for (const seller of sellers) {
    for (const product of products) {
      const exists = await SellerInventory.findOne({ seller: seller._id, product: product._id });
      if (!exists) {
        const inv = new SellerInventory({
          seller: seller._id,
          product: product._id,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          purchasePrice: product.purchasePrice,
          stock: product.stock,
          trackInventory: product.trackInventory,
          allowBackorder: product.allowBackorder,
          reorderPoint: product.reorderPoint,
          barcode: product.barcode,
          sku: product.sku,
          isActive: true
        });
        await inv.save();
        console.log(`Created SellerInventory for seller ${seller._id} and product ${product._id}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Migration complete.');
}

if (require.main === module) {
  migrate().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
