/**
 * Selcom Checkout payment routes (public — guest storefront).
 *
 * Flow:
 *   POST /api/public/payments/selcom/initiate   — validate cart, create PENDING sales (stock
 *                                                 reserved), create Selcom order, trigger USSD
 *                                                 push (mobile) or build card gateway URL (card)
 *   GET  /api/public/payments/selcom/status     — poll local + Selcom status (frontend polls 3s)
 *   POST /api/public/payments/selcom/callback   — Selcom webhook: verify signature, mark sales
 *                                                 paid (idempotent), fire notifications
 *
 * A PaymentSession ties ONE Selcom order to the multiple pending sales of a checkout
 * (one sale per seller). Cash checkout is untouched and stays on /api/public/checkout.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const SaleService = require('../services/saleService');
const selcomService = require('../services/selcomService');
const { verifyWebhookSignature } = require('../utils/selcomHelper');
const { logger } = require('../config/logger');
const PaymentSession = require('../models/PaymentSession');

const initiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});

const SESSION_TTL_MS = (parseInt(process.env.SELCOM_SESSION_TTL_MINUTES, 10) || 15) * 60 * 1000;
const SELCOM_SYNC_INTERVAL_MS = 20 * 1000; // min gap between Selcom order-status calls per session

function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SEL-${ts}-${rand}`;
}

function isSuccess(resultCode, result, paymentStatus) {
  const code = String(resultCode || '').trim();
  const r = String(result || '').toUpperCase();
  const ps = String(paymentStatus || '').toUpperCase();
  return code === '000' || r === 'SUCCESS' || ['COMPLETED', 'SUCCESS', 'PAID'].includes(ps);
}

function isFailure(resultCode, result, paymentStatus) {
  const code = String(resultCode || '').trim();
  const r = String(result || '').toUpperCase();
  const ps = String(paymentStatus || '').toUpperCase();
  return r === 'FAIL' || ['FAILED', 'FAIL', 'CANCELLED', 'EXPIRED'].includes(ps) || (code && code !== '000');
}

/**
 * POST /api/public/payments/selcom/initiate
 * Body: { items: [{product, quantity}], paymentMethod: 'mobile'|'card', customer, notes }
 */
router.post('/selcom/initiate', initiateLimiter, async (req, res) => {
  try {
    const { items, paymentMethod, customer, notes } = req.body;

    if (paymentMethod !== 'mobile' && paymentMethod !== 'card') {
      return res.status(400).json({ error: 'paymentMethod must be "mobile" or "card"' });
    }
    if (!customer?.phone) {
      return res.status(400).json({ error: 'A phone number is required for online payment' });
    }
    if (!selcomService.isConfigured()) {
      return res.status(503).json({
        error: 'Online payment is not configured yet. Please pay on delivery.',
        message: 'SELCOM credentials are missing on the server.'
      });
    }

    // 1. Create pending sales (one per seller) + reserve stock. Throws on invalid cart.
    const result = await SaleService.processPendingPublicOrder({
      items,
      paymentMethod,
      customer,
      notes
    });

    const orderId = generateOrderId();
    const session = new PaymentSession({
      selcomOrderId: orderId,
      vendor: process.env.SELCOM_VENDOR || '',
      amount: result.total,
      currency: 'TZS',
      method: paymentMethod,
      phone: customer.phone,
      customer: {
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || ''
      },
      notes: notes || '',
      sales: result.sales.map((s) => ({
        saleId: s._id,
        invoiceNumber: s.invoiceNumber,
        total: s.total,
        sellerId: s.createdBy
      })),
      status: 'pending',
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });

    // 2. Create the Selcom order. On failure: roll back reserved stock immediately.
    let selcomOrder;
    try {
      selcomOrder = await selcomService.createOrder({
        orderId,
        amount: result.total,
        customer,
        noOfItems: items.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 1), 0),
        redirectUrl: `${process.env.FRONTEND_URL || ''}/checkout?order=${orderId}`
      });
    } catch (err) {
      await SaleService.releasePendingSales(result.sales.map((s) => s._id));
      logger.error('[Selcom] create-order failed', { error: err.message, orderId });
      return res.status(502).json({
        error: 'Payment provider could not create the order. Please try again.',
        message: err.message
      });
    }

    const orderResult = selcomOrder?.result || '';
    const orderCode = selcomOrder?.resultcode || '';
    if (isFailure(orderCode, orderResult)) {
      await SaleService.releasePendingSales(result.sales.map((s) => s._id));
      logger.warn('[Selcom] create-order rejected', { orderId, result: selcomOrder });
      return res.status(502).json({
        error: selcomOrder?.message || 'Payment provider rejected the order. Please try again.'
      });
    }

    // 3. Trigger the collection method.
    let redirectUrl = null;
    let pushResponse = null;
    try {
      if (paymentMethod === 'mobile') {
        pushResponse = await selcomService.walletPayment({
          orderId,
          msisdn: customer.phone
        });
        session.result = pushResponse?.result || '';
        session.resultcode = pushResponse?.resultcode || '';
        session.message = pushResponse?.message || '';
        session.reference = pushResponse?.reference || '';
        if (isFailure(pushResponse?.resultcode, pushResponse?.result)) {
          await SaleService.releasePendingSales(result.sales.map((s) => s._id));
          session.status = 'failed';
          session.failedAt = new Date();
          await session.save();
          logger.warn('[Selcom] wallet push rejected', { orderId, result: pushResponse });
          return res.status(502).json({
            error: pushResponse?.message || 'Could not trigger the mobile money prompt. Please try again.'
          });
        }
      } else {
        const till = await selcomService.createTillAlias({ orderId });
        redirectUrl = till.redirectUrl;
        session.result = till.raw?.result || '';
        session.resultcode = till.raw?.resultcode || '';
        session.message = till.raw?.message || '';
        if (isFailure(till.raw?.resultcode, till.raw?.result)) {
          await SaleService.releasePendingSales(result.sales.map((s) => s._id));
          session.status = 'failed';
          session.failedAt = new Date();
          await session.save();
          logger.warn('[Selcom] till-alias rejected', { orderId, result: till.raw });
          return res.status(502).json({
            error: till.raw?.message || 'Could not start card payment. Please try again.'
          });
        }
        session.redirectUrl = redirectUrl;
      }
    } catch (err) {
      await SaleService.releasePendingSales(result.sales.map((s) => s._id));
      session.status = 'failed';
      session.failedAt = new Date();
      await session.save().catch(() => {});
      logger.error('[Selcom] collection trigger failed', { error: err.message, orderId });
      // Surface the real cause to the frontend (shown as the modal's detail line)
      // so a failed push is never a mystery — friendly copy stays in `error`.
      return res.status(502).json({
        error: 'Payment prompt failed. No money was taken — please try again.',
        message: err.message,
        details: err.message
      });
    }

    session.syncedAt = new Date();
    await session.save();

    res.status(201).json({
      success: true,
      orderId,
      method: paymentMethod,
      status: 'pending',
      amount: session.amount,
      redirectUrl,
      sales: result.sales.map((s) => ({ _id: s._id, invoiceNumber: s.invoiceNumber, total: s.total }))
    });
  } catch (error) {
    logger.error('[Selcom] initiate failed', { error: error.message });
    res.status(400).json({ error: 'Checkout failed', message: error.message });
  }
});

/**
 * GET /api/public/payments/selcom/status?orderId=...
 * Frontend polls every ~3s. Reconciles with Selcom (throttled) so a missed webhook
 * can't stall the buyer's checkout.
 */
router.get('/selcom/status', async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const session = await PaymentSession.findOne({ selcomOrderId: orderId });
    if (!session) return res.status(404).json({ error: 'Payment session not found' });

    // Lazy expiry: abandoned sessions release their reserved stock.
    if (session.status === 'pending' && session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await SaleService.releasePendingSales(session.sales.map((s) => s.saleId));
      session.status = 'expired';
      await session.save();
      return res.json({ orderId, status: 'expired', amount: session.amount });
    }

    // Reconcile with Selcom when pending and past the sync throttle.
    if (session.status === 'pending' &&
        (!session.syncedAt || Date.now() - new Date(session.syncedAt).getTime() > SELCOM_SYNC_INTERVAL_MS)) {
      try {
        const remote = await selcomService.getOrderStatus({ orderId });
        session.result = remote?.result || session.result;
        session.resultcode = remote?.resultcode || session.resultcode;
        session.message = remote?.message || session.message;
        session.reference = remote?.reference || session.reference;
        session.syncedAt = new Date();

        if (isSuccess(session.resultcode, session.result, session.message)) {
          await SaleService.confirmSalesPaid({
            saleIds: session.sales.map((s) => s.saleId),
            transactionId: session.reference,
            selcomOrderId: orderId
          });
          session.status = 'paid';
          session.paidAt = new Date();
        } else if (isFailure(session.resultcode, session.result, session.message)) {
          await SaleService.releasePendingSales(session.sales.map((s) => s.saleId));
          session.status = 'failed';
          session.failedAt = new Date();
        }
        await session.save();
      } catch (syncErr) {
        logger.warn('[Selcom] status sync failed', { error: syncErr.message, orderId });
      }
    }

    const sales = await mongoose.model('Sale').find({ _id: { $in: session.sales.map((s) => s.saleId) } })
      .select('invoiceNumber total status paymentStatus');
    const paidCount = sales.filter((s) => s.paymentStatus === 'paid').length;

    res.json({
      orderId,
      status: session.status,
      amount: session.amount,
      method: session.method,
      result: session.result,
      resultcode: session.resultcode,
      reference: session.reference,
      redirectUrl: session.redirectUrl || null,
      sales: sales.map((s) => ({ invoiceNumber: s.invoiceNumber, total: s.total, paymentStatus: s.paymentStatus })),
      paid: paidCount === session.sales.length && session.sales.length > 0
    });
  } catch (error) {
    logger.error('[Selcom] status failed', { error: error.message });
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

/**
 * POST /api/public/payments/selcom/cancel  — buyer cancels an in-flight payment.
 * Releases reserved stock immediately (best-effort Selcom cancel is non-blocking).
 */
router.post('/selcom/cancel', async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const session = await PaymentSession.findOne({ selcomOrderId: orderId });
    if (!session) return res.status(404).json({ error: 'Payment session not found' });
    if (session.status === 'paid') {
      return res.status(400).json({ error: 'Payment already completed — cannot cancel' });
    }
    if (session.status === 'pending') {
      await SaleService.releasePendingSales(session.sales.map((s) => s.saleId));
      session.status = 'expired';
      session.result = 'CANCELLED';
      session.resultcode = '410';
      session.message = 'Cancelled by buyer';
      await session.save();
      // Best-effort: tell Selcom to cancel the order too (never blocks the buyer).
      try {
        const axios = require('axios');
        const { generateSelcomHeaders } = require('../utils/selcomHelper');
        // Same normalization as selcomService — strip a trailing /v1 so we never
        // produce /v1/v1/checkout/... (that double prefix made every call 404 → 502).
        const base = (process.env.SELCOM_BASE_URL || 'https://apigw.selcommobile.com/v1')
          .replace(/\/+$/, '')
          .replace(/\/v1$/i, '');
        const payload = { vendor: process.env.SELCOM_VENDOR || '', order_id: orderId };
        const headers = generateSelcomHeaders(payload);
        axios.post(`${base}/v1/checkout/cancel-order`, payload, { headers, timeout: 10000 })
          .catch((e) => logger.warn('[Selcom] cancel-order best-effort failed', { error: e.message, orderId }));
      } catch { /* non-blocking */ }
    }
    res.json({ success: true, status: session.status });
  } catch (error) {
    logger.error('[Selcom] cancel failed', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

/**
 * POST /api/public/payments/selcom/callback  — Selcom webhook.
 * Verified (HMAC), amount-checked, idempotent. Always responds HTTP 200 so Selcom
 * stops retrying; the ack body reflects whether we accepted the notification.
 */
router.post('/selcom/callback', async (req, res) => {
  const body = req.body || {};
  const ack = (result, resultcode, message) =>
    res.status(200).json({ result, resultcode, message: message || 'RECEIVED' });

  try {
    const orderId = body.order_id || body.orderId;
    if (!orderId) {
      logger.warn('[Selcom] webhook missing order_id');
      return ack('FAIL', '400', 'Missing order_id');
    }

    // Signature verification — strict by default (SELCOM_STRICT_WEBHOOK !== 'false').
    const strict = process.env.SELCOM_STRICT_WEBHOOK !== 'false';
    const verified = verifyWebhookSignature(body, req.headers);
    if (strict && verified === false) {
      logger.error('[Selcom] webhook signature verification FAILED', { orderId, headers: req.headers });
      return ack('FAIL', '401', 'Signature verification failed');
    }
    if (strict && verified === null) {
      logger.error('[Selcom] webhook arrived without signature headers', { orderId });
      return ack('FAIL', '401', 'Missing signature headers');
    }

    const session = await PaymentSession.findOne({ selcomOrderId: orderId });
    if (!session) {
      logger.warn('[Selcom] webhook for unknown order', { orderId });
      return ack('FAIL', '404', 'Unknown order');
    }

    // Idempotency — already settled.
    if (session.status === 'paid') return ack('SUCCESS', '000', 'Already processed');
    if (session.status === 'failed' || session.status === 'expired') {
      return ack('SUCCESS', '000', 'Already settled');
    }

    // Amount check — reject a mismatched amount so a tampered payload can't mark orders paid.
    if (body.amount !== undefined && body.amount !== null) {
      const expected = session.amount;
      const received = Number(body.amount);
      if (Math.abs(received - expected) > 0.01) {
        logger.error('[Selcom] webhook amount mismatch', { orderId, expected, received });
        return ack('FAIL', '400', 'Amount mismatch');
      }
    }

    const paymentStatus = body.payment_status || body.status || body.result;
    const reference = body.reference || body.transid || '';

    if (isSuccess(body.resultcode, body.result, paymentStatus)) {
      await SaleService.confirmSalesPaid({
        saleIds: session.sales.map((s) => s.saleId),
        transactionId: reference,
        selcomOrderId: orderId
      });
      session.status = 'paid';
      session.result = 'SUCCESS';
      session.resultcode = '000';
      session.message = body.message || 'Payment confirmed';
      session.reference = reference || session.reference;
      session.transactionId = reference || session.reference;
      session.paidAt = new Date();
      await session.save();
      logger.info('[Selcom] payment confirmed', { orderId, reference, amount: session.amount });
      return ack('SUCCESS', '000', 'Payment confirmed');
    }

    if (isFailure(body.resultcode, body.result, paymentStatus)) {
      await SaleService.releasePendingSales(session.sales.map((s) => s.saleId));
      session.status = 'failed';
      session.result = body.result || 'FAIL';
      session.resultcode = body.resultcode || '';
      session.message = body.message || 'Payment failed';
      session.failedAt = new Date();
      await session.save();
      logger.warn('[Selcom] payment failed', { orderId, result: body });
      return ack('SUCCESS', '000', 'Payment failed recorded');
    }

    // INPROGRESS / AMBIGUOUS — leave pending, let polling resolve it.
    session.result = body.result || session.result;
    session.resultcode = body.resultcode || session.resultcode;
    session.message = body.message || session.message;
    session.syncedAt = new Date();
    await session.save();
    return ack('SUCCESS', '000', 'In progress');
  } catch (error) {
    logger.error('[Selcom] webhook error', { error: error.message, body });
    return ack('FAIL', '500', 'Internal error');
  }
});

module.exports = router;
