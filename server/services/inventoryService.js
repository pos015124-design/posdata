const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const mongoose = require('mongoose');

class InventoryService {
  /**
   * Get restock history
   * @returns {Promise<Array>} Array of restock records
   */
  static async getRestockHistory() {
    try {
      return await Inventory.find({ type: 'restock' })
        .sort({ createdAt: -1 })
        .populate('staff', 'name email');
    } catch (error) {
      throw new Error(`Error fetching restock history: ${error.message}`);
    }
  }

  /**
   * Restock a product
   * @param {Object} restockData - Restock data
   * @param {string} userId - User ID performing the restock
   * @returns {Promise<Object>} Restock record
   */
  static async restockProduct(restockData, userId) {
    try {
      // Get the product
      const product = await Product.findById(restockData.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate total cost
      const totalCost = restockData.quantity * restockData.unitCost;

      // Create inventory record
      const inventoryRecord = new Inventory({
        product: product._id,
        productName: product.name,
        type: 'restock',
        quantity: restockData.quantity,
        previousStock: product.stock,
        newStock: product.stock + restockData.quantity,
        unitCost: restockData.unitCost,
        totalCost,
        supplier: restockData.supplierId,
        invoiceNumber: restockData.invoiceNumber,
        notes: restockData.notes,
        staff: userId
      });

      await inventoryRecord.save();

      // Update product stock
      product.stock += restockData.quantity;
      
      // Update product price if selling price is provided
      if (restockData.sellingPrice) {
        const oldPrice = product.price;
        
        // Check if price is different
        if (oldPrice !== restockData.sellingPrice) {
          // Add note about price change
          const priceChangeNote = `Selling price updated from ${oldPrice} to ${restockData.sellingPrice}.`;
          inventoryRecord.notes = inventoryRecord.notes
            ? `${inventoryRecord.notes} ${priceChangeNote}`
            : priceChangeNote;
          
          await inventoryRecord.save();
          
          // Update the price
          product.price = restockData.sellingPrice;
        }
      }
      
      product.updatedAt = Date.now();
      await product.save();

      return inventoryRecord;
    } catch (error) {
      throw new Error(`Error restocking product: ${error.message}`);
    }
  }

  /**
   * Update product stock
   * @param {string} productId - Product ID
   * @param {number} newStock - New stock quantity
   * @param {string} userId - User ID performing the update
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Inventory record
   */
  static async updateStock(productId, newStock, userId, notes = '') {
    try {
      // Get the product
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate quantity change
      const quantityChange = newStock - product.stock;

      // Create inventory record
      const inventoryRecord = new Inventory({
        product: product._id,
        productName: product.name,
        type: 'adjustment',
        quantity: quantityChange,
        previousStock: product.stock,
        newStock,
        notes,
        staff: userId
      });

      await inventoryRecord.save();

      // Update product stock
      product.stock = newStock;
      product.updatedAt = Date.now();
      await product.save();

      return inventoryRecord;
    } catch (error) {
      throw new Error(`Error updating product stock: ${error.message}`);
    }
  }

  /**
   * Get low stock alerts
   * @returns {Promise<Array>} Array of products with stock below reorder point
   */
  static async getLowStockAlerts() {
    try {
      return await Product.find({
        $expr: { $lt: ['$stock', '$reorderPoint'] }
      }).select('_id name stock reorderPoint');
    } catch (error) {
      throw new Error(`Error fetching low stock alerts: ${error.message}`);
    }
  }

  /**
   * Record stock reduction from sale
   * @param {Array} items - Array of items sold
   * @param {string} saleId - Sale ID
   * @param {string} userId - User ID performing the sale
   * @returns {Promise<boolean>} True if successful
   */
  static async recordSale(items, saleId, userId) {
    try {
      for (const item of items) {
        // Get the product
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Check if enough stock
        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name}`);
        }

        // Create inventory record
        const inventoryRecord = new Inventory({
          product: product._id,
          productName: product.name,
          type: 'sale',
          quantity: -item.quantity, // Negative because it's a reduction
          previousStock: product.stock,
          newStock: product.stock - item.quantity,
          reference: saleId,
          referenceModel: 'Sale',
          staff: userId
        });

        await inventoryRecord.save();

        // Update product stock
        product.stock -= item.quantity;
        product.updatedAt = Date.now();
        await product.save();
      }

      return true;
    } catch (error) {
      throw new Error(`Error recording sale in inventory: ${error.message}`);
    }
  }
}

module.exports = InventoryService;