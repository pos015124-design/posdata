const Customer = require('../models/Customer');

class CustomerService {
  async getAllCustomers(pagination, filters = {}) {
    const { page, limit, skip } = pagination;
    const { search } = filters;

    let query = { isActive: true };

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

  async createCustomer(data) {
    const customer = new Customer(data);
    await customer.save();
    return customer;
  }

  async updateCustomer(id, data) {
    const customer = await Customer.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async deleteCustomer(id) {
    const customer = await Customer.findByIdAndUpdate(
      id,
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
