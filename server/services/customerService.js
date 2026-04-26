const Customer = require('../models/Customer');

class CustomerService {
  async getAllCustomers(pagination, filters = {}, userId = null) {
    const { page, limit, skip } = pagination;
    const { search } = filters;

    let query = { isActive: true };

    // CRITICAL: Filter by userId for data isolation
    if (userId) {
      query.userId = userId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(query);
    const data = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getCustomerById(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async createCustomer(data, userId = null) {
    // CRITICAL: Link customer to user for data isolation
    if (userId) {
      data.userId = userId;
    }
    const customer = new Customer(data);
    await customer.save();
    return customer;
  }

  async updateCustomer(id, data, userId = null) {
    // CRITICAL: Ensure user can only update their own customers
    const query = { _id: id };
    if (userId) {
      query.userId = userId;
    }
    
    const customer = await Customer.findOneAndUpdate(
      query,
      data,
      { new: true, runValidators: true }
    );
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async deleteCustomer(id, userId = null) {
    // CRITICAL: Ensure user can only delete their own customers
    const query = { _id: id };
    if (userId) {
      query.userId = userId;
    }
    
    const customer = await Customer.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async updateCredit(id, amount) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    customer.creditBalance += amount;
    await customer.save();
    return customer;
  }
}

module.exports = new CustomerService();
