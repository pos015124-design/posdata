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
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header — deep brand navy with inline logo mark -->
  <tr><td style="background:linear-gradient(135deg,#0b1736 0%,#1e3a8a 60%,#4c1d95 100%);padding:32px;text-align:center;">
    <!-- Inline SVG circuit-B icon at 48px -->
    <div style="display:inline-block;vertical-align:middle;margin-right:12px;">
      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10 L18 90 L55 90 C72 90 82 80 82 67 C82 58 77 52 69 49 C76 46 80 40 80 32 C80 19 70 10 55 10 Z" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linejoin="round"/>
        <path d="M18 10 L55 10 C68 10 78 18 78 30 C78 42 68 49 55 49 L18 49" stroke="#38bdf8" stroke-width="5" fill="none"/>
        <path d="M18 49 L57 49 C71 49 82 57 82 68 C82 79 71 88 57 88 L18 88" stroke="#818cf8" stroke-width="5" fill="none"/>
        <line x1="18" y1="30" x2="6" y2="30" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="4" cy="30" r="3" fill="#38bdf8"/>
        <line x1="18" y1="50" x2="6" y2="50" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="4" cy="50" r="3" fill="#38bdf8"/>
        <line x1="18" y1="70" x2="6" y2="70" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="4" cy="70" r="3" fill="#818cf8"/>
        <path d="M2 4 L4 4 L7 14 L18 14 L20 7 L6 7" transform="translate(36,38)" stroke="#38bdf8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="45" cy="55" r="1.8" fill="#38bdf8"/>
        <circle cx="52" cy="55" r="1.8" fill="#38bdf8"/>
      </svg>
    </div>
    <div style="display:inline-block;vertical-align:middle;text-align:left;">
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.12em;line-height:1;">E-SHOP</div>
      <div style="color:rgba(255,255,255,0.65);font-size:11px;font-weight:600;letter-spacing:0.06em;margin-top:2px;">BHABY GROUP LTD</div>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">${body}</td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
    <!-- Quick links -->
    <p style="margin:0 0 12px;text-align:center;">
      <a href="${FRONTEND}/store" style="color:#2563eb;font-size:12px;text-decoration:none;margin:0 8px;">Shop</a>
      <span style="color:#cbd5e1;">|</span>
      <a href="${FRONTEND}/orders" style="color:#2563eb;font-size:12px;text-decoration:none;margin:0 8px;">My Orders</a>
      <span style="color:#cbd5e1;">|</span>
      <a href="mailto:info@bhabygroup.co.tz" style="color:#2563eb;font-size:12px;text-decoration:none;margin:0 8px;">Support</a>
      <span style="color:#cbd5e1;">|</span>
      <a href="${FRONTEND}/about" style="color:#2563eb;font-size:12px;text-decoration:none;margin:0 8px;">About</a>
    </p>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:11px;text-align:center;">© ${new Date().getFullYear()} BHABY GROUP LTD · bhabygroup.co.tz · Zanzibar, Tanzania</p>
    <p style="margin:0;color:#cbd5e1;font-size:10px;text-align:center;">This is an automated message — please do not reply directly to this email.</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

const btn = (text, url, color = '#2563eb') =>
  `<a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:14px;margin:16px 0;letter-spacing:0.01em;">${text}</a>`;

const btnOutline = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#ffffff;color:#2563eb;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;margin:8px 4px 8px 0;border:2px solid #2563eb;letter-spacing:0.01em;">${text}</a>`;

const h2 = t => `<h2 style="margin:0 0 10px;color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.3px;">${t}</h2>`;
const p  = t => `<p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.7;">${t}</p>`;

// Card-style info row — clean dividers, no heavy borders
const row = (label, value) =>
  `<tr>
     <td style="padding:10px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;width:40%;">${label}</td>
     <td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${value}</td>
   </tr>`;

// Amber safety / warning callout with left accent border
const warning = (text) =>
  `<div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">
     <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;"><strong style="color:#78350f;">Important:</strong> ${text}</p>
   </div>`;

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
    subject: 'Your E-Shop seller account has been approved',
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
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;"><strong style="color:#78350f;">Registration Fee:</strong> A one-time fee of <strong>TZS 300,000</strong> is due within 7 days. Visit your Billing page for payment instructions.</p>
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
    ? `<div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">
        <p style="margin:0 0 4px;color:#1e40af;font-size:13px;font-weight:700;">Managed Delivery by BHABY GROUP LTD</p>
        <p style="margin:0;color:#1d4ed8;font-size:13px;line-height:1.6;">
          Please prepare the items listed above. Our team will contact you to arrange collection.
          Customer details are confidential and handled by BHABY GROUP LTD.
        </p>
       </div>`
    : `<p style="margin:20px 0 6px;color:#374151;font-size:13px;font-weight:700;">Customer Details</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:0 0 20px;">
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
      ${h2('New Order Received')}
      ${p(`Invoice: <strong>${invoiceNumber}</strong>`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">
        <tr style="background:#f8fafc;"><th style="padding:11px 16px;text-align:left;color:#374151;font-size:13px;font-weight:700;">Item</th><th style="padding:11px 16px;text-align:left;color:#374151;font-size:13px;font-weight:700;">Details</th></tr>
        ${itemRows}
        ${row('Total', `<strong style="color:#2563eb;font-size:15px;">TZS ${(total || 0).toLocaleString()}</strong>`)}
      </table>
      ${customerSection}
      ${btn('View Order in Dashboard', `${FRONTEND}/orders`)}
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
const sendOrderConfirmedToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, trackingCode, items, total }) => {
  if (!buyerEmail) return;
  const itemRows = (items || []).map(i =>
    row(i.productName || i.name, `${i.quantity} × TZS ${(i.price || 0).toLocaleString()}`)
  ).join('');
  const trackParam = trackingCode ? `code=${encodeURIComponent(trackingCode)}` : `invoice=${encodeURIComponent(invoiceNumber)}`;
  const trackHint = trackingCode
    ? `<p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.7;">Your short tracking code is <strong style="color:#2563eb;">${trackingCode}</strong> — keep it handy to check your delivery status on mobile.</p>`
    : '';
  return sendEmail({
    to: buyerEmail,
    subject: `Order confirmed — ${trackingCode || invoiceNumber}`,
    html: wrap('Order Confirmed', `
      ${h2(`Thank you, ${buyerName || 'Customer'}!`)}
      ${p(`Your order <strong>${invoiceNumber}</strong> has been received and is being processed by BHABY GROUP LTD.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${itemRows}
        ${row('Total', `<strong style="color:#2563eb;">TZS ${(total || 0).toLocaleString()}</strong>`)}
      </table>
      ${trackHint}
      ${p('We will notify you when a rider is assigned and your order is on its way.')}
      ${btn('Track your order', `${FRONTEND}/track?${trackParam}`)}
    `),
    text: `Order ${invoiceNumber} confirmed. Total: TZS ${(total || 0).toLocaleString()}${trackingCode ? ` Tracking code: ${trackingCode}.` : ''} We will notify you when a rider is assigned.`
  });
};

/**
 * 6. Rider assigned — notify buyer that a rider is coming
 */
const sendRiderAssignedToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, riderName, riderPhone, total }) => {
  if (!buyerEmail) return;
  return sendEmail({
    to: buyerEmail,
    subject: `Your order is on its way — ${invoiceNumber}`,
    html: wrap('Rider Assigned', `
      ${h2(`Your order is on its way!`)}
      ${p(`Hi ${buyerName || 'Customer'}, a rider has been assigned to deliver your order <strong>${invoiceNumber}</strong>.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">
        ${row('Rider', `<strong>${riderName}</strong>`)}
        ${row('Rider Phone', `<a href="tel:${riderPhone}" style="color:#2563eb;text-decoration:none;font-weight:700;">${riderPhone}</a>`)}
        ${row('Order Total', `TZS ${(total || 0).toLocaleString()}`)}
        ${row('Invoice', invoiceNumber)}
      </table>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.7;">The rider will contact you before arriving. Please ensure someone is available to receive the order.</p>
      ${btnOutline(`Call Rider — ${riderPhone}`, `tel:${riderPhone}`)}
      ${btn('Track Your Order', `${FRONTEND}/track?invoice=${encodeURIComponent(invoiceNumber)}`)}
      ${warning('Only accept delivery from BHABY GROUP LTD riders. Do not pay anyone who is not an official BHABY GROUP LTD rider. If you are unsure, call our support team at <a href="mailto:info@bhabygroup.co.tz" style="color:#92400e;">info@bhabygroup.co.tz</a>.')}
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
    subject: `Order delivered — ${invoiceNumber}`,
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

/**
 * 7b. Order refunded — notify buyer their payment was returned
 */
const sendOrderRefundedToBuyer = async ({ buyerEmail, buyerName, invoiceNumber, total, reason }) => {
  if (!buyerEmail) return;
  return sendEmail({
    to: buyerEmail,
    subject: `Refund issued — ${invoiceNumber}`,
    html: wrap('Order Refunded', `
      ${h2(`Your refund has been issued`)}
      ${p(`Hi ${buyerName || 'Customer'}, your order <strong>${invoiceNumber}</strong> has been refunded. The full amount will be returned to your original payment method.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
        ${row('Invoice', `<strong>${invoiceNumber}</strong>`)}
        ${row('Refund Amount', `TZS ${(total || 0).toLocaleString()}`)}
        ${row('Status', '<span style="color:#dc2626;font-weight:700;">↩ Refunded</span>')}
        ${reason ? row('Reason', reason) : ''}
      </table>
      ${p('Depending on your bank or mobile money provider, it may take 1–5 business days to appear in your account.')}
      ${p('If you have any questions, contact BHABY GROUP LTD support. Thank you for shopping with us.')}
      ${btn('Continue Shopping', `${FRONTEND}/store`)}
    `),
    text: `Your order ${invoiceNumber} has been refunded — TZS ${(total || 0).toLocaleString()}${reason ? ` (${reason})` : ''}. It may take 1-5 business days to appear.`
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
      ${warning('Action needed: Restock this product soon to avoid running out and losing sales. You can update stock from your Inventory page.')}
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
      ${lowStockCount ? warning(`${lowStockCount} product(s) are at or below their reorder point. Restock soon to avoid missed sales.`) : ''}
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
  sendOrderRefundedToBuyer,
  // Account status
  sendSellerRejectedEmail,
  sendAccountSuspendedEmail,
  // Inventory
  sendLowStockAlertToSeller,
  // Sales report digests (daily / weekly)
  sendSalesReportToSeller,
};
