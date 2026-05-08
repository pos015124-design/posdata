/**
 * Seller Billing Routes
 * Handles fee tracking and payment confirmation for BHABY GROUP LTD
 *
 * PBZ Account: 0952509001 — BHABY GROUP LTD
 * Fee structure:
 *   - Registration: TZS 300,000 (one-time)
 *   - Ads/Sponsorship: TZS 5,000/month
 *   - Commission: 5% per completed sale
 */
const express = require('express');
const router = express.Router();
const SellerBilling = require('../models/SellerBilling');
const { requireUser } = require('./middleware/auth');
const { logger } = require('../config/logger');

const PBZ_ACCOUNT    = '0952509001';
const PBZ_BANK       = "People's Bank of Zanzibar (PBZ)";
const PBZ_ACCOUNT_NAME = 'BHABY GROUP LTD';
const REGISTRATION_FEE = 300000;
const SUBSCRIPTION_FEE = 5000;
// Commission tracking removed — fees are registration + subscription only

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

/* ── GET /api/billing/info
   Public billing info — shown to sellers on registration and dashboard */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      bankName:       PBZ_BANK,
      accountNumber:  PBZ_ACCOUNT,
      accountName:    PBZ_ACCOUNT_NAME,
      fees: {
        registration: { amount: REGISTRATION_FEE, currency: 'TZS', type: 'one-time' },
        subscription: { amount: SUBSCRIPTION_FEE, currency: 'TZS', type: 'monthly' }
      },
      instructions: [
        `Transfer the exact amount to PBZ account ${PBZ_ACCOUNT} (${PBZ_ACCOUNT_NAME})`,
        'Use your invoice number as the payment reference',
        'Send proof of payment to BHABY GROUP LTD for confirmation',
        'Your account will be activated/updated within 24 hours'
      ]
    }
  });
});

/* ── GET /api/billing/my
   Seller views their own billing records */
router.get('/my', requireUser, async (req, res) => {
  try {
    const records = await SellerBilling.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    const totalOwed = records
      .filter(r => r.status === 'unpaid')
      .reduce((s, r) => s + r.amount, 0);

    const totalPaid = records
      .filter(r => r.status === 'paid')
      .reduce((s, r) => s + r.amount, 0);

    res.json({
      success: true,
      data: {
        records,
        summary: { totalOwed, totalPaid, currency: 'TZS' },
        paymentInfo: {
          bankName: PBZ_BANK,
          accountNumber: PBZ_ACCOUNT,
          accountName: PBZ_ACCOUNT_NAME
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get seller billing', { error: error.message, userId: req.user.userId });
    res.status(500).json({ error: error.message });
  }
});

/* ── POST /api/billing/my/submit-payment
   Seller submits proof of payment (reference number) for a billing record */
router.post('/my/submit-payment', requireUser, async (req, res) => {
  try {
    const { billingId, paymentReference } = req.body;
    if (!billingId || !paymentReference) {
      return res.status(400).json({ error: 'billingId and paymentReference are required' });
    }

    const record = await SellerBilling.findOne({ _id: billingId, userId: req.user.userId });
    if (!record) return res.status(404).json({ error: 'Billing record not found' });
    if (record.status === 'paid') return res.status(400).json({ error: 'Already marked as paid' });

    // Mark as pending confirmation — admin will verify and confirm
    record.paymentReference = paymentReference;
    record.description = (record.description || '') + ` | Payment ref submitted: ${paymentReference}`;
    await record.save();

    res.json({
      success: true,
      message: 'Payment reference submitted. BHABY GROUP LTD will confirm within 24 hours.',
      data: record
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── GET /api/billing/all  (super admin)
   View all seller billing records with optional userId, date range filters */
router.get('/all', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { status, type, userId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type)   query.type   = type;
    if (userId) query.userId = userId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      SellerBilling.find(query)
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SellerBilling.countDocuments(query)
    ]);

    // Aggregate totals for the current filter set
    const [totalsAgg] = await SellerBilling.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUnpaid:  { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, '$amount', 0] } },
          totalPaid:    { $sum: { $cond: [{ $eq: ['$status', 'paid']   }, '$amount', 0] } },
          totalWaived:  { $sum: { $cond: [{ $eq: ['$status', 'waived'] }, '$amount', 0] } },
          totalAmount:  { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        totals: totalsAgg || { totalUnpaid: 0, totalPaid: 0, totalWaived: 0, totalAmount: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── GET /api/billing/summary  (super admin)
   Per-seller summary: group by userId, show totals */
router.get('/summary', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const summary = await SellerBilling.aggregate([
      {
        $group: {
          _id: '$userId',
          businessName: { $first: '$businessName' },
          totalOwed:    { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, '$amount', 0] } },
          totalPaid:    { $sum: { $cond: [{ $eq: ['$status', 'paid']   }, '$amount', 0] } },
          totalWaived:  { $sum: { $cond: [{ $eq: ['$status', 'waived'] }, '$amount', 0] } },
          recordCount:  { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { totalOwed: -1 } }
    ]);

    // Populate user emails
    const User = require('../models/User');
    const userIds = summary.map(s => s._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('email firstName lastName').lean();
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const enriched = summary.map(s => ({
      ...s,
      user: userMap.get(String(s._id)) || null
    }));

    // Platform totals
    const [platformTotals] = await SellerBilling.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: { $sum: { $cond: [{ $eq: ['$status', 'paid']   }, '$amount', 0] } },
          totalOutstanding: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, '$amount', 0] } },
          totalWaived:    { $sum: { $cond: [{ $eq: ['$status', 'waived'] }, '$amount', 0] } },
          totalSellers:   { $addToSet: '$userId' }
        }
      },
      { $project: { totalCollected: 1, totalOutstanding: 1, totalWaived: 1, sellerCount: { $size: '$totalSellers' } } }
    ]);

    res.json({
      success: true,
      data: {
        sellers: enriched,
        platform: platformTotals || { totalCollected: 0, totalOutstanding: 0, totalWaived: 0, sellerCount: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── PUT /api/billing/:id/confirm  (super admin)
   Admin confirms payment received — marks record as paid */
router.put('/:id/confirm', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { paymentReference } = req.body;
    const record = await SellerBilling.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Billing record not found' });

    record.status = 'paid';
    record.paidAt = new Date();
    record.paidBy = req.user.userId;
    if (paymentReference) record.paymentReference = paymentReference;
    await record.save();

    logger.info('Billing payment confirmed', {
      billingId: record._id,
      userId: record.userId,
      amount: record.amount,
      type: record.type,
      confirmedBy: req.user.userId
    });

    res.json({ success: true, message: 'Payment confirmed', data: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── PUT /api/billing/:id/waive  (super admin)
   Admin waives a fee */
router.put('/:id/waive', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const record = await SellerBilling.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Billing record not found' });
    record.status = 'waived';
    record.paidBy = req.user.userId;
    record.paidAt = new Date();
    await record.save();
    res.json({ success: true, message: 'Fee waived', data: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── POST /api/billing/create-registration  (super admin)
   Create a registration fee record for a newly approved seller */
router.post('/create-registration', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { userId, businessId, businessName } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Check if registration fee already exists
    const existing = await SellerBilling.findOne({ userId, type: 'registration' });
    if (existing) return res.status(400).json({ error: 'Registration fee already created for this seller' });

    const record = new SellerBilling({
      userId,
      businessId,
      businessName,
      type: 'registration',
      amount: REGISTRATION_FEE,
      description: 'One-time seller registration fee — E-Shop by BHABY GROUP LTD',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await record.save();

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ── POST /api/billing/create-commission removed — commission fees not used */

module.exports = router;
module.exports.REGISTRATION_FEE = REGISTRATION_FEE;
module.exports.SUBSCRIPTION_FEE = SUBSCRIPTION_FEE;
module.exports.PBZ_ACCOUNT      = PBZ_ACCOUNT;
