const express = require('express');
const router = express.Router();
const SaleService = require('../services/saleService');
const { requireUser } = require('./middleware/auth');
const {
  saleValidation,
  mongoIdValidation,
  handleValidationErrors
} = require('../middleware/validation');

// Get all sales
router.get('/', requireUser, async (req, res) => {
  try {
    const sales = await SaleService.getAllSales();
    res.json({ sales });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get recent sales
router.get('/recent', requireUser, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const sales = await SaleService.getRecentSales(limit);
    
    // Format the response to match frontend expectations
    const formattedSales = sales.map(sale => ({
      _id: sale._id,
      items: sale.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: sale.subtotal,
      tax: sale.tax,
      taxRate: sale.taxRate || 0, // Include tax rate, default to 0 if not present
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      date: sale.createdAt,
      customer: sale.customer ? {
        _id: sale.customer._id,
        name: sale.customer.name
      } : undefined
    }));
    
    res.json({ sales: formattedSales });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get sale by ID
router.get('/:id', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    const sale = await SaleService.getSaleById(req.params.id);
    res.json({ sale });
  } catch (error) {
    console.error('Error fetching sale:', error);
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Process payment/sale
router.post('/payment/process', requireUser, saleValidation, handleValidationErrors, async (req, res) => {
  try {
    const { items, paymentMethod, customerId, discounts, notes, amountPaid, taxRate, transactionNumber } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required and must be an array' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    
    // Process the sale
    const result = await SaleService.processSale(
      {
        items,
        paymentMethod,
        customerId,
        discounts,
        notes,
        amountPaid: parseFloat(amountPaid || 0),
        taxRate: parseFloat(taxRate || 0),
        transactionNumber
      },
      req.user.userId
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// Generate receipt
router.post('/receipt', requireUser, mongoIdValidation('saleId'), handleValidationErrors, async (req, res) => {
  try {
    const { saleId } = req.body;
    
    if (!saleId) {
      return res.status(400).json({ message: 'Sale ID is required' });
    }
    
    const receipt = await SaleService.generateReceipt(saleId);
    res.json(receipt);
  } catch (error) {
    console.error('Error generating receipt:', error);
    if (error.message === 'Sale not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get sales summary
router.get('/summary', requireUser, async (req, res) => {
  try {
    const summary = await SaleService.getSalesSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;