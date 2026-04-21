const express = require('express');
const router = express.Router();
const CustomerService = require('../services/customerService');
const { requireUser, checkPermission } = require('./middleware/auth');
const {
  customerValidation,
  mongoIdValidation,
  paginationValidation,
  handleValidationErrors
} = require('../middleware/validation');
const { paginationMiddleware } = require('../utils/pagination');
const { auditLogger } = require('../config/logger');
const { cacheMiddleware } = require('../config/cache');

// Get all customers with pagination and search
router.get('/',
  requireUser,
  checkPermission('customers'),
  paginationValidation,
  handleValidationErrors,
  paginationMiddleware,
  cacheMiddleware(300), // Cache for 5 minutes
  async (req, res) => {
    try {
      const result = await CustomerService.getAllCustomers(req.pagination, req.query);

      auditLogger.info('Customers accessed', {
        action: 'VIEW_CUSTOMERS',
        userId: req.user.userId,
        pagination: req.pagination,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        customers: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch customers',
        message: error.message
      });
    }
  }
);

// Get customer by ID
router.get('/:id', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    const customer = await CustomerService.getCustomerById(req.params.id);
    res.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    if (error.message === 'Customer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Create a new customer
router.post('/',
  requireUser,
  checkPermission('customers'),
  customerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const customer = await CustomerService.createCustomer(req.body);

      auditLogger.info('Customer created', {
        action: 'CREATE_CUSTOMER',
        userId: req.user.userId,
        customerId: customer._id,
        customerData: {
          name: customer.name,
          type: customer.type,
          email: customer.email
        },
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        customer
      });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to create customer',
        message: error.message
      });
    }
  }
);

// Update a customer
router.put('/:id', requireUser, mongoIdValidation('id'), customerValidation, handleValidationErrors, async (req, res) => {
  try {
    const customer = await CustomerService.updateCustomer(req.params.id, req.body);
    res.json({ 
      success: true,
      customer 
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.message === 'Customer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete a customer
router.delete('/:id', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    await CustomerService.deleteCustomer(req.params.id);
    res.json({ 
      success: true,
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    if (error.message === 'Customer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update customer credit
router.put('/:id/credit', requireUser, mongoIdValidation('id'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    
    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ message: 'Amount must be a valid number' });
    }
    
    const customer = await CustomerService.updateCredit(req.params.id, parsedAmount);
    res.json({ 
      success: true,
      customer 
    });
  } catch (error) {
    console.error('Error updating customer credit:', error);
    if (error.message === 'Customer not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Credit limit exceeded') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;