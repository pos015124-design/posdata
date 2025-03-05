const Customer = require('../models/Customer');

class CustomerService {
  /**
   * Get all customers
   * @returns {Promise<Array>} Array of customers
   */
  static async getAllCustomers() {
    try {
      return await Customer.find().sort({ name: 1 });
    } catch (error) {
      throw new Error(`Error fetching customers: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   * @param {string} id - Customer ID
   * @returns {Promise<Object>} Customer object
   */
  static async getCustomerById(id) {
    try {
      const customer = await Customer.findById(id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      throw new Error(`Error fetching customer: ${error.message}`);
    }
  }

  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer
   */
  static async createCustomer(customerData) {
    try {
      // Check if customer with same email or phone already exists
      if (customerData.email || customerData.phone) {
        const query = { $or: [] };
        
        if (customerData.email) {
          query.$or.push({ email: customerData.email });
        }
        
        if (customerData.phone) {
          query.$or.push({ phone: customerData.phone });
        }
        
        if (query.$or.length > 0) {
          const existingCustomer = await Customer.findOne(query);
          
          if (existingCustomer) {
            if (customerData.email && existingCustomer.email === customerData.email) {
              throw new Error('Customer with this email already exists');
            }
            if (customerData.phone && existingCustomer.phone === customerData.phone) {
              throw new Error('Customer with this phone already exists');
            }
          }
        }
      }

      const customer = new Customer(customerData);
      await customer.save();
      return customer;
    } catch (error) {
      throw new Error(`Error creating customer: ${error.message}`);
    }
  }

  /**
   * Update a customer
   * @param {string} id - Customer ID
   * @param {Object} customerData - Updated customer data
   * @returns {Promise<Object>} Updated customer
   */
  static async updateCustomer(id, customerData) {
    try {
      // Check if updating email or phone to one that already exists
      if (customerData.email || customerData.phone) {
        const query = { 
          _id: { $ne: id },
          $or: []
        };
        
        if (customerData.email) {
          query.$or.push({ email: customerData.email });
        }
        
        if (customerData.phone) {
          query.$or.push({ phone: customerData.phone });
        }
        
        if (query.$or.length > 0) {
          const existingCustomer = await Customer.findOne(query);
          
          if (existingCustomer) {
            if (customerData.email && existingCustomer.email === customerData.email) {
              throw new Error('Customer with this email already exists');
            }
            if (customerData.phone && existingCustomer.phone === customerData.phone) {
              throw new Error('Customer with this phone already exists');
            }
          }
        }
      }

      const customer = await Customer.findByIdAndUpdate(
        id,
        { ...customerData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!customer) {
        throw new Error('Customer not found');
      }

      return customer;
    } catch (error) {
      throw new Error(`Error updating customer: ${error.message}`);
    }
  }

  /**
   * Delete a customer
   * @param {string} id - Customer ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteCustomer(id) {
    try {
      const result = await Customer.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Customer not found');
      }
      return true;
    } catch (error) {
      throw new Error(`Error deleting customer: ${error.message}`);
    }
  }

  /**
   * Update customer credit
   * @param {string} id - Customer ID
   * @param {number} amount - Amount to add to current credit (negative to reduce)
   * @returns {Promise<Object>} Updated customer
   */
  static async updateCredit(id, amount) {
    try {
      const customer = await Customer.findById(id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate new credit amount
      const newCredit = customer.currentCredit + amount;
      
      // Check if new credit exceeds limit for credit customers
      if (customer.type === 'credit' && newCredit > customer.creditLimit) {
        throw new Error('Credit limit exceeded');
      }

      // Update customer credit
      customer.currentCredit = newCredit;
      customer.updatedAt = Date.now();
      await customer.save();

      return customer;
    } catch (error) {
      throw new Error(`Error updating customer credit: ${error.message}`);
    }
  }
}

module.exports = CustomerService;