/**
 * Email Service — E-Shop by BHABY GROUP LTD
 *
 * Required env vars (set in Render dashboard):
 *   EMAIL_HOST     e.g. smtp.gmail.com
 *   EMAIL_PORT     587 (TLS) or 465 (SSL)
 *   EMAIL_USER     sender address
 *   EMAIL_PASS     SMTP password / app password
 *   EMAIL_FROM     "E-Shop <noreply@bhabygroup.co.tz>"
 *   EMAIL_SECURE   true for port 465, false for 587
 *   FRONTEND_URL   https://e-shop.bhabygroup.co.tz
 */

const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

const FRONTEND = process.env.FRONTEND_URL || 'https://e-shop.bhabygroup.co.tz';
const FROM     = process.env.EMAIL_FROM    || '"E-Shop — BHABY GROUP LTD" <noreply@bhabygroup.co.tz>';

/* ── transporter ─────────────────────────────────────────────────── */
const createTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
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
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info('[Email] (mock) Would send email', { to, subject });
    return { success: true, mock: true };
  }
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
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
 */
const sendNewOrderToSeller = async ({ sellerEmail, sellerName, invoiceNumber, items, total, customer }) => {
  const itemRows = (items || []).map(i =>
    row(i.productName || i.name, `${i.quantity} × TZS ${(i.price || 0).toLocaleString()} = TZS ${((i.price || 0) * (i.quantity || 0)).toLocaleString()}`)
  ).join('');

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
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">Customer</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:0 0 16px;">
        ${row('Name', customer?.name || '—')}
        ${row('Phone', customer?.phone || '—')}
        ${customer?.city ? row('City', customer.city) : ''}
      </table>
      ${btn('View Order in Dashboard', `${FRONTEND}/orders`)}
    `),
    text: `New order ${invoiceNumber} — TZS ${(total || 0).toLocaleString()} from ${customer?.name || 'customer'}. View at ${FRONTEND}/orders`
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
  sendOrderConfirmationToBuyer
};
