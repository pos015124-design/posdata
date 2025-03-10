const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const InventoryService = require('./inventoryService');
const CustomerService = require('./customerService');
const mongoose = require('mongoose');

class SaleService {
  /**
   * Get all sales
   * @returns {Promise<Array>} Array of sales
   */
  static async getAllSales() {
    try {
      return await Sale.find()
        .sort({ createdAt: -1 })
        .populate('customer', 'name')
        .populate('staff', 'name');
    } catch (error) {
      throw new Error(`Error fetching sales: ${error.message}`);
    }
  }

  /**
   * Get recent sales
   * @param {number} limit - Number of sales to return
   * @returns {Promise<Array>} Array of recent sales
   */
  static async getRecentSales(limit = 10) {
    try {
      return await Sale.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customer', 'name')
        .populate('staff', 'name');
    } catch (error) {
      throw new Error(`Error fetching recent sales: ${error.message}`);
    }
  }

  /**
   * Get sale by ID
   * @param {string} id - Sale ID
   * @returns {Promise<Object>} Sale object
   */
  static async getSaleById(id) {
    try {
      const sale = await Sale.findById(id)
        .populate('customer', 'name email phone')
        .populate('staff', 'name');
      
      if (!sale) {
        throw new Error('Sale not found');
      }
      
      return sale;
    } catch (error) {
      throw new Error(`Error fetching sale: ${error.message}`);
    }
  }

  /**
   * Process a payment/sale
   * @param {Object} saleData - Sale data
   * @param {string} userId - User ID processing the sale
   * @returns {Promise<Object>} Created sale
   */
  static async processSale(saleData, userId) {
    try {
      // Prepare sale items with product details
      const saleItems = [];
      let subtotal = 0;

      // Validate and process each item
      for (const item of saleData.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Check if enough stock
        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name}`);
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        saleItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal
        });
      }

      // Tax is now optional, default to 0 (no tax)
      const taxRate = saleData.taxRate || 0;
      
      // Check if tax is included in price
      let tax = 0;
      if (saleData.taxIncluded) {
        // If tax is included, extract it from the subtotal
        // Formula: tax = subtotal - (subtotal / (1 + taxRate))
        tax = subtotal - (subtotal / (1 + taxRate));
      } else {
        // If tax is not included, calculate it normally
        tax = subtotal * taxRate;
      }

      // Process discounts
      let discountAmount = 0;
      const discounts = saleData.discounts || [];
      
      for (const discount of discounts) {
        if (discount.type === 'percentage') {
          discountAmount += (subtotal * (discount.amount / 100));
        } else if (discount.type === 'fixed') {
          discountAmount += discount.amount;
        }
      }

      // Calculate total
      // If tax is included in price, don't add it again to the subtotal
      const total = saleData.taxIncluded ? subtotal - discountAmount : subtotal + tax - discountAmount;

      // Calculate change
      const amountPaid = saleData.amountPaid || total;
      const change = Math.max(0, amountPaid - total);

      // Create the sale
      const sale = new Sale({
        items: saleItems,
        customer: saleData.customerId || null,
        subtotal,
        tax,
        taxRate: taxRate * 100, // Store as percentage (e.g., 15 for 15%)
        discounts,
        total,
        paymentMethod: saleData.paymentMethod,
        transactionNumber: saleData.transactionNumber || '',
        amountPaid,
        change,
        notes: saleData.notes || '',
        staff: userId
      });

      await sale.save();

      // Update inventory and reduce stock for each product
      for (const item of saleData.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      // If it's a credit sale, update customer credit
      if (saleData.paymentMethod === 'credit' && saleData.customerId) {
        await CustomerService.updateCredit(saleData.customerId, total);
      }

      return {
        success: true,
        orderId: sale._id,
        receipt: {
          items: saleItems,
          subtotal,
          tax,
          total,
          change,
          date: sale.createdAt
        }
      };
    } catch (error) {
      throw new Error(`Error processing sale: ${error.message}`);
    }
  }

  /**
   * Generate receipt for a sale
   * @param {string} saleId - Sale ID
   * @returns {Promise<string>} Formatted receipt
   */
  static async generateReceipt(saleId) {
    try {
      const sale = await SaleService.getSaleById(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }

      // Get business settings
      const settings = await Settings.findOne({ storeId: 'default' });
      const businessName = settings?.business?.name || 'DUKANI SYSTEM';
      const businessAddress = settings?.business?.address || '';
      const businessPhone = settings?.business?.phone || '';
      const businessTaxId = settings?.business?.taxId || '';
      const receiptFooter = settings?.receipt?.footerText || 'Thank you for shopping!';
      const showTaxId = settings?.receipt?.showTaxId || false;
      const taxIncluded = settings?.tax?.taxIncluded || false;

      // Format the receipt
      let receipt = `
${businessName}
=====================
${businessAddress ? businessAddress + '\n' : ''}${businessPhone ? 'Phone: ' + businessPhone + '\n' : ''}${showTaxId && businessTaxId ? 'Tax ID: ' + businessTaxId + '\n' : ''}
Order #${sale._id}
Date: ${new Date(sale.createdAt).toLocaleString()}

Items:
`;

      // Add items
      for (const item of sale.items) {
        receipt += `${item.quantity}x ${item.name.padEnd(15)} ${item.total.toLocaleString()}\n`;
      }

      if (taxIncluded) {
        receipt += `
      ---------------------
      Total (incl. tax)    ${sale.subtotal.toLocaleString()}
      Tax (${sale.taxRate}%)  ${sale.tax.toLocaleString()} (Included in price)
      `;
      } else {
        receipt += `
      ---------------------
      Subtotal    ${sale.subtotal.toLocaleString()}
      Tax (${sale.taxRate}%)  ${sale.tax.toLocaleString()}
      `;
      }

      // Add discounts if any
      if (sale.discounts && sale.discounts.length > 0) {
        receipt += `Discount    ${sale.discounts.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}\n`;
      }

      receipt += `
---------------------
Total      ${sale.total.toLocaleString()}

Payment: ${sale.paymentMethod.toUpperCase()}
Amount Paid: ${sale.amountPaid.toLocaleString()}
Change: ${sale.change.toLocaleString()}

${receiptFooter}
=====================
`;

      return { receipt: receipt.trim() };
    } catch (error) {
      throw new Error(`Error generating receipt: ${error.message}`);
    }
  }

  /**
   * Get sales summary
   * @returns {Promise<Object>} Sales summary
   */
  static async getSalesSummary() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Get daily, weekly, and monthly sales with tax breakdown
      const [dailySales, weeklySales, monthlySales, dailyTax, weeklyTax, monthlyTax] = await Promise.all([
        // Revenue (total)
        Sale.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: monthAgo } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        // Tax amounts
        Sale.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: monthAgo } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ])
      ]);

      // Get top products
      const topProducts = await Sale.aggregate([
        { $unwind: '$items' },
        { 
          $group: { 
            _id: '$items.name', 
            count: { $sum: '$items.quantity' } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: '$_id', count: 1, _id: 0 } }
      ]);

      // Get average transaction value
      const avgTransaction = await Sale.aggregate([
        { $group: { _id: null, avg: { $avg: '$total' } } }
      ]);

      return {
        daily: dailySales.length > 0 ? dailySales[0].total : 0,
        weekly: weeklySales.length > 0 ? weeklySales[0].total : 0,
        monthly: monthlySales.length > 0 ? monthlySales[0].total : 0,
        tax: {
          daily: dailyTax.length > 0 ? dailyTax[0].tax : 0,
          weekly: weeklyTax.length > 0 ? weeklyTax[0].tax : 0,
          monthly: monthlyTax.length > 0 ? monthlyTax[0].tax : 0
        },
        netRevenue: {
          daily: (dailySales.length > 0 ? dailySales[0].total : 0) - (dailyTax.length > 0 ? dailyTax[0].tax : 0),
          weekly: (weeklySales.length > 0 ? weeklySales[0].total : 0) - (weeklyTax.length > 0 ? weeklyTax[0].tax : 0),
          monthly: (monthlySales.length > 0 ? monthlySales[0].total : 0) - (monthlyTax.length > 0 ? monthlyTax[0].tax : 0)
        },
        topProducts,
        averageTransactionValue: avgTransaction.length > 0 ? avgTransaction[0].avg : 0
      };
    } catch (error) {
      throw new Error(`Error getting sales summary: ${error.message}`);
    }
  }
}

module.exports = SaleService;