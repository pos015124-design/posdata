const CustomerPayment = require('../models/CustomerPayment');
const CustomerService = require('./customerService');

class CustomerPaymentService {
  /**
   * Get all payments for a specific customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Array of payments
   */
  static async getCustomerPayments(customerId) {
    try {
      return await CustomerPayment.find({ customer: customerId })
        .sort({ date: -1 }); // Most recent first
    } catch (error) {
      throw new Error(`Error fetching customer payments: ${error.message}`);
    }
  }

  /**
   * Get payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment object
   */
  static async getPaymentById(id) {
    try {
      const payment = await CustomerPayment.findById(id).populate('customer', 'name');
      if (!payment) {
        throw new Error('Payment not found');
      }
      return payment;
    } catch (error) {
      throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  /**
   * Create a new payment and update customer credit
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  static async createPayment(paymentData) {
    try {
      // Validate the payment amount is positive
      if (paymentData.amount <= 0) {
        throw new Error('Payment amount must be positive');
      }

      // Create the payment record
      const payment = new CustomerPayment(paymentData);
      await payment.save();

      // Update the customer's credit (reduce it by the payment amount)
      // Note: We use negative amount because updateCredit adds to current credit
      // and we want to reduce it
      const negativeAmount = -Math.abs(paymentData.amount);
      await CustomerService.updateCredit(paymentData.customer, negativeAmount);

      return payment;
    } catch (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }
  }

  /**
   * Update a payment
   * @param {string} id - Payment ID
   * @param {Object} paymentData - Updated payment data
   * @returns {Promise<Object>} Updated payment
   */
  static async updatePayment(id, paymentData) {
    try {
      // Get the original payment to calculate credit adjustment
      const originalPayment = await CustomerPayment.findById(id);
      if (!originalPayment) {
        throw new Error('Payment not found');
      }

      // If amount is changing, we need to adjust the customer's credit
      if (paymentData.amount && paymentData.amount !== originalPayment.amount) {
        // Calculate the difference in payment amount
        const amountDifference = originalPayment.amount - paymentData.amount;
        
        // Update the customer's credit based on the difference
        // If new amount is higher, credit decreases more (negative adjustment)
        // If new amount is lower, credit increases (positive adjustment)
        await CustomerService.updateCredit(originalPayment.customer, amountDifference);
      }

      // Update the payment record
      const payment = await CustomerPayment.findByIdAndUpdate(
        id,
        paymentData,
        { new: true, runValidators: true }
      );

      return payment;
    } catch (error) {
      throw new Error(`Error updating payment: ${error.message}`);
    }
  }

  /**
   * Delete a payment and adjust customer credit
   * @param {string} id - Payment ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deletePayment(id) {
    try {
      const payment = await CustomerPayment.findById(id);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Reverse the payment by adding the amount back to the customer's credit
      await CustomerService.updateCredit(payment.customer, payment.amount);

      // Delete the payment record
      await CustomerPayment.findByIdAndDelete(id);
      
      return true;
    } catch (error) {
      throw new Error(`Error deleting payment: ${error.message}`);
    }
  }
}

module.exports = CustomerPaymentService;