const Product = require('../models/Product');

class ProductService {
  /**
   * Get all products
   * @returns {Promise<Array>} Array of products
   */
  static async getAllProducts() {
    try {
      return await Product.find().sort({ name: 1 });
    } catch (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product object
   */
  static async getProductById(id) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }
      return product;
    } catch (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }
  }

  /**
   * Get product by barcode
   * @param {string} barcode - Product barcode
   * @returns {Promise<Object>} Product object
   */
  static async getProductByBarcode(barcode) {
    try {
      const product = await Product.findOne({ barcode });
      if (!product) {
        throw new Error('Product not found');
      }
      return product;
    } catch (error) {
      throw new Error(`Error fetching product by barcode: ${error.message}`);
    }
  }

  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  static async createProduct(productData) {
    try {
      // Check if product with same code or barcode already exists
      const existingProduct = await Product.findOne({
        $or: [
          { code: productData.code },
          { barcode: productData.barcode }
        ]
      });

      if (existingProduct) {
        if (existingProduct.code === productData.code) {
          throw new Error('Product with this code already exists');
        }
        if (existingProduct.barcode === productData.barcode) {
          throw new Error('Product with this barcode already exists');
        }
      }

      const product = new Product(productData);
      await product.save();
      return product;
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  /**
   * Update a product
   * @param {string} id - Product ID
   * @param {Object} productData - Updated product data
   * @returns {Promise<Object>} Updated product
   */
  static async updateProduct(id, productData) {
    try {
      // Check if updating code or barcode to one that already exists
      if (productData.code || productData.barcode) {
        const query = { _id: { $ne: id } };
        
        if (productData.code) {
          query.code = productData.code;
        }
        
        if (productData.barcode) {
          query.barcode = productData.barcode;
        }
        
        const existingProduct = await Product.findOne(query);
        
        if (existingProduct) {
          if (productData.code && existingProduct.code === productData.code) {
            throw new Error('Product with this code already exists');
          }
          if (productData.barcode && existingProduct.barcode === productData.barcode) {
            throw new Error('Product with this barcode already exists');
          }
        }
      }

      const product = await Product.findByIdAndUpdate(
        id,
        { ...productData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  /**
   * Delete a product
   * @param {string} id - Product ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteProduct(id) {
    try {
      const result = await Product.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Product not found');
      }
      return true;
    } catch (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }

  /**
   * Update product stock
   * @param {string} id - Product ID
   * @param {number} stock - New stock quantity
   * @returns {Promise<Object>} Updated product
   */
  static async updateStock(id, stock) {
    try {
      const product = await Product.findByIdAndUpdate(
        id,
        { stock, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
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
}

module.exports = ProductService;