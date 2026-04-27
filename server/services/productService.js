const Product = require('../models/Product');
const { createPaginatedResponse } = require('../utils/pagination');

class ProductService {
  /**
   * Get all products with pagination and search
   * @param {Object} pagination - Pagination parameters
   * @param {Object} query - Query parameters for filtering
   * @param {string} userId - User ID to filter products (optional)
   * @returns {Promise<Object>} Paginated products with metadata
   */
  static async getAllProducts(pagination = {}, query = {}, userId = null) {
    try {
      console.log(`getAllProducts called with userId: ${userId}`);
      
      // Create a mock request object for pagination utility
      const mockReq = { pagination, query };

      // Additional filters based on query parameters
      const additionalFilter = {};

      // CRITICAL: Filter by user's products if userId provided
      if (userId) {
        additionalFilter.userId = userId;
        console.log(`Filtering products by userId: ${userId}`);
      } else {
        console.warn('WARNING: getAllProducts called WITHOUT userId - returning ALL products!');
      }

      if (query.category) {
        additionalFilter.category = query.category;
      }

      if (query.lowStock === 'true') {
        additionalFilter.$expr = {
          $lte: ['$stock', '$reorderPoint']
        };
      }

      if (query.inStock === 'true') {
        additionalFilter.stock = { $gt: 0 };
      }

      if (query.outOfStock === 'true') {
        additionalFilter.stock = { $eq: 0 };
      }

      // Use pagination utility with search fields
      const result = await createPaginatedResponse(
        Product,
        mockReq,
        additionalFilter,
        {
          searchFields: ['name', 'description', 'sku', 'supplier'],
          populate: 'category'
        }
      );
      
      console.log(`[PRODUCT FETCH] Found ${result.pagination?.total || 0} total products for userId: ${userId}`);
      
      return result;
    } catch (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  /**
   * Get global catalog products (shared product definitions)
   * @param {Object} query - Search parameters
   * @returns {Promise<Array>} Global products
   */
  static async getGlobalCatalog(query = {}) {
    try {
      const { search, category, limit = 20 } = query;
      
      const filter = { isGlobal: true, status: 'active' };
      
      if (search) {
        filter.$text = { $search: search };
      }
      
      if (category) {
        filter.category = category;
      }
      
      const products = await Product.find(filter)
        .select('name code barcode description price images category')
        .sort({ 'analytics.views': -1 })
        .limit(parseInt(limit));
      
      return products;
    } catch (error) {
      throw new Error(`Error fetching global catalog: ${error.message}`);
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
   * @param {string} userId - User ID creating the product
   * @returns {Promise<Object>} Created product
   */
  static async createProduct(productData, userId = null) {
    try {
      console.log(`[PRODUCT CREATE] Called with userId: ${userId}`);
      console.log(`[PRODUCT CREATE] Product name: ${productData.name}`);
      
      // Check if product with same code or barcode already exists for this user
      const existingProduct = await Product.findOne({
        userId: userId,
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

      // Set ownership
      if (userId) {
        productData.userId = userId;
        console.log(`[PRODUCT CREATE] Setting userId: ${userId}`);
      } else {
        console.error(`[PRODUCT CREATE] WARNING: No userId provided!`);
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