#!/usr/bin/env node
/**
 * Daily sales report emails — sends a "yesterday" summary to every seller who
 * has opted in (notificationPrefs.reports !== false && notificationPrefs.email !== false).
 *
 * Schedule with cron on the VPS (adjust the path/time to taste):
 *   0 6 * * * cd /var/www/posdata && /usr/bin/node scripts/send-daily-reports.js >> /var/log/dukani-daily-report.log 2>&1
 *
 * Safe to run repeatedly — each run only sends emails (no state changes),
 * so a double-invocation just means duplicate emails, never corruption.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../server/config/database');
const User = require('../server/models/User');
const Sale = require('../server/models/Sale');
const Product = require('../server/models/Product');
const { sendDailySalesReportToSeller } = require('../server/utils/emailService');

const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

async function main() {
  await connectDB();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);

  const sellers = await User.find({
    role: 'business_admin',
    isApproved: true
  }).select('email firstName fullName notificationPrefs');

  let sent = 0;
  for (const seller of sellers) {
    const prefs = seller.notificationPrefs || {};
    // Both prefs default to true when unset — only skip on an explicit false
    if (prefs.reports === false) continue;
    if (prefs.email === false) continue;

    const sales = await Sale.find({
      createdBy: seller._id,
      createdAt: { $gte: yesterdayStart, $lt: dayStart }
    }).select('total items');

    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Aggregate top products from yesterday's sales
    const prodMap = new Map();
    for (const sale of sales) {
      for (const it of (sale.items || [])) {
        const key = it.productName || it.name || 'Unknown';
        const cur = prodMap.get(key) || { quantity: 0, revenue: 0 };
        cur.quantity += it.quantity || 0;
        cur.revenue += (it.price || 0) * (it.quantity || 0);
        prodMap.set(key, cur);
      }
    }
    const topProducts = [...prodMap.entries()]
      .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const lowStockCount = await Product.countDocuments({
      userId: seller._id,
      $expr: { $lte: ['$stock', '$reorderPoint'] }
    });

    await sendDailySalesReportToSeller({
      sellerEmail: seller.email,
      sellerName: seller.fullName || seller.firstName || seller.email.split('@')[0],
      date: fmtDate(yesterdayStart),
      totalOrders,
      totalRevenue,
      topProducts,
      lowStockCount
    });
    sent++;
  }

  console.log(`[daily-report] sent ${sent} report(s) for ${fmtDate(yesterdayStart)}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('[daily-report] failed:', e.message);
  process.exit(1);
});
