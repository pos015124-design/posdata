#!/usr/bin/env node
/**
 * Sales report digests — sends each opted-in seller their summary:
 *   - reportFrequency 'daily'  → yesterday's performance
 *   - reportFrequency 'weekly' → last 7 days (sent once a week)
 *   - reportFrequency 'off'    → skipped (or if legacy reports === false)
 *
 * Every digest includes a signed one-click unsubscribe link (List-Unsubscribe
 * header) so recipients can opt out without logging in. Re-enabling is done in
 * Settings → Notifications.
 *
 * Schedule with cron on the VPS (adjust path/time to taste):
 *   0 6 * * * cd /var/www/posdata && /usr/bin/node scripts/send-daily-reports.js >> /var/log/dukani-daily-report.log 2>&1
 *
 * Weekly digests only go out on WEEKLY_REPORT_DAY (default 1 = Monday).
 * Safe to run repeatedly — each run only sends emails, never mutates data.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../server/config/database');
const User = require('../server/models/User');
const Sale = require('../server/models/Sale');
const Product = require('../server/models/Product');
const { sendSalesReportToSeller } = require('../server/utils/emailService');

const WEEKLY_DAY = parseInt(process.env.WEEKLY_REPORT_DAY ?? '1', 10); // 1 = Monday
const FRONTEND = process.env.FRONTEND_URL || 'https://e-shop.bhabygroup.co.tz';

const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error('[daily-report] JWT_SECRET is required (for unsubscribe links). Aborting.');
    process.exit(1);
  }

  await connectDB();

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const sellers = await User.find({
    role: 'business_admin',
    isApproved: true
  }).select('email firstName fullName notificationPrefs');

  let sent = 0;
  for (const seller of sellers) {
    const prefs = seller.notificationPrefs || {};
    if (prefs.email === false) continue;

    // Resolve frequency with legacy fallback (reports boolean → off/daily)
    const frequency = prefs.reportFrequency
      || (prefs.reports === false ? 'off' : 'daily');
    if (frequency === 'off') continue;
    if (frequency === 'weekly' && now.getDay() !== WEEKLY_DAY) continue;

    const isWeekly = frequency === 'weekly';
    const periodStart = new Date(isWeekly ? dayStart.getTime() - 7 * 24 * 60 * 60 * 1000 : dayStart.getTime() - 24 * 60 * 60 * 1000);
    const periodLabel = isWeekly
      ? `${fmtDate(periodStart)} – ${fmtDate(new Date(dayStart.getTime() - 24 * 60 * 60 * 1000))}`
      : fmtDate(new Date(dayStart.getTime() - 24 * 60 * 60 * 1000));

    const sales = await Sale.find({
      createdBy: seller._id,
      createdAt: { $gte: periodStart, $lt: dayStart }
    }).select('total items');

    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Aggregate top products across the period
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

    // Signed one-click unsubscribe token (no login required)
    const unsubscribeToken = jwt.sign(
      { userId: seller._id.toString(), purpose: 'report-unsubscribe' },
      process.env.JWT_SECRET,
      { expiresIn: '180d' }
    );
    const unsubscribeUrl = `${FRONTEND}/api/reports/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

    await sendSalesReportToSeller({
      sellerEmail: seller.email,
      sellerName: seller.fullName || seller.firstName || seller.email.split('@')[0],
      frequency,
      periodLabel,
      totalOrders,
      totalRevenue,
      topProducts,
      lowStockCount,
      unsubscribeUrl
    });
    sent++;
  }

  console.log(`[daily-report] sent ${sent} digest(s) on ${fmtDate(now)}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('[daily-report] failed:', e.message);
  process.exit(1);
});
