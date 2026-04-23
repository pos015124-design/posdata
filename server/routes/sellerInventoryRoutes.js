const express = require('express');
const router = express.Router();
const SellerInventory = require('../models/SellerInventory');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const { requireUser } = require('../middleware/validation');

// Get seller's own inventory
router.get('/', requireUser, async (req, res) => {
  try {
    // Find seller by userId
    const seller = await Seller.findOne({ userId: req.user.userId });
    
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Get seller's inventory items with product details
    const inventoryItems = await SellerInventory.find({ seller: seller._id })
      .populate('product', 'name code barcode category description images')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      inventory: inventoryItems,
      seller: {
        id: seller._id,
        name: seller.businessName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add product to seller's inventory
router.post('/', requireUser, async (req, res) => {
  try {
    const { productId, price, purchasePrice, stock, barcode, sku, reorderPoint } = req.body;

    // Find seller
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Check if product exists in catalog
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found in catalog' });
    }

    // Check if seller already has this product
    const existingInventory = await SellerInventory.findOne({
      seller: seller._id,
      product: productId
    });

    if (existingInventory) {
      return res.status(400).json({ error: 'Product already in your inventory' });
    }

    // Create seller inventory item
    const inventoryItem = new SellerInventory({
      seller: seller._id,
      product: productId,
      price: price || product.price,
      purchasePrice: purchasePrice || product.purchasePrice,
      stock: stock || 0,
      barcode: barcode || product.barcode,
      sku,
      reorderPoint: reorderPoint || 10
    });

    await inventoryItem.save();

    // Update seller's product count
    const totalProducts = await SellerInventory.countDocuments({ seller: seller._id });
    await seller.updateProductCount(totalProducts);

    res.status(201).json({ 
      success: true, 
      inventory: inventoryItem 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update seller's inventory item (price, stock, etc.)
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { price, purchasePrice, stock, barcode, sku, reorderPoint } = req.body;

    // Find seller
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Find inventory item and ensure it belongs to this seller
    const inventoryItem = await SellerInventory.findOne({
      _id: req.params.id,
      seller: seller._id
    }).populate('product');

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Update fields
    if (price !== undefined) inventoryItem.price = price;
    if (purchasePrice !== undefined) inventoryItem.purchasePrice = purchasePrice;
    if (stock !== undefined) inventoryItem.stock = stock;
    if (barcode !== undefined) inventoryItem.barcode = barcode;
    if (sku !== undefined) inventoryItem.sku = sku;
    if (reorderPoint !== undefined) inventoryItem.reorderPoint = reorderPoint;

    await inventoryItem.save();

    res.json({ 
      success: true, 
      inventory: inventoryItem 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete seller's inventory item
router.delete('/:id', requireUser, async (req, res) => {
  try {
    // Find seller
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Find and delete inventory item
    const inventoryItem = await SellerInventory.findOneAndDelete({
      _id: req.params.id,
      seller: seller._id
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Update seller's product count
    const totalProducts = await SellerInventory.countDocuments({ seller: seller._id });
    await seller.updateProductCount(totalProducts);

    res.json({ 
      success: true, 
      message: 'Product removed from your inventory' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available catalog products (products seller hasn't added yet)
router.get('/catalog/available', requireUser, async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Get products seller already has
    const sellerInventories = await SellerInventory.find({ seller: seller._id });
    const existingProductIds = sellerInventories.map(inv => inv.product);

    // Get catalog products seller doesn't have
    const availableProducts = await Product.find({
      _id: { $nin: existingProductIds },
      status: 'active'
    }).select('name code barcode category description images price purchasePrice');

    res.json({ 
      success: true, 
      products: availableProducts 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk add products to seller inventory
router.post('/bulk', requireUser, async (req, res) => {
  try {
    const { products } = req.body; // Array of { productId, price, stock }

    const seller = await Seller.findOne({ userId: req.user.userId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const item of products) {
      try {
        // Check if already exists
        const existing = await SellerInventory.findOne({
          seller: seller._id,
          product: item.productId
        });

        if (existing) {
          results.failed++;
          results.errors.push(`Product ${item.productId} already in inventory`);
          continue;
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          results.failed++;
          results.errors.push(`Product ${item.productId} not found`);
          continue;
        }

        const inventoryItem = new SellerInventory({
          seller: seller._id,
          product: item.productId,
          price: item.price || product.price,
          purchasePrice: product.purchasePrice,
          stock: item.stock || 0,
          barcode: product.barcode,
          reorderPoint: 10
        });

        await inventoryItem.save();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
      }
    }

    // Update seller's product count
    const totalProducts = await SellerInventory.countDocuments({ seller: seller._id });
    await seller.updateProductCount(totalProducts);

    res.json({ 
      success: true, 
      message: `Added ${results.success} products to inventory`,
      results 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
