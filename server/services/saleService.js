const Sale = require('../models/Sale');

class SaleService {
  async getAllSales(pagination, filters = {}, userId = null) {
    const { page, limit, skip } = pagination;
    const { search, startDate, endDate } = filters;

    let query = {};

    // CRITICAL: Filter by userId for data isolation
    if (userId) {
      query.userId = userId;
    }

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

  async getRecentSales(limit = 10, userId = null) {
    let query = {};
    
    // CRITICAL: Filter by userId for data isolation
    if (userId) {
      query.userId = userId;
    }
    
    return await Sale.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getSaleById(id, userId = null) {
    let query = { _id: id };
    
    // CRITICAL: Filter by userId for data isolation
    if (userId) {
      query.userId = userId;
    }
    
    const sale = await Sale.findOne(query).populate('customerId', 'name email');
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

  async getSalesSummary(userId = null) {
    let query = {};
    
    // CRITICAL: Filter by userId for data isolation
    if (userId) {
      query.userId = userId;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    // Get all sales for this user
    const allSales = await Sale.find(query);
    
    // Calculate summaries
    const dailySales = allSales.filter(s => new Date(s.createdAt) >= today);
    const weeklySales = allSales.filter(s => new Date(s.createdAt) >= weekAgo);
    const monthlySales = allSales.filter(s => new Date(s.createdAt) >= monthAgo);
    
    const daily = dailySales.reduce((sum, s) => sum + s.total, 0);
    const weekly = weeklySales.reduce((sum, s) => sum + s.total, 0);
    const monthly = monthlySales.reduce((sum, s) => sum + s.total, 0);
    
    // Get top products
    const productMap = {};
    allSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productMap[item.name]) {
          productMap[item.name] = { name: item.name, count: 0 };
        }
        productMap[item.name].count += item.quantity;
      });
    });
    
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const averageTransactionValue = allSales.length > 0 
      ? allSales.reduce((sum, s) => sum + s.total, 0) / allSales.length 
      : 0;
    
    return {
      daily,
      weekly,
      monthly,
      topProducts,
      averageTransactionValue
    };
  }
}

module.exports = new SaleService();
