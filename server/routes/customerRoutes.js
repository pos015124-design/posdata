const express = require('express');
const router = express.Router();
const CustomerService = require('../services/customerService');
const { requireUser } = require('./middleware/auth');

// Get all customers
router.get('/', requireUser, async (req, res) => {
  try {
    const customers = await CustomerService.getAllCustomers();
    res.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get customer by ID
router.get('/:id', requireUser, async (req, res) => {
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
router.post('/', requireUser, async (req, res) => {
  try {
    const customer = await CustomerService.createCustomer(req.body);
    res.status(201).json({ 
      success: true,
      customer 
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a customer
router.put('/:id', requireUser, async (req, res) => {
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
router.delete('/:id', requireUser, async (req, res) => {
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
router.put('/:id/credit', requireUser, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    
    const customer = await CustomerService.updateCredit(req.params.id, parseFloat(amount));
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