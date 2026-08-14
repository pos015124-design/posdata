const mongoose = require('mongoose');
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
   * Validate + resolve cart lines server-side (price/stock/availability from DB, never the client).
   * @returns {Promise<Array>} resolved lines: { product, _id, name, price, quantity, ownerId }
   */
  async resolveCartItems(items) {
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
    return resolved;
  }

  /**
   * Guest / marketplace checkout: resolve products server-side, group by owner (seller),
   * create one completed sale per seller for correct revenue + inventory attribution.
   */
  async processPublicMultiSellerOrder({ items, paymentMethod = 'cash', customer, notes }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required');
    }

    const resolved = await this.resolveCartItems(items);

    const byOwner = new Map();
    for (const r of resolved) {
      const list = byOwner.get(r.ownerId) || [];
      list.push(r);
      byOwner.set(r.ownerId, list);
    }

    const sales = [];
    for (const [, groupItems] of byOwner) {
      const saleData = {
        items: groupItems.map(i => ({
          product: i.product,
          name: i.name,
          quantity: i.quantity,
          price: i.price
        })),
        paymentMethod,
        notes: notes || '',
        total: groupItems.reduce((s, i) => s + i.price * i.quantity, 0),
        taxRate: 0,
        amountPaid: groupItems.reduce((s, i) => s + i.price * i.quantity, 0),
        // Store customer info directly on the sale
        customerName: customer?.name || '',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        customerAddress: customer?.address || '',
        customerCity: customer?.city || '',
        source: 'storefront'
      };

      const result = await this.processSale(saleData, groupItems[0].ownerId);
      sales.push(result.sale);
    }

    // Send emails after all sales created (non-blocking, never throws)
    // stripSellerContact: false preserves the cash path's long-standing behavior.
    setImmediate(() => {
      this.notifyOrderCreated({ sales, customer, paymentMethod, stripSellerContact: false }).catch(e =>
        console.error('[Email] order notify error:', e.message)
      );
    });

    return {
      success: true,
      sales,
      sellersCount: sales.length
    };
  }

  /**
   * Post-payment notifications for a set of paid storefront sales: seller emails + in-app
   * notifications + buyer confirmation email. Non-blocking, never throws.
   * stripSellerContact=true applies the middleman model (no customer contact in seller emails).
   */
  async notifyOrderCreated({ sales, customer, paymentMethod, stripSellerContact = true }) {
    if (!sales || sales.length === 0) return;
    const { sendNewOrderToSeller, sendOrderConfirmationToBuyer } = require('../utils/emailService');
    const User = require('../models/User');

    for (const sale of sales) {
      const seller = await User.findById(sale.createdBy).select('email firstName notificationPrefs');
      if (seller?.email && seller.notificationPrefs?.email !== false) {
        const sellerContact = stripSellerContact
          ? { isStorefront: true, customer: null }
          : { customer: { name: sale.customerName, phone: sale.customerPhone, city: sale.customerCity } };
        sendNewOrderToSeller({
          sellerEmail: seller.email,
          sellerName: seller.firstName || seller.email.split('@')[0],
          invoiceNumber: sale.invoiceNumber,
          items: sale.items.map(i => ({ name: i.productName, quantity: i.quantity, price: i.price })),
          total: sale.total,
          ...sellerContact
        }).catch(e => console.error('[Email] seller notify failed:', e.message));
      }
      // In-app notification to the seller (non-blocking)
      try {
        const { createNotification } = require('../services/notificationService');
        await createNotification({
          userId: sale.createdBy,
          type: 'order',
          title: 'New order received',
          message: `Order ${sale.invoiceNumber} — TZS ${Number(sale.total || 0).toLocaleString()}`,
          link: '/orders'
        });
      } catch (notifErr) {
        console.error('[Notification] order notify failed:', notifErr.message);
      }
    }

    if (customer?.email) {
      const allItems = sales.flatMap(s => s.items.map(i => ({ name: i.productName, quantity: i.quantity, price: i.price })));
      sendOrderConfirmationToBuyer({
        buyerEmail: customer.email,
        buyerName: customer.name,
        invoices: sales.map(s => s.invoiceNumber),
        items: allItems,
        total: sales.reduce((sum, s) => sum + s.total, 0),
        paymentMethod
      }).catch(e => console.error('[Email] buyer confirm failed:', e.message));
    }
  }

  /**
   * Storefront checkout for online (Selcom) payments: validates the cart, creates one PENDING
   * sale per seller and reserves stock. Seller/buyer notifications + revenue are deferred until
   * confirmSalesPaid() (webhook confirm). Returns { sales, sellersCount, total }.
   */
  async processPendingPublicOrder({ items, paymentMethod = 'mobile', customer, notes }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required');
    }

    const resolved = await this.resolveCartItems(items);
    const byOwner = new Map();
    for (const r of resolved) {
      const list = byOwner.get(r.ownerId) || [];
      list.push(r);
      byOwner.set(r.ownerId, list);
    }

    const sales = [];
    let total = 0;
    for (const [, groupItems] of byOwner) {
      const ownerId = groupItems[0].ownerId;
      const groupTotal = groupItems.reduce((s, i) => s + i.price * i.quantity, 0);
      total += groupTotal;

      const sale = await this.createPendingSale({
        items: groupItems.map(i => ({ product: i.product, name: i.name, quantity: i.quantity, price: i.price })),
        paymentMethod,
        notes: notes || '',
        total: groupTotal,
        customerName: customer?.name || '',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        customerAddress: customer?.address || '',
        customerCity: customer?.city || ''
      }, ownerId);
      sales.push(sale);
    }

    return { success: true, sales, sellersCount: sales.length, total };
  }

  /** Create a pending storefront sale + reserve stock (low-stock alerts fire on reservation). */
  async createPendingSale(saleData, userId) {
    const { items, paymentMethod, notes, total, customerName, customerEmail, customerPhone, customerAddress, customerCity } = saleData;

    const processedItems = items.map(item => ({
      productId: item.product || item._id,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }));

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoiceNumber = `INV-${timestamp}-${random}`;

    const sale = new Sale({
      invoiceNumber,
      items: processedItems,
      subtotal: total,
      tax: 0,
      discount: 0,
      total,
      paymentMethod: ['mobile', 'card'].includes(paymentMethod) ? paymentMethod : 'online',
      paymentStatus: 'pending',
      status: 'pending',
      amountPaid: 0,
      change: 0,
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerCity: customerCity || '',
      source: 'storefront',
      notes: notes || '',
      createdBy: userId
    });
    await sale.save();

    // Reserve stock now so the same item can't be oversold while payment is in flight.
    const Product = require('../models/Product');
    const lowStockCrossings = [];
    for (const item of items) {
      const productId = item.product || item._id;
      if (!productId) continue;
      const prev = await Product.findByIdAndUpdate(productId, { $inc: { stock: -item.quantity } }, { new: false });
      if (
        prev &&
        typeof prev.stock === 'number' &&
        typeof prev.reorderPoint === 'number' &&
        prev.reorderPoint > 0 &&
        prev.stock > prev.reorderPoint &&
        (prev.stock - item.quantity) <= prev.reorderPoint
      ) {
        lowStockCrossings.push({
          _id: prev._id,
          name: prev.name,
          stock: Math.max(0, prev.stock - item.quantity),
          reorderPoint: prev.reorderPoint,
          userId: prev.userId
        });
      }
    }
    if (lowStockCrossings.length > 0) {
      this.notifyLowStockCrossings(lowStockCrossings);
    }

    return sale;
  }

  /** Low-stock email + in-app notification (non-blocking, never throws). */
  notifyLowStockCrossings(lowStockCrossings) {
    setImmediate(async () => {
      try {
        const { sendLowStockAlertToSeller } = require('../utils/emailService');
        const User = require('../models/User');
        for (const lp of lowStockCrossings) {
          if (!lp.userId) continue;
          const seller = await User.findById(lp.userId).select('email firstName notificationPrefs');
          if (seller?.email && seller.notificationPrefs?.email !== false) {
            sendLowStockAlertToSeller({
              sellerEmail: seller.email,
              sellerName: seller.firstName || seller.email.split('@')[0],
              productName: lp.name,
              currentStock: lp.stock,
              reorderPoint: lp.reorderPoint
            }).catch(e => console.error('[Email] low stock alert failed:', e.message));
          }
          try {
            const { createNotification } = require('../services/notificationService');
            await createNotification({
              userId: lp.userId,
              type: 'low_stock',
              title: 'Low stock alert',
              message: `${lp.name} is at or below its reorder point (${lp.stock} unit${lp.stock === 1 ? '' : 's'} left).`,
              link: '/inventory',
              ref: `product:${lp._id}`
            });
          } catch (notifErr) {
            console.error('[Notification] low stock notify failed:', notifErr.message);
          }
        }
      } catch (e) {
        console.error('[Email] low stock alert error:', e.message);
      }
    });
  }

  /**
   * Webhook confirm: mark linked pending sales paid, book revenue + analytics, then fire
   * seller/buyer notifications. Idempotent — safe on webhook redelivery.
   */
  async confirmSalesPaid({ saleIds, transactionId, selcomOrderId }) {
    if (!saleIds || saleIds.length === 0) return { count: 0 };

    const Sale = require('../models/Sale');
    const Product = require('../models/Product');
    const Business = require('../models/Business');
    const mongoose = require('mongoose');

    const sales = await Sale.find({ _id: { $in: saleIds } });
    const newlyPaid = [];

    for (const sale of sales) {
      if (sale.paymentStatus === 'paid') continue; // idempotency: already processed

      // Book revenue on the products
      for (const item of sale.items || []) {
        if (!item.productId) continue;
        await Product.findByIdAndUpdate(item.productId, {
          $inc: {
            'analytics.sales': item.quantity,
            'analytics.revenue': item.price * item.quantity
          }
        });
      }

      // Sync Business analytics (super admin live numbers)
      try {
        await Business.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(String(sale.createdBy)) },
          { $inc: { 'analytics.orders': 1, 'analytics.revenue': sale.total } }
        );
      } catch { /* non-critical */ }

      sale.paymentStatus = 'paid';
      sale.status = 'completed';
      sale.amountPaid = sale.total;
      sale.change = 0;
      sale.transactionId = transactionId || sale.transactionId;
      sale.selcomOrderId = selcomOrderId || sale.selcomOrderId;
      sale.paidAt = new Date();
      await sale.save();
      newlyPaid.push(sale);
    }

    if (newlyPaid.length > 0) {
      const customer = {
        name: newlyPaid[0].customerName,
        email: newlyPaid[0].customerEmail,
        phone: newlyPaid[0].customerPhone,
        city: newlyPaid[0].customerCity
      };
      this.notifyOrderCreated({ sales: newlyPaid, customer, paymentMethod: 'online' }).catch(e =>
        console.error('[Email] confirm notify error:', e.message)
      );
    }

    return { count: newlyPaid.length };
  }

  /**
   * Abandoned/failed payment: return reserved stock and cancel the pending sales.
   * Idempotent — safe on double-run.
   */
  async releasePendingSales(saleIds) {
    if (!saleIds || saleIds.length === 0) return { count: 0 };

    const Sale = require('../models/Sale');
    const Product = require('../models/Product');

    const sales = await Sale.find({ _id: { $in: saleIds }, paymentStatus: 'pending' });
    let count = 0;
    for (const sale of sales) {
      for (const item of sale.items || []) {
        if (!item.productId) continue;
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
      sale.paymentStatus = 'failed';
      sale.status = 'cancelled';
      sale.notes = (sale.notes ? sale.notes + ' | ' : '') + 'Payment abandoned or failed; stock released';
      await sale.save();
      count++;
    }
    return { count };
  }

  /**
   * Process a sale with inventory update and validation
   * @param {Object} saleData - Sale data with items, payment, etc.
   * @param {string} userId - User ID for data isolation
   * @returns {Promise<Object>} Processed sale with details
   */
  async processSale(saleData, userId) {
    const { items, paymentMethod, customerId, discounts, notes, amountPaid, taxRate, transactionNumber, total,
      customerName, customerEmail, customerPhone, customerAddress, customerCity, source } = saleData;

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
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerCity: customerCity || '',
      source: source || 'pos',
      notes,
      amountPaid: amountPaid || finalTotal,
      change: (amountPaid || finalTotal) - finalTotal,
      createdBy: userId, // CRITICAL: Link sale to user for data isolation
      status: 'completed',
      paymentStatus: 'paid'
    });

    await sale.save();

    // Update product stock levels and business analytics
    const Product = require('../models/Product');
    const Business = require('../models/Business');
    const lowStockCrossings = []; // products that just fell to/under their reorder point
    for (const item of items) {
      const productId = item.product || item._id;
      if (productId) {
        // { new: false } returns the pre-update document so we can detect a fresh
        // low-stock crossing (stock was above the reorder point, now at/below it)
        const prev = await Product.findByIdAndUpdate(productId, {
          $inc: { 
            stock: -item.quantity,
            'analytics.sales': item.quantity,
            'analytics.revenue': item.price * item.quantity
          }
        }, { new: false });

        if (
          prev &&
          typeof prev.stock === 'number' &&
          typeof prev.reorderPoint === 'number' &&
          prev.reorderPoint > 0 &&
          prev.stock > prev.reorderPoint &&
          (prev.stock - item.quantity) <= prev.reorderPoint
        ) {
          lowStockCrossings.push({
            _id: prev._id,
            name: prev.name,
            stock: Math.max(0, prev.stock - item.quantity),
            reorderPoint: prev.reorderPoint,
            userId: prev.userId
          });
        }
      }
    }

    // Notify sellers once per low-stock crossing (non-blocking, never throws)
    if (lowStockCrossings.length > 0) {
      setImmediate(async () => {
        try {
          const { sendLowStockAlertToSeller } = require('../utils/emailService');
          const User = require('../models/User');
          for (const lp of lowStockCrossings) {
            if (!lp.userId) continue;
            const seller = await User.findById(lp.userId).select('email firstName notificationPrefs');
            if (seller?.email && seller.notificationPrefs?.email !== false) {
              sendLowStockAlertToSeller({
                sellerEmail: seller.email,
                sellerName: seller.firstName || seller.email.split('@')[0],
                productName: lp.name,
                currentStock: lp.stock,
                reorderPoint: lp.reorderPoint
              }).catch(e => console.error('[Email] low stock alert failed:', e.message));
            }
            // In-app low-stock notification (non-blocking)
            try {
              const { createNotification } = require('../services/notificationService');
              await createNotification({
                userId: lp.userId,
                type: 'low_stock',
                title: 'Low stock alert',
                message: `${lp.name} is at or below its reorder point (${lp.stock} unit${lp.stock === 1 ? '' : 's'} left).`,
                link: '/inventory',
                ref: `product:${lp._id}`
              });
            } catch (notifErr) {
              console.error('[Notification] low stock notify failed:', notifErr.message);
            }
          }
        } catch (e) {
          console.error('[Email] low stock alert error:', e.message);
        }
      });
    }

    // Keep Business.analytics in sync so super admin sees live numbers
    if (userId) {
      try {
        await Business.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(String(userId)) },
          {
            $inc: {
              'analytics.orders': 1,
              'analytics.revenue': finalTotal
            }
          }
        );
      } catch {
        // Non-critical — getAllBusinesses aggregates live from Sale anyway
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
