const Sale = require('../models/Sale');

class SaleService {
  async getAllSales(pagination, filters = {}) {
    const { page, limit, skip } = pagination;
    const { search, startDate, endDate } = filters;

    let query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Sale.countDocuments(query);
    const data = await Sale.find(query)
      .populate('customerId', 'name email')
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

  async getSaleById(id) {
    const sale = await Sale.findById(id).populate('customerId', 'name email');
    if (!sale) {
      throw new Error('Sale not found');
    }
    return sale;
  }

  async createSale(data) {
    const sale = new Sale(data);
    await sale.save();
    return sale;
  }

  async updateSale(id, data) {
    const sale = await Sale.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    if (!sale) {
      throw new Error('Sale not found');
    }
    return sale;
  }

  async deleteSale(id) {
    const sale = await Sale.findByIdAndDelete(id);
    if (!sale) {
      throw new Error('Sale not found');
    }
    return sale;
  }
}

module.exports = new SaleService();
