const { body, param, query, validationResult } = require('express-validator');
const { securityLogger } = require('../config/logger');

// Common validation patterns
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const nameValidation = (field = 'name') => body(field)
  .optional()
  .isLength({ min: 2, max: 100 })
  .withMessage(`${field} must be between 2 and 100 characters`)
  .matches(/^[a-zA-Z\s\-'\.]+$/)
  .withMessage(`${field} can only contain letters, spaces, hyphens, apostrophes, and periods`)
  .trim();

const phoneValidation = body('phone')
  .optional()
  .matches(/^[\+]?[1-9][\d]{0,15}$/)
  .withMessage('Please provide a valid phone number');

const mongoIdValidation = (field = 'id') => param(field)
  .isMongoId()
  .withMessage(`Invalid ${field} format`);

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100'),
  query('sort')
    .optional()
    .matches(/^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/)
    .withMessage('Sort must be a valid field name with optional .asc or .desc'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters')
    .escape()
];

// Product validation
const productValidation = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name is required and must be less than 200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .trim()
    .escape(),
  body('price')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be a positive number less than 999,999.99'),
  body('cost')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Cost must be a positive number less than 999,999.99'),
  // Accept either 'quantity' or 'stock' as the inventory field
  body('quantity')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Quantity must be a non-negative integer less than 999,999'),
  body('stock')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Stock must be a non-negative integer less than 999,999'),
  body('reorderPoint')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Reorder point must be a non-negative integer'),
  body('category')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must be less than 100 characters')
    .trim(),
  body('supplier')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Supplier name must be less than 200 characters')
    .trim()
    .escape(),
  body('sku')
    .optional()
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('SKU can only contain letters, numbers, hyphens, and underscores')
    .isLength({ max: 50 })
    .withMessage('SKU must be less than 50 characters')
];

// Customer validation
const customerValidation = [
  nameValidation('name').notEmpty().withMessage('Customer name is required'),
  emailValidation.optional(),
  phoneValidation,
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
    .trim()
    .escape(),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Credit limit must be a positive number less than 999,999.99'),
  body('type')
    .isIn(['cash', 'credit'])
    .withMessage('Customer type must be either cash or credit')
];

// Sale validation
const saleValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Sale must contain at least one item'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Product ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 999999 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.price')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be a positive number'),
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Customer ID must be valid'),
  body('paymentMethod')
    .isIn(['cash', 'credit', 'mobile_money', 'bank_transfer'])
    .withMessage('Payment method must be cash, credit, mobile_money, or bank_transfer'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100 percent'),
  body('tax')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax must be between 0 and 100 percent')
];

// Staff validation
const staffValidation = [
  nameValidation('name').notEmpty().withMessage('Staff name is required'),
  emailValidation,
  phoneValidation,
  body('role')
    .isIn(['Manager', 'Sales Clerk', 'Cashier', 'Inventory Manager'])
    .withMessage('Role must be Manager, Sales Clerk, Cashier, or Inventory Manager'),
  body('salary')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Salary must be a positive number'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object')
];

// Expense validation
const expenseValidation = [
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Expense description is required and must be less than 500 characters')
    .trim()
    .escape(),
  body('amount')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Amount must be a positive number less than 999,999.99'),
  body('category')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must be less than 100 characters')
    .trim()
    .escape(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    console.error('VALIDATION ERROR:', JSON.stringify(errors.array(), null, 2));
    securityLogger.warn('Validation failed', {
      errors: errors.array(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body
    });

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  emailValidation,
  passwordValidation,
  nameValidation,
  phoneValidation,
  mongoIdValidation,
  paginationValidation,
  productValidation,
  customerValidation,
  saleValidation,
  staffValidation,
  expenseValidation,
  handleValidationErrors
};