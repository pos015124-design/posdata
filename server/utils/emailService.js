/**
 * Email Service — E-Shop by BHABY GROUP LTD
 *
 * Provider: ZeptoMail (Zoho) — SMTP on port 587 (STARTTLS)
 *
 * Required env vars on the VPS (set in /var/www/posdata/server/.env):
 *   EMAIL_HOST     smtp.zeptomail.com
 *   EMAIL_PORT     587
 *   EMAIL_USER     emailapikey
 *   EMAIL_PASS     <your ZeptoMail API key>
 *   EMAIL_FROM     "E-Shop — BHABY GROUP LTD" <noreply@bhabygroup.co.tz>
 *   EMAIL_CC       arafat1421.lee@gmail.com   (optional — CC on every email)
 *   ADMIN_EMAIL    info@bhabygroup.co.tz
 *   FRONTEND_URL   https://e-shop.bhabygroup.co.tz
 */

const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

const FRONTEND = process.env.FRONTEND_URL || 'https://e-shop.bhabygroup.co.tz';
const FROM     = process.env.EMAIL_FROM    || '"E-Shop — BHABY GROUP LTD" <noreply@bhabygroup.co.tz>';
// Optional CC on every outbound email — set EMAIL_CC in .env to enable
const CC       = process.env.EMAIL_CC      || null;

/* ── transporter ─────────────────────────────────────────────────── */
const createTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,   // smtp.zeptomail.com
      port: parseInt(EMAIL_PORT) || 587,
      // ZeptoMail uses STARTTLS on port 587 — secure must be false
      // (secure: true is for implicit SSL on port 465 only)
      secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
  }
  logger.warn('[Email] SMTP not configured — emails will be logged only');
  return null;
};

/* ── base HTML wrapper ───────────────────────────────────────────── */
const wrap = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">E-Shop</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:12px;">by BHABY GROUP LTD</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">${body}</td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} BHABY GROUP LTD · bhabygroup.co.tz</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">This is an automated message — please do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;margin:16px 0;">${text}</a>`;

const h2 = t => `<h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">${t}</h2>`;
const p  = t => `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.6;">${t}</p>`;
const row = (label, value) =>
  `<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">${label}</td>
       <td style="padding:8px 12px;color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;">${value}</td></tr>`;

/* ── core send ───────────────────────────────────────────────────── */
const sendEmail = async ({ to, subject, html, text, headers }) => {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info('[Email] (mock) Would send email', { to, subject });
    return { success: true, mock: true };
  }
  try {
    const message = { from: FROM, to, subject, html, text };
    // Attach CC if configured — keeps admin informed on all outbound mail
    if (CC) message.cc = CC;
    // Extra headers (e.g. List-Unsubscribe for one-click digest opt-out)
    if (headers && typeof headers === 'object') message.headers = headers;
    const info = await transporter.sendMail(message);
    logger.info('[Email] Sent', { messageId: info.messageId, to, subject });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('[Email] Failed to send', { error: err.message, to, subject });
    // Non-critical — don't throw, just log
    return { success: false, error: err.message };
  }
};

/* ══════════════════════════════════════════════════════════════════
   SELLER EMAILS
══════════════════════════════════════════════════════════════════ */

/**
 * 1. Seller registered — notify admin
 */
const sendNewSellerRegistrationToAdmin = async ({ sellerEmail, sellerName, businessName }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return;
  return sendEmail({
    to: adminEmail,
    subject: `New seller registration: ${businessName}`,
    html: wrap('New Seller Registration', `
      ${h2('New Seller Registration')}
      ${p(`A new seller has registered and is awaiting your approval.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Name', sellerName || '—')}
        ${row('Email', sellerEmail)}
        ${row('Business', businessName || '—')}
        ${row('Status', 'Pending Approval')}
      </table>
      ${btn('Review in Admin Dashboard', `${FRONTEND}/settings`)}
    `),
    text: `New seller registration: ${sellerName} (${sellerEmail}) — Business: ${businessName}. Review at ${FRONTEND}/settings`
  });
};

/**
 * 2. Seller approved — notify seller
 */
const sendSellerApprovalEmail = async ({ sellerEmail, sellerName, businessName }) => {
  return sendEmail({
    to: sellerEmail,
    subject: 'Your E-Shop seller account has been approved! 🎉',
    html: wrap('Account Approved', `
      ${h2(`Welcome to E-Shop, ${sellerName || 'Seller'}!`)}
      ${p(`Great news — your seller account for <strong>${businessName || 'your business'}</strong> has been approved by BHABY GROUP LTD.`)}
      ${p('You can now log in to your dashboard to:')}
      <ul style="color:#4b5563;font-size:14px;line-height:2;padding-left:20px;">
        <li>Add and publish your products</li>
        <li>Manage your store settings</li>
        <li>Track orders and revenue</li>
        <li>View your billing and fees</li>
      </ul>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;"><strong>⚠ Registration Fee:</strong> A one-time fee of <strong>TZS 300,000</strong> is due within 7 days. Visit your Billing page for payment instructions.</p>
      </div>
      ${btn('Go to Dashboard', `${FRONTEND}/login`)}
    `),
    text: `Your E-Shop seller account for ${businessName} has been approved! Log in at ${FRONTEND}/login`
  });
};

/**
 * 3. New order received — notify seller
 *
 * isStorefront: true  → BHABY GROUP LTD middleman model.
 *   Customer contact details are NEVER shown to the seller.
 *   Seller only sees what items to prepare and the invoice total.
 *
 * isStorefront: false (default) → POS sale.
 *   Seller served the customer in person, so customer info is shown.
 */
const sendNewOrderToSeller = async ({ sellerEmail, sellerName, invoiceNumber, items, total, customer, isStorefront = false }) => {
  const itemRows = (items || []).map(i =>
    row(i.productName || i.name, `${i.quantity} × TZS ${(i.price || 0).toLocaleString()} = TZS ${((i.price || 0) * (i.quantity || 0)).toLocaleString()}`)
  ).join('');

  // For storefront orders: replace customer table with a managed-delivery notice.
  // For POS orders: show customer name, phone, city as before.
  const customerSection = isStorefront
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0 0 4px;color:#1e40af;font-size:13px;font-weight:700;">📦 Managed by BHABY GROUP LTD</p>
        <p style="margin:0;color:#1d4ed8;font-size:13px;">
          Please prepare the items listed above. Our team will contact you to arrange collection.
          Customer details are confidential and handled by BHABY GROUP LTD.
        </p>
       </div>`
    : `<p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">Customer</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:0 0 16px;">
         ${row('Name', customer?.name || '—')}
         ${row('Phone', customer?.phone || '—')}
         ${customer?.city ? row('City', customer.city) : ''}
       </table>`;

  const textCustomer = isStorefront
    ? 'Delivery managed by BHABY GROUP LTD — prepare items for collection.'
    : `from ${customer?.name || 'customer'}`;

  return sendEmail({
    to: sellerEmail,
    subject: `New order received — ${invoiceNumber}`,
    html: wrap('New Order', `
      ${h2('You have a new order!')}
      ${p(`Invoice: <strong>${invoiceNumber}</strong>`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        <tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;color:#374151;font-size:13px;">Item</th><th style="padding:10px 12px;text-align:left;color:#374151;font-size:13px;">Details</th></tr>
        ${itemRows}
        ${row('Total', `<strong style="color:#2563eb;">TZS ${(total || 0).toLocaleString()}</strong>`)}
      </table>
      ${customerSection}
      ${btn('View in Dashboard', `${FRONTEND}/orders`)}
    `),
    text: `New order ${invoiceNumber} — TZS ${(total || 0).toLocaleString()} ${textCustomer}. View at ${FRONTEND}/orders`
  });
};

/* ══════════════════════════════════════════════════════════════════
   BUYER EMAILS
══════════════════════════════════════════════════════════════════ */

/**
 * 4. Order confirmation — notify buyer
 */
const sendOrderConfirmationToBuyer = async ({ buyerEmail, buyerName, invoices, items, total, paymentMethod }) => {
  if (!buyerEmail) return; // guest without email — skip

  const itemRows = (items || []).map(i =>
    row(i.name, `${i.quantity} × TZS ${(i.price || 0).toLocaleString()} = TZS ${((i.price || 0) * (i.quantity || 0)).toLocaleString()}`)
  ).join('');

  const paymentNote = paymentMethod === 'cash'
    ? 'Pay when you receive your order.'
    : paymentMethod === 'mobile'
    ? 'Mobile money payment — the seller will contact you.'
    : 'The seller will confirm payment details.';

  return sendEmail({
    to: buyerEmail,
    subject: `Order confirmed — ${invoices.join(', ')}`,
    html: wrap('Order Confirmed', `
      ${h2(`Thank you, ${buyerName || 'Customer'}!`)}
      ${p('Your order has been placed successfully. The seller will contact you shortly.')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Invoice(s)', `<strong>${invoices.join(', ')}</strong>`)}
        ${itemRows}
        ${row('Total', `<strong style="color:#2563eb;">TZS ${(total || 0).toLocaleString()}</strong>`)}
        ${row('Payment', paymentNote)}
      </table>
      ${p('Keep your invoice number(s) for reference. If you have questions, contact the seller directly.')}
      ${btn('Continue Shopping', `${FRONTEND}/store`)}
    `),
    text: `Order confirmed! Invoice(s): ${invoices.join(', ')} — Total: TZS ${(total || 0).toLocaleString()}. Thank you for shopping at E-Shop.`
  });
};

/* ══════════════════════════════════════════════════════════════════
   DELIVERY EMAILS (Middleman model)
══════════════════════════════════════════════════════════════════ */

/**
 * 5. Order confirmed — notify buyer that BHABY GROUP LTD received their order
 */
const sendOrderConfirmedToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, items, total }) => {
  if (!buyerEmail) return;
  const itemRows = (items || []).map(i =>
    row(i.productName || i.name, `${i.quantity} × TZS ${(i.price || 0).toLocaleString()}`)
  ).join('');
  return sendEmail({
    to: buyerEmail,
    subject: `Order confirmed — ${invoiceNumber} 🎉`,
    html: wrap('Order Confirmed', `
      ${h2(`Thank you, ${buyerName || 'Customer'}!`)}
      ${p(`Your order <strong>${invoiceNumber}</strong> has been received and is being processed by BHABY GROUP LTD.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${itemRows}
        ${row('Total', `<strong style="color:#2563eb;">TZS ${(total || 0).toLocaleString()}</strong>`)}
      </table>
      ${p('We will notify you when a rider is assigned and your order is on its way.')}
      ${btn('Track your order', `${FRONTEND}/store`)}
    `),
    text: `Order ${invoiceNumber} confirmed. Total: TZS ${(total || 0).toLocaleString()}. We will notify you when a rider is assigned.`
  });
};

/**
 * 6. Rider assigned — notify buyer that a rider is coming
 */
const sendRiderAssignedToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, riderName, riderPhone, total }) => {
  if (!buyerEmail) return;
  return sendEmail({
    to: buyerEmail,
    subject: `Your order is on its way — ${invoiceNumber} 🚴`,
    html: wrap('Rider Assigned', `
      ${h2(`Great news, ${buyerName || 'Customer'}!`)}
      ${p(`A rider has been assigned to deliver your order <strong>${invoiceNumber}</strong>.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Rider', `<strong>${riderName}</strong>`)}
        ${row('Rider Phone', `<a href="tel:${riderPhone}" style="color:#2563eb;">${riderPhone}</a>`)}
        ${row('Order Total', `TZS ${(total || 0).toLocaleString()}`)}
      </table>
      ${p('The rider will contact you before delivery. Please ensure someone is available to receive the order.')}
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;"><strong>⚠ Note:</strong> Only accept delivery from BHABY GROUP LTD riders. Do not pay anyone who is not our official rider.</p>
      </div>
    `),
    text: `Rider ${riderName} (${riderPhone}) has been assigned to deliver your order ${invoiceNumber}.`
  });
};

/**
 * 7. Order delivered — notify buyer that delivery is complete
 */
const sendOrderDeliveredToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, total }) => {
  if (!buyerEmail) return;
  return sendEmail({
    to: buyerEmail,
    subject: `Order delivered — ${invoiceNumber} ✅`,
    html: wrap('Order Delivered', `
      ${h2(`Your order has been delivered!`)}
      ${p(`Hi ${buyerName || 'Customer'}, your order <strong>${invoiceNumber}</strong> has been successfully delivered.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Invoice', `<strong>${invoiceNumber}</strong>`)}
        ${row('Total Paid', `TZS ${(total || 0).toLocaleString()}`)}
        ${row('Status', '<span style="color:#16a34a;font-weight:700;">✅ Delivered</span>')}
      </table>
      ${p('Thank you for shopping with E-Shop by BHABY GROUP LTD. We hope you enjoy your purchase!')}
      ${btn('Shop again', `${FRONTEND}/store`)}
    `),
    text: `Your order ${invoiceNumber} has been delivered. Thank you for shopping with E-Shop by BHABY GROUP LTD.`
  });
};

/* ══════════════════════════════════════════════════════════════════
   ACCOUNT STATUS EMAILS
══════════════════════════════════════════════════════════════════ */

/**
 * 8. Registration declined — notify seller their registration was not approved
 */
const sendSellerRejectedEmail = async ({ sellerEmail, sellerName, businessName, reason }) => {
  return sendEmail({
    to: sellerEmail,
    subject: 'Update on your E-Shop seller registration',
    html: wrap('Registration Update', `
      ${h2(`Hi ${sellerName || 'there'},`)}
      ${p(`Thank you for applying to sell on E-Shop by BHABY GROUP LTD${businessName ? ` with <strong>${businessName}</strong>` : ''}.`)}
      ${p('After careful review, your seller registration has <strong>not been approved</strong> at this time.')}
      ${reason ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;"><p style="margin:0;color:#92400e;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
      ${p('If you believe this was a mistake or would like to provide more information, please reply to this email or contact BHABY GROUP LTD support.')}
      ${btn('Register Again', `${FRONTEND}/register`)}
    `),
    text: `Your E-Shop seller registration${businessName ? ` for ${businessName}` : ''} was not approved. Contact BHABY GROUP LTD if you believe this is a mistake.`
  });
};

/**
 * 9. Account suspended — notify the user
 */
const sendAccountSuspendedEmail = async ({ userEmail, userName, reason }) => {
  return sendEmail({
    to: userEmail,
    subject: 'Your E-Shop account has been suspended',
    html: wrap('Account Suspended', `
      ${h2(`Hi ${userName || 'there'},`)}
      ${p('Your E-Shop account has been suspended by an administrator.')}
      ${reason ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;"><p style="margin:0;color:#92400e;font-size:13px;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
      ${p('If you believe this is a mistake, please contact BHABY GROUP LTD support for assistance.')}
    `),
    text: `Your E-Shop account has been suspended${reason ? `: ${reason}` : ''}. Contact BHABY GROUP LTD support if you believe this is a mistake.`
  });
};

/* ══════════════════════════════════════════════════════════════════
   INVENTORY EMAILS
══════════════════════════════════════════════════════════════════ */

/**
 * 10. Low stock alert — notify seller a product just hit its reorder point
 *     (fired once per crossing: only when stock moves from above → at/below)
 */
const sendLowStockAlertToSeller = async ({ sellerEmail, sellerName, productName, currentStock, reorderPoint }) => {
  return sendEmail({
    to: sellerEmail,
    subject: `Low stock alert — ${productName}`,
    html: wrap('Low Stock Alert', `
      ${h2(`Your product is running low: ${productName}`)}
      ${p(`Hi ${sellerName || 'Seller'}, <strong>${productName}</strong> has reached its reorder point.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Product', productName)}
        ${row('Current Stock', `${currentStock} unit${currentStock === 1 ? '' : 's'}`)}
        ${row('Reorder Point', `${reorderPoint} units`)}
      </table>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;"><strong>⚠ Action needed:</strong> Restock this product soon to avoid running out and losing sales. You can update stock from your Inventory page.</p>
      </div>
      ${btn('Manage Inventory', `${FRONTEND}/inventory`)}
    `),
    text: `Low stock alert: ${productName} has ${currentStock} unit(s) left (reorder point: ${reorderPoint}). Restock soon.`
  });
};

/* ══════════════════════════════════════════════════════════════════
   DAILY REPORTS
══════════════════════════════════════════════════════════════════ */

/**
 * 11. Sales report digest — daily or weekly summary, sent by
 *     scripts/send-daily-reports.js on a cron schedule.
 *     Includes a signed one-click unsubscribe link (List-Unsubscribe header).
 */
const sendSalesReportToSeller = async ({ sellerEmail, sellerName, frequency, periodLabel, totalOrders, totalRevenue, topProducts, lowStockCount, unsubscribeUrl }) => {
  const isWeekly = frequency === 'weekly';
  const freqLabel = isWeekly ? 'Weekly' : 'Daily';
  const productRows = (topProducts || []).map((p, i) =>
    row(`${i + 1}. ${p.name}`, `${p.quantity} sold — TZS ${(p.revenue || 0).toLocaleString()}`)
  ).join('');

  return sendEmail({
    to: sellerEmail,
    subject: `Your ${isWeekly ? 'weekly' : 'daily'} sales report — ${periodLabel}`,
    html: wrap(`${freqLabel} Sales Report`, `
      ${h2(`${freqLabel} report for ${periodLabel}`)}
      ${p(`Hi ${sellerName || 'Seller'}, here's how your store performed ${isWeekly ? 'this week' : 'yesterday'}.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Orders', String(totalOrders || 0))}
        ${row('Revenue', `TZS ${(totalRevenue || 0).toLocaleString()}`)}
        ${row('Low stock items', String(lowStockCount || 0))}
      </table>
      ${topProducts && topProducts.length
        ? `<h3 style="margin:16px 0 8px;color:#1f2937;font-size:16px;">Top products</h3><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:8px 0;">${productRows}</table>`
        : '<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.6;">No product sales recorded.</p>'}
      ${lowStockCount ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;"><p style="margin:0;color:#92400e;font-size:13px;"><strong>⚠ Attention:</strong> ${lowStockCount} product(s) are at or below their reorder point. Restock soon.</p></div>` : ''}
      ${btn('Open Dashboard', `${FRONTEND}/dashboard`)}
      ${unsubscribeUrl ? `<p style="margin:24px 0 0;color:#9ca3af;font-size:11px;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe from sales report emails</a> — you can re-enable anytime in Settings → Notifications.</p>` : ''}
    `),
    text: `${freqLabel} report for ${periodLabel}: ${totalOrders} order(s), TZS ${(totalRevenue || 0).toLocaleString()} revenue${lowStockCount ? `, ${lowStockCount} low stock item(s)` : ''}. Unsubscribe: ${unsubscribeUrl || 'n/a'}`,
    // Standard one-click unsubscribe so Gmail/Outlook show a native button
    headers: unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      : undefined
  });
};

/* ── legacy exports kept for backward compat ─────────────────────── */
const sendVerificationEmail  = async (email, token) => sendEmail({ to: email, subject: 'Verify your email', html: wrap('Verify Email', `${p('Click below to verify your email.')}${btn('Verify Email', `${FRONTEND}/verify?token=${token}`)}`), text: `Verify: ${FRONTEND}/verify?token=${token}` });
const sendPasswordResetEmail = async (email, token) => sendEmail({ to: email, subject: 'Reset your password', html: wrap('Password Reset', `${p('Click below to reset your password. Link expires in 1 hour.')}${btn('Reset Password', `${FRONTEND}/reset-password?token=${token}`)}`), text: `Reset: ${FRONTEND}/reset-password?token=${token}` });
const sendAlertEmail         = async (alert) => sendEmail({ to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '', subject: `E-Shop Alert: ${alert.type}`, html: wrap('System Alert', `${h2(alert.type)}${p(alert.message)}`), text: alert.message });

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAlertEmail,
  // New targeted functions
  sendNewSellerRegistrationToAdmin,
  sendSellerApprovalEmail,
  sendNewOrderToSeller,
  sendOrderConfirmationToBuyer,
  // Delivery / middleman model
  sendOrderConfirmedToBuyer,
  sendRiderAssignedToBuyer,
  sendOrderDeliveredToBuyer,
  // Account status
  sendSellerRejectedEmail,
  sendAccountSuspendedEmail,
  // Inventory
  sendLowStockAlertToSeller,
  // Sales report digests (daily / weekly)
  sendSalesReportToSeller,
};
