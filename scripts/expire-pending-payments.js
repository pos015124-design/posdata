#!/usr/bin/env node
/**
 * Expire abandoned Selcom payment sessions and release reserved stock.
 *
 * When a buyer starts a Selcom payment (USSD push / card) but never completes it,
 * the pending sales hold stock. The /status endpoint lazily expires sessions older
 * than 15 minutes; this script is the safety net for sessions nobody polled.
 *
 * Schedule with cron on the VPS (every 10 minutes is plenty):
 *   0,10,20,30,40,50 * * * * cd /var/www/posdata && /usr/bin/node scripts/expire-pending-payments.js >> /var/log/dukani-payments.log 2>&1
 *
 * Safe to run repeatedly — releasePendingSales is idempotent.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../server/config/database');
const PaymentSession = require('../server/models/PaymentSession');
const SaleService = require('../server/services/saleService');

async function main() {
  await connectDB();

  const expired = await PaymentSession.find({
    status: 'pending',
    expiresAt: { $ne: null, $lt: new Date() }
  });

  let released = 0;
  for (const session of expired) {
    const result = await SaleService.releasePendingSales(session.sales.map((s) => s.saleId));
    session.status = 'expired';
    session.result = 'EXPIRED';
    session.resultcode = '408';
    session.message = 'Payment session expired; stock released';
    await session.save();
    released += result.count;
  }

  console.log(`[expire-payments] expired ${expired.length} session(s), released ${released} pending sale(s)`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('[expire-payments] failed:', e.message);
  process.exit(1);
});
