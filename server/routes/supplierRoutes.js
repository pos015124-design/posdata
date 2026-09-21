/**
 * Supplier Routes
 * All routes are scoped to the authenticated user — sellers only see their own suppliers.
 *
 * GET    /api/suppliers              — list all suppliers
 * POST   /api/suppliers              — create supplier
 * GET    /api/suppliers/:id          — get single supplier with stock-in history
 * PUT    /api/suppliers/:id          — update supplier profile
 * DELETE /api/suppliers/:id          — delete supplier (and all its stock-in records)
 *
 * POST   /api/suppliers/:id/stock-in — record a new stock delivery
 *        Body: { date, referenceNo, notes, paymentStatus, amountPaid, items: [{productId, productName, quantity, unitCost}] }
 *        Side-effect: increments Product.stock and updates Product.purchasePrice for each item
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Supplier = require('../models/Supplier');
const Product  = require('../models/Product');
const { requireUser } = require('./middleware/auth');
const { logger } = require('../config/logger');

// ── helpers ──────────────────────────────────────────────────────────────────

const userFilter = (req) => ({ userId: req.user.userId });

// ── GET /api/suppliers ────────────────────────────────────────────────────────
router.get('/', requireUser, async (req, res) => {
  try {
    const suppliers = await Supplier.find(userFilter(req))
      .select('-stockIns')          // omit history for list view — load on demand
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, suppliers });
  } catch (err) {
    logger.error('Failed to list suppliers', { error: err.message, userId: req.user.userId });
    res.status(500).json({ error: 'Failed to load suppliers', message: err.message });
  }
});

// ── POST /api/suppliers ───────────────────────────────────────────────────────
router.post('/', requireUser, async (req, res) => {
  try {
    const { name, contactName, phone, email, address, paymentTerms, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Supplier name is required' });

    const supplier = new Supplier({
      userId: req.user.userId,
      name: name.trim(),
      contactName, phone, email, address, paymentTerms, notes
    });
    await supplier.save();
    res.status(201).json({ success: true, supplier });
  } catch (err) {
    logger.error('Failed to create supplier', { error: err.message, userId: req.user.userId });
    res.status(400).json({ error: 'Failed to create supplier', message: err.message });
  }
});

// ── GET /api/suppliers/:id ────────────────────────────────────────────────────
router.get('/:id', requireUser, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...userFilter(req) }).lean();
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load supplier', message: err.message });
  }
});

// ── PUT /api/suppliers/:id ────────────────────────────────────────────────────
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { name, contactName, phone, email, address, paymentTerms, notes, isActive } = req.body;
    const supplier = await Supplier.findOne({ _id: req.params.id, ...userFilter(req) });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    if (name !== undefined)         supplier.name         = name.trim();
    if (contactName !== undefined)  supplier.contactName  = contactName;
    if (phone !== undefined)        supplier.phone        = phone;
    if (email !== undefined)        supplier.email        = email;
    if (address !== undefined)      supplier.address      = address;
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms;
    if (notes !== undefined)        supplier.notes        = notes;
    if (isActive !== undefined)     supplier.isActive     = isActive;

    await supplier.save();
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update supplier', message: err.message });
  }
});

// ── DELETE /api/suppliers/:id ─────────────────────────────────────────────────
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, ...userFilter(req) });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier', message: err.message });
  }
});

// ── POST /api/suppliers/:id/stock-in ─────────────────────────────────────────
router.post('/:id/stock-in', requireUser, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...userFilter(req) });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const { date, referenceNo, notes, paymentStatus, amountPaid, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate every product and value before changing the supplier record.
    const enrichedItems = [];
    let deliveryTotal = 0;
    const productIds = items.map(item => item.productId).filter(Boolean);
    const ownedProducts = await Product.find({
      _id: { $in: productIds },
      userId: req.user.userId
    }).select('_id name');
    const ownedProductIds = new Set(ownedProducts.map(product => String(product._id)));

    for (const item of items) {
      if (!item.productId || item.quantity === undefined || item.unitCost === undefined) {
        return res.status(400).json({ error: 'Each item needs productId, quantity, and unitCost' });
      }
      const qty  = Number(item.quantity);
      const cost = Number(item.unitCost);
      if (!Number.isInteger(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer and unitCost must be non-negative' });
      }
      if (!ownedProductIds.has(String(item.productId))) {
        return res.status(403).json({ error: 'All products must belong to your account' });
      }
      const lineTotal = qty * cost;
      enrichedItems.push({
        productId:   item.productId,
        productName: item.productName || 'Unknown product',
        quantity:    qty,
        unitCost:    cost,
        totalCost:   lineTotal
      });
      deliveryTotal += lineTotal;
    }

    const paid = Number(amountPaid) || 0;

    // Build stock-in record
    const stockIn = {
      date:          date ? new Date(date) : new Date(),
      referenceNo:   referenceNo || '',
      notes:         notes || '',
      items:         enrichedItems,
      totalCost:     deliveryTotal,
      paymentStatus: paymentStatus || 'unpaid',
      amountPaid:    paid
    };

    // MongoDB can abort one of two legitimate concurrent transactions with a
    // transient write conflict. Retry the complete transaction, never just a
    // subset of its writes, so each committed stock-in remains all-or-nothing.
    let committed = false;
    let lastTransactionError;
    for (let attempt = 0; attempt < 3 && !committed; attempt += 1) {
      const dbSession = await mongoose.startSession();
      try {
        dbSession.startTransaction();

        const supplierUpdate = await Supplier.updateOne(
          { _id: supplier._id, userId: req.user.userId },
          {
            $push: { stockIns: stockIn },
            $inc: {
              totalSpent: deliveryTotal,
              totalOwed: Math.max(0, deliveryTotal - paid)
            }
          },
          { session: dbSession }
        );
        if (supplierUpdate.modifiedCount !== 1) {
          throw new Error('Supplier update failed; stock-in rolled back');
        }

        for (const item of enrichedItems) {
          const updated = await Product.findOneAndUpdate(
            { _id: item.productId, userId: req.user.userId },
            {
              $inc: { stock: item.quantity },
              $set: { purchasePrice: item.unitCost, supplier: supplier.name }
            },
            { session: dbSession, new: true }
          );
          if (!updated) throw new Error('Product update failed; stock-in rolled back');
        }
        await dbSession.commitTransaction();
        committed = true;
      } catch (error) {
        lastTransactionError = error;
        if (dbSession.inTransaction()) await dbSession.abortTransaction();
        const transient = error.hasErrorLabel?.('TransientTransactionError') ||
          /WriteConflict|TransientTransactionError|NoSuchTransaction/i.test(error.message || '');
        if (!transient || attempt === 2) throw error;
      } finally {
        await dbSession.endSession();
      }
    }
    if (!committed) throw lastTransactionError || new Error('Stock-in transaction failed');

    const savedSupplier = await Supplier.findOne({ _id: supplier._id, ...userFilter(req) }).lean();
    const savedStockIn = savedSupplier?.stockIns?.[savedSupplier.stockIns.length - 1];

    logger.info('Stock-in recorded', {
      supplierId: supplier._id,
      userId: req.user.userId,
      itemCount: enrichedItems.length,
      total: deliveryTotal
    });

    res.status(201).json({
      success: true,
      message: `Stock-in recorded. ${enrichedItems.length} product(s) updated.`,
      stockIn: savedStockIn,
      supplierTotals: { totalSpent: savedSupplier?.totalSpent || 0, totalOwed: savedSupplier?.totalOwed || 0 }
    });
  } catch (err) {
    logger.error('Failed to record stock-in', { error: err.message, userId: req.user.userId });
    res.status(500).json({ error: 'Failed to record stock-in', message: err.message });
  }
});

module.exports = router;
