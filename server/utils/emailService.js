/**
 * Email Service Module
 * Provides email sending functionality for the Dukani system
 */

const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

// Create a transporter for sending emails
const createTransporter = () => {
  // Check if we have environment variables for email configuration
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Use a mock transporter for development when email settings aren't configured
    logger.warn('Email settings not configured, using mock transporter');
    return nodemailer.createTransporter({
      jsonTransport: true // This just returns the email as JSON without sending
    });
  }
};

// Function to send email
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    // Default email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dukani.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      recipients: options.to,
      subject: options.subject
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email', {
      error: error.message,
      recipients: options.to,
      subject: options.subject
    });
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Function to send verification email
const sendVerificationEmail = async (userEmail, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
  
  const mailOptions = {
    to: userEmail,
    subject: 'Email Verification - Dukani System',
    html: `
      <h2>Email Verification</h2>
      <p>Thank you for registering with Dukani System. Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>If you did not register for an account, please ignore this email.</p>
    `,
    text: `Thank you for registering with Dukani System. Please visit the following link to verify your email address: ${verificationUrl}`
  };

  return await sendEmail(mailOptions);
};

// Function to send password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    to: userEmail,
    subject: 'Password Reset - Dukani System',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Dukani System account. Please click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request a password reset, please ignore this email.</p>
    `,
    text: `You requested a password reset for your Dukani System account. Please visit the following link to reset your password: ${resetUrl}`
  };

  return await sendEmail(mailOptions);
};

// Function to send alert emails (for monitoring)
const sendAlertEmail = async (alert) => {
  const mailOptions = {
    to: process.env.ALERT_EMAIL_RECIPIENTS || 'admin@dukani.com',
    subject: `Dukani System Alert: ${alert.type}`,
    html: `
      <h2>Dukani System Alert</h2>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
    `,
    text: `Dukani System Alert
Type: ${alert.type}
Severity: ${alert.severity}
Message: ${alert.message}
Timestamp: ${alert.timestamp}`
  };

  return await sendEmail(mailOptions);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAlertEmail
};