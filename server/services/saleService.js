const Sale = require('../models/Sale');

class SaleService {
  async getAllSales(pagination, filters = {}, userId = null) {
    const { page, limit, skip } = pagination;
    const { search, startDate, endDate } = filters;

    let query = {};

    // CRITICAL: Filter by createdBy for data isolation
    if (userId) {
      query.createdBy = userId;
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
    
    // CRITICAL: Filter by createdBy for data isolation
    if (userId) {
      query.createdBy = userId;
    }
    
    return await Sale.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getSaleById(id, userId = null) {
    let query = { _id: id };
    
    // CRITICAL: Filter by createdBy for data isolation
    if (userId) {
      query.createdBy = userId;
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

  /**
   * Guest / marketplace checkout: resolve products server-side, group by owner (seller),
   * create one completed sale per seller for correct revenue + inventory attribution.
   */
  async processPublicMultiSellerOrder({ items, paymentMethod = 'cash', customer, notes }) {
    const Product = require('../models/Product');

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required');
    }

    const resolved = [];
    for (const line of items) {
      const pid = line.product || line._id;
      if (!pid) {
        throw new Error('Each item must include a product id');
      }

      const p = await Product.findById(pid).select('userId price stock name status isPublished');
      if (!p) {
        throw new Error(`Product not found: ${pid}`);
      }
      if (p.status !== 'active' || !p.isPublished) {
        throw new Error(`Product is not available for sale: ${p.name}`);
      }

      const requestedQty = Math.max(1, parseInt(line.quantity, 10) || 1);
      const stock = typeof p.stock === 'number' ? p.stock : 0;
      if (stock < requestedQty) {
        throw new Error(`Insufficient stock for "${p.name}" (available: ${stock})`);
      }

      resolved.push({
        product: p._id,
        _id: p._id,
        name: p.name,
        price: p.price,
        quantity: requestedQty,
        ownerId: p.userId.toString()
      });
    }

    const byOwner = new Map();
    for (const r of resolved) {
      const list = byOwner.get(r.ownerId) || [];
      list.push(r);
      byOwner.set(r.ownerId, list);
    }

    const guestBlob =
      customer || notes
        ? JSON.stringify({
            guestCustomer: customer || {},
            orderNotes: notes || ''
          })
        : '';

    const sales = [];
    for (const [, groupItems] of byOwner) {
      const combinedNotes = guestBlob || notes || '';
      const saleData = {
        items: groupItems.map(i => ({
          product: i.product,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        paymentMethod,
        notes: combinedNotes,
        total: groupItems.reduce((s, i) => s + i.price * i.quantity, 0),
        taxRate: 0,
        amountPaid: groupItems.reduce((s, i) => s + i.price * i.quantity, 0)
      };

      const result = await this.processSale(saleData, groupItems[0].ownerId);
      sales.push(result.sale);
    }

    return {
      success: true,
      sales,
      sellersCount: sales.length
    };
  }

  /**
   * Process a sale with inventory update and validation
   * @param {Object} saleData - Sale data with items, payment, etc.
   * @param {string} userId - User ID for data isolation
   * @returns {Promise<Object>} Processed sale with details
   */
  async processSale(saleData, userId) {
    const { items, paymentMethod, customerId, discounts, notes, amountPaid, taxRate, transactionNumber, total } = saleData;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required and must be an array');
    }

    // Validate payment method
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.product || item._id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal
      };
    });

    // Calculate tax
    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const discountAmount = discounts || 0;
    const finalTotal = subtotal + taxAmount - discountAmount;

    // Generate unique invoice number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoiceNumber = `INV-${timestamp}-${random}`;

    // Create sale record
    const sale = new Sale({
      invoiceNumber,
      items: processedItems,
      subtotal,
      tax: taxRate || 0,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod,
      customerId: customerId || null,
      notes,
      amountPaid: amountPaid || finalTotal,
      change: (amountPaid || finalTotal) - finalTotal,
      createdBy: userId, // CRITICAL: Link sale to user for data isolation
      status: 'completed'
    });

    await sale.save();

    // Update product stock levels
    const Product = require('../models/Product');
    for (const item of items) {
      const productId = item.product || item._id;
      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { 
            stock: -item.quantity,
            'analytics.sales': item.quantity,
            'analytics.revenue': item.price * item.quantity
          }
        });
      }
    }

    return {
      success: true,
      sale,
      message: 'Sale processed successfully'
    };
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
    
    // CRITICAL: Filter by createdBy for data isolation
    if (userId) {
      query.createdBy = userId;
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
