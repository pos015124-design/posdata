const express = require('express');
const router = express.Router();
const InventoryService = require('../services/inventoryService');
const ProductService = require('../services/productService');
const { requireUser } = require('./middleware/auth');

// Get low stock alerts
router.get('/alerts', requireUser, async (req, res) => {
  try {
    const alerts = await InventoryService.getLowStockAlerts();
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update product stock
router.put('/update', requireUser, async (req, res) => {
  try {
    const { productId, stock } = req.body;
    
    if (!productId || stock === undefined) {
      return res.status(400).json({ message: 'Product ID and stock are required' });
    }
    
    // First get the product to include name in response
    const product = await ProductService.getProductById(productId);
    
    // Update stock and create inventory record
    await InventoryService.updateStock(
      productId, 
      parseInt(stock), 
      req.user.userId, 
      req.body.notes
    );
    
    res.json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        stock: parseInt(stock)
      }
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Restock product
router.post('/restock', requireUser, async (req, res) => {
  try {
    const { productId, quantity, unitCost, sellingPrice, supplierId, invoiceNumber, notes } = req.body;
    
    if (!productId || !quantity || !unitCost || !supplierId || !invoiceNumber) {
      return res.status(400).json({
        message: 'Product ID, quantity, unit cost, supplier ID, and invoice number are required'
      });
    }
    
    const restock = await InventoryService.restockProduct(
      {
        productId,
        quantity: parseInt(quantity),
        unitCost: parseFloat(unitCost),
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        supplierId,
        invoiceNumber,
        notes
      },
      req.user.userId
    );
    
    // Get the updated product
    const product = await ProductService.getProductById(productId);
    
    res.status(201).json({
      success: true,
      restock: {
        _id: restock._id,
        productId,
        quantity: parseInt(quantity),
        unitCost: parseFloat(unitCost),
        totalCost: restock.totalCost,
        supplierId,
        invoiceNumber,
        notes,
        date: restock.createdAt
      }
    });
  } catch (error) {
    console.error('Error restocking product:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Get restock history
router.get('/restock-history', requireUser, async (req, res) => {
  try {
    const history = await InventoryService.getRestockHistory();
    
    // Format the response to match frontend expectations
    const formattedHistory = history.map(record => ({
      _id: record._id,
      productId: record.product,
      productName: record.productName,
      quantity: record.quantity,
      unitCost: record.unitCost,
      totalCost: record.totalCost,
      supplierName: record.supplier,
      invoiceNumber: record.invoiceNumber,
      notes: record.notes,
      date: record.createdAt
    }));
    
    res.json({ history: formattedHistory });
  } catch (error) {
    console.error('Error fetching restock history:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;