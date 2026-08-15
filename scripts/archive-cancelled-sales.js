#!/usr/bin/env node
/**
 * Archive cancelled (failed-payment) storefront sales older than RETENTION_DAYS.
 *
 * When a Selcom payment fails or times out, the pending sale is marked
 * cancelled and its stock released (releasePendingSales). Those records are
 * kept for the audit trail, but they clutter the live Sale collection forever.
 * This script moves cancelled sales older than the retention window into the
 * ArchivedSale collection — the audit trail is preserved, live queries stay
 * clean, and super admin can still look them up by invoice number.
 *
 * Env:
 *   CANCELLED_RETENTION_DAYS   default 30
 *
 * Schedule with cron on the VPS (daily is plenty):
 *   0 4 * * * cd /var/www/posdata && /usr/bin/node scripts/archive-cancelled-sales.js >> /var/log/dukani-archive.log 2>&1
 *
 * Safe to run repeatedly — only touches cancelled sales older than the cutoff,
 * and it is idempotent (archived sales are removed from the live collection).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../server/config/database');
const Sale = require('../server/models/Sale');
const ArchivedSale = require('../server/models/ArchivedSale');

const RETENTION_DAYS = parseInt(process.env.CANCELLED_RETENTION_DAYS || '30', 10);

async function main() {
  await connectDB();

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const cancelled = await Sale.find({
    source: 'storefront',
    status: 'cancelled',
    updatedAt: { $lt: cutoff }
  }).lean();

  let archived = 0;
  for (const sale of cancelled) {
    await ArchivedSale.create({
      originalSaleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      source: sale.source,
      items: sale.items || [],
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      status: sale.status,
      notes: sale.notes || '',
      customerName: sale.customerName || '',
      customerEmail: sale.customerEmail || '',
      customerPhone: sale.customerPhone || '',
      customerCity: sale.customerCity || '',
      createdBy: sale.createdBy,
      saleCreatedAt: sale.createdAt,
      cancelledAt: sale.updatedAt
    });
    // Remove from the live collection only after the archive copy succeeded.
    await Sale.deleteOne({ _id: sale._id });
    archived++;
  }

  console.log(`[archive-cancelled] archived ${archived} cancelled sale(s) older than ${RETENTION_DAYS} day(s)`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('[archive-cancelled] failed:', e.message);
  process.exit(1);
});
