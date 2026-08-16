const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const SaleService = require('../services/saleService');
const { requireUser } = require('./middleware/auth');
const { requireCustomer } = require('./customerAuthRoutes');
const {
  saleValidation,
  mongoIdValidation,
  handleValidationErrors
} = require('../middleware/validation');

// Get all sales - SCOPED TO CURRENT USER
router.get('/', requireUser, async (req, res) => {
  try {
    const result = await SaleService.getAllSales({}, {}, req.user.userId);
    
    // Format sales for frontend.
    // MIDDLEMAN MODEL: For storefront orders, customer contact details are
    // NEVER sent to the seller. Only BHABY GROUP LTD (super_admin) can see
    // buyer information. Sellers only see what to prepare and the order total.
    const isSuperAdmin = req.user.role === 'super_admin';

    // Cancelled (failed-payment) and refunded sales are not actionable orders
    // — hide them from the order list for everyone. Super admins review
    // cancelled orders in the Delivery hub (paymentStatus filter); old ones
    // are archived by scripts/archive-cancelled-sales.js, so the audit trail
    // is never lost.
    const visibleSales = result.data.filter(sale => !['cancelled', 'refunded'].includes(sale.status || 'completed'));

    const sales = visibleSales.map(sale => {
      const isStorefront = (sale.source || 'pos') === 'storefront';

      return {
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        items: sale.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        amountPaid: sale.amountPaid,
        change: sale.change,
        status: sale.status || 'completed',
        source: sale.source || 'pos',
        notes: sale.notes || '',
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        // Customer info: only visible to super_admin.
        // Sellers see nothing for storefront orders — BHABY GROUP LTD is the middleman.
        customerName:    (isSuperAdmin || !isStorefront) ? (sale.customerName    || '') : '',
        customerEmail:   (isSuperAdmin || !isStorefront) ? (sale.customerEmail   || '') : '',
        customerPhone:   (isSuperAdmin || !isStorefront) ? (sale.customerPhone   || '') : '',
        customerAddress: (isSuperAdmin || !isStorefront) ? (sale.customerAddress || '') : '',
        customerCity:    (isSuperAdmin || !isStorefront) ? (sale.customerCity    || '') : '',
        // Flag so the frontend knows this is a managed order
        isManagedOrder: isStorefront && !isSuperAdmin,
      };
    });
    
    console.log(`[Sales API] Returning ${sales.length} sales for user ${req.user.userId}`);
    
    res.json({ 
      sales,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get recent sales - SCOPED TO CURRENT USER
router.get('/recent', requireUser, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const sales = await SaleService.getRecentSales(limit, req.user.userId);
    
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

// ── CUSTOMER PORTAL (storefront buyers) ───────────────────────────────────────
// Storefront checkout creates Sale records. Buyers authenticate via
// /api/customer-auth (customerAccessToken) and see sales linked to their account
// — matched by customerId, or by email for guest-checkout purchases.

// GET /api/sales/customer/my-orders — customer's orders (requires customer auth)
router.get('/customer/my-orders', requireCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const customerId = req.customer.customerId;
    const email = (req.customer.email || '').toLowerCase();

    const query = {
      $or: [{ customerId }, { customerEmail: email }]
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Sale.countDocuments(query)
    ]);

    const orders = sales.map(sale => ({
      _id: sale._id,
      invoiceNumber: sale.invoiceNumber,
      status: sale.status,
      deliveryStatus: sale.deliveryStatus,
      paymentStatus: sale.paymentStatus,
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      itemsCount: (sale.items || []).reduce((n, i) => n + (i.quantity || 0), 0),
      createdAt: sale.createdAt
    }));

    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales/customer/:id — one of the customer's orders (requires customer auth)
router.get('/customer/:id', requireCustomer, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const email = (req.customer.email || '').toLowerCase();

    const sale = await Sale.findOne({
      _id: req.params.id,
      $or: [{ customerId }, { customerEmail: email }]
    }).lean();

    if (!sale) return res.status(404).json({ error: 'Order not found' });

    res.json({
      success: true,
      sale: {
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        deliveryStatus: sale.deliveryStatus,
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        amountPaid: sale.amountPaid,
        items: (sale.items || []).map(i => ({
          productName: i.productName || i.name,
          quantity: i.quantity,
          price: i.price,
          total: i.total
        })),
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        customerAddress: sale.customerAddress,
        customerCity: sale.customerCity,
        notes: sale.notes,
        riderName: sale.riderName,
        riderPhone: sale.riderPhone,
        assignedAt: sale.assignedAt,
        collectedAt: sale.collectedAt,
        deliveredAt: sale.deliveredAt,
        deliveryNotes: sale.deliveryNotes,
        createdAt: sale.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching customer order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sale by ID - WITH OWNERSHIP CHECK
router.get('/:id', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    const sale = await SaleService.getSaleById(req.params.id, req.user.userId);
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

// Get sales summary - SCOPED TO CURRENT USER
router.get('/summary', requireUser, async (req, res) => {
  try {
    const summary = await SaleService.getSalesSummary(req.user.userId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new sale (simple endpoint for checkout/POS)
router.post('/', requireUser, async (req, res) => {
  try {
    const { items, total, paymentMethod, customer, notes } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    
    // Create sale object
    const saleData = {
      items: items.map(item => ({
        product: item.product || item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: parseFloat(total || 0),
      paymentMethod,
      customer,
      notes,
      taxRate: 0,
      amountPaid: parseFloat(total || 0)
    };
    
    // Process the sale
    const result = await SaleService.processSale(saleData, req.user.userId);
    
    res.status(201).json({
      success: true,
      sale: result.sale || result
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;