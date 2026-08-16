/**
 * Delivery Routes — BHABY GROUP LTD Middleman Model
 *
 * Rider management + order delivery workflow for super_admin only.
 *
 * RIDERS
 *   GET    /api/delivery/riders              — list all riders
 *   POST   /api/delivery/riders              — add rider
 *   PUT    /api/delivery/riders/:id          — update rider
 *   DELETE /api/delivery/riders/:id          — deactivate rider
 *
 * ORDER DELIVERY WORKFLOW
 *   GET    /api/delivery/orders              — all storefront orders with delivery status
 *   PUT    /api/delivery/orders/:id/assign   — assign rider to order
 *   PUT    /api/delivery/orders/:id/collect  — mark collected from seller
 *   PUT    /api/delivery/orders/:id/deliver  — mark delivered to buyer
 *   PUT    /api/delivery/orders/:id/fail     — mark delivery failed
 */
const express = require('express');
const router  = express.Router();
const Rider   = require('../models/Rider');
const Sale    = require('../models/Sale');
const ArchivedSale = require('../models/ArchivedSale');
const SaleService  = require('../services/saleService');
const { requireUser } = require('./middleware/auth');
const { logger } = require('../config/logger');
const {
  sendOrderConfirmedToBuyer,
  sendRiderAssignedToBuyer,
  sendOrderDeliveredToBuyer,
} = require('../utils/emailService');

// All delivery routes require super_admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// ── RIDERS ────────────────────────────────────────────────────────────────────

// GET /api/delivery/riders
router.get('/riders', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const riders = await Rider.find().sort({ name: 1 }).lean();
    res.json({ success: true, riders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery/riders
router.post('/riders', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { name, phone, email, vehicle, vehiclePlate, notes } = req.body;
    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const rider = new Rider({ name, phone, email, vehicle, vehiclePlate, notes, createdBy: req.user.userId });
    await rider.save();
    res.status(201).json({ success: true, rider });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/delivery/riders/:id
router.put('/riders/:id', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { name, phone, email, vehicle, vehiclePlate, notes, isActive } = req.body;
    const rider = await Rider.findById(req.params.id);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });
    if (name !== undefined)         rider.name         = name;
    if (phone !== undefined)        rider.phone        = phone;
    if (email !== undefined)        rider.email        = email;
    if (vehicle !== undefined)      rider.vehicle      = vehicle;
    if (vehiclePlate !== undefined) rider.vehiclePlate = vehiclePlate;
    if (notes !== undefined)        rider.notes        = notes;
    if (isActive !== undefined)     rider.isActive     = isActive;
    await rider.save();
    res.json({ success: true, rider });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/delivery/riders/:id  (soft delete — sets isActive: false)
router.delete('/riders/:id', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const rider = await Rider.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!rider) return res.status(404).json({ error: 'Rider not found' });
    res.json({ success: true, message: 'Rider deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORDER DELIVERY WORKFLOW ───────────────────────────────────────────────────

// GET /api/delivery/orders  — storefront orders with delivery info
//   ?paymentStatus=paid    (default) active pipeline — orders that were paid
//   ?paymentStatus=failed  cancelled/abandoned orders, review-only
//   ?paymentStatus=refunded refunded orders, review-only
//   ?paymentStatus=all     everything (pending + paid + failed + refunded)
router.get('/orders', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { status, riderId, paymentStatus = 'paid', page = 1, limit = 50 } = req.query;
    // Only orders that were actually paid belong in the delivery pipeline.
    // Pending (payment in flight) and cancelled/failed (abandoned) sales are
    // excluded from the default view — you don't dispatch a rider for an order
    // nobody paid for. Super admins can still review failed ones explicitly.
    const query = { source: 'storefront' };
    if (paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (status)  query.deliveryStatus = status;
    if (riderId) query.riderId = riderId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Sale.find(query)
        .populate('riderId', 'name phone vehicle vehiclePlate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Sale.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/delivery/orders/:id/assign  — assign rider, send email to buyer
router.put('/orders/:id/assign', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { riderId, notes } = req.body;
    if (!riderId) return res.status(400).json({ error: 'riderId is required' });

    const [order, rider] = await Promise.all([
      Sale.findById(req.params.id),
      Rider.findById(riderId)
    ]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!rider) return res.status(404).json({ error: 'Rider not found' });
    if (order.source !== 'storefront') {
      return res.status(400).json({ error: 'Only storefront orders can be assigned to riders' });
    }

    order.riderId        = rider._id;
    order.riderName      = rider.name;
    order.riderPhone     = rider.phone;
    order.deliveryStatus = 'assigned';
    order.assignedAt     = new Date();
    if (notes) order.deliveryNotes = notes;
    await order.save();

    // Publish SSE update to any subscribers for this invoice
    try {
      const { publish } = require('../utils/sse');
      publish(order.invoiceNumber, 'delivery:update', {
        deliveryStatus: order.deliveryStatus,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        assignedAt: order.assignedAt
      });
    } catch (e) {
      logger.error('SSE publish failed', { error: e.message });
    }

    // Increment rider delivery count
    await Rider.findByIdAndUpdate(riderId, { $inc: { totalDeliveries: 1 } });

    // Email buyer
    if (order.customerEmail) {
      sendRiderAssignedToBuyer({
        buyerEmail:    order.customerEmail,
        buyerName:     order.customerName,
        invoiceNumber: order.invoiceNumber,
        riderName:     rider.name,
        riderPhone:    rider.phone,
        total:         order.total
      }).catch(e => logger.error('Failed to send rider assigned email', { error: e.message }));
    }

    logger.info('Rider assigned to order', { orderId: order._id, riderId, adminId: req.user.userId });
    res.json({ success: true, message: `Rider ${rider.name} assigned`, order });
  } catch (err) {
    logger.error('Failed to assign rider', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/delivery/orders/:id/collect  — rider collected from seller
router.put('/orders/:id/collect', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const order = await Sale.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.deliveryStatus = 'out_for_delivery';
    order.collectedAt    = new Date();
    await order.save();

    try { const { publish } = require('../utils/sse'); publish(order.invoiceNumber, 'delivery:update', { deliveryStatus: order.deliveryStatus, collectedAt: order.collectedAt }); } catch(e){ logger.error('SSE publish failed', { error: e.message }); }

    logger.info('Order collected from seller', { orderId: order._id, adminId: req.user.userId });
    res.json({ success: true, message: 'Marked as collected — out for delivery', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/delivery/orders/:id/deliver  — delivered to buyer, send confirmation email
router.put('/orders/:id/deliver', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const order = await Sale.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.deliveryStatus = 'delivered';
    order.deliveredAt    = new Date();
    order.status         = 'completed';
    await order.save();

    // Publish SSE update
    try { const { publish } = require('../utils/sse'); publish(order.invoiceNumber, 'delivery:update', { deliveryStatus: order.deliveryStatus, deliveredAt: order.deliveredAt }); } catch(e){ logger.error('SSE publish failed', { error: e.message }); }

    // Email buyer
    if (order.customerEmail) {
      sendOrderDeliveredToBuyer({
        buyerEmail:    order.customerEmail,
        buyerName:     order.customerName,
        invoiceNumber: order.invoiceNumber,
        total:         order.total
      }).catch(e => logger.error('Failed to send delivery confirmation email', { error: e.message }));
    }

    logger.info('Order delivered', { orderId: order._id, adminId: req.user.userId });
    res.json({ success: true, message: 'Order marked as delivered', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delivery/orders/:id/refund  — refund a paid order, restore stock
router.post('/orders/:id/refund', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await SaleService.refundSale(req.params.id, {
      reason: (reason || '').trim(),
      refundedBy: req.user.userId
    });
    if (result.alreadyRefunded) {
      return res.json({ success: true, message: 'Order was already refunded', order: result.sale });
    }
    logger.info('Order refunded', { orderId: req.params.id, reason, adminId: req.user.userId });
    res.json({ success: true, message: 'Order refunded — stock restored', order: result.sale });
  } catch (err) {
    logger.error('Refund failed', { error: err.message, orderId: req.params.id });
    res.status(400).json({ error: err.message });
  }
});

// GET /api/delivery/archived — cancelled sales archived after retention (review-only)
//   ?search=INV-...  partial invoice match
//   ?page=&limit=    pagination
router.get('/archived', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search && String(search).trim()) {
      query.invoiceNumber = { $regex: String(search).trim(), $options: 'i' };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      ArchivedSale.find(query)
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ArchivedSale.countDocuments(query)
    ]);
    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/delivery/orders/:id/fail  — delivery failed
router.put('/orders/:id/fail', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Sale.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.deliveryStatus = 'failed';
    if (reason) order.deliveryNotes = reason;
    await order.save();

    try { const { publish } = require('../utils/sse'); publish(order.invoiceNumber, 'delivery:update', { deliveryStatus: order.deliveryStatus, deliveryNotes: order.deliveryNotes }); } catch(e){ logger.error('SSE publish failed', { error: e.message }); }

    logger.info('Order delivery failed', { orderId: order._id, reason, adminId: req.user.userId });
    res.json({ success: true, message: 'Delivery marked as failed', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
