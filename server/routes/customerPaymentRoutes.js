const express = require('express');
const router = express.Router();
const CustomerPaymentService = require('../services/customerPaymentService');
const { requireUser } = require('./middleware/auth');

// Get all payments for a customer
router.get('/customer/:customerId', requireUser, async (req, res) => {
  try {
    const payments = await CustomerPaymentService.getCustomerPayments(req.params.customerId);
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get payment by ID
router.get('/:id', requireUser, async (req, res) => {
  try {
    const payment = await CustomerPaymentService.getPaymentById(req.params.id);
    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    if (error.message === 'Payment not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Create a new payment
router.post('/', requireUser, async (req, res) => {
  try {
    const payment = await CustomerPaymentService.createPayment(req.body);
    res.status(201).json({ 
      success: true,
      payment 
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a payment
router.put('/:id', requireUser, async (req, res) => {
  try {
    const payment = await CustomerPaymentService.updatePayment(req.params.id, req.body);
    res.json({ 
      success: true,
      payment 
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    if (error.message === 'Payment not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete a payment
router.delete('/:id', requireUser, async (req, res) => {
  try {
    await CustomerPaymentService.deletePayment(req.params.id);
    res.json({ 
      success: true,
      message: 'Payment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    if (error.message === 'Payment not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;