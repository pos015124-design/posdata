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
  static async getProductById(id, userId = null) {
    try {
      const filter = userId ? { _id: id, userId } : { _id: id };
      const product = await Product.findOne(filter);
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
  static async getProductByBarcode(barcode, userId = null) {
    try {
      const product = await Product.findOne(userId ? { barcode, userId } : { barcode });
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
  static async createProduct(productData, userId = null, businessId = null) {
    try {
      console.log(`[PRODUCT CREATE] Called with userId: ${userId}`);
      console.log(`[PRODUCT CREATE] Product name: ${productData.name}`);

      // Ownership is server-controlled. Never allow a request body to attach
      // a product to another user or business.
      const safeProductData = { ...productData };
      delete safeProductData.userId;
      delete safeProductData.businessId;
      delete safeProductData.isGlobal;
      
      // Check if product with same code or barcode already exists for this user
      const existingProduct = await Product.findOne({
        userId: userId,
        $or: [
          { code: safeProductData.code },
          { barcode: safeProductData.barcode }
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

      // Set ownership. If the route did not provide an explicit, already
      // validated business context, use the authenticated user's persisted
      // businessId rather than any client-supplied field.
      if (userId) {
        const User = require('../models/User');
        const owner = await User.findById(userId).select('businessId');
        const authoritativeBusinessId = businessId || owner?.businessId || null;
        safeProductData.userId = userId;
        if (authoritativeBusinessId) safeProductData.businessId = authoritativeBusinessId;
        console.log(`[PRODUCT CREATE] Setting userId: ${userId}`);
      } else {
        console.error(`[PRODUCT CREATE] WARNING: No userId provided!`);
      }

      const product = new Product(safeProductData);
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
  static async updateProduct(id, productData, userId = null) {
    try {
      // Ownership and global-catalog flags are immutable through the normal
      // product endpoint. Store attribution must not be changed by a client.
      const safeProductData = { ...productData };
      delete safeProductData.userId;
      delete safeProductData.businessId;
      delete safeProductData.isGlobal;

      // Check if updating code or barcode to one that already exists
      if (safeProductData.code || safeProductData.barcode) {
        const query = { _id: { $ne: id }, ...(userId ? { userId } : {}) };
        
        if (safeProductData.code) {
          query.code = safeProductData.code;
        }
        
        if (safeProductData.barcode) {
          query.barcode = safeProductData.barcode;
        }
        
        const existingProduct = await Product.findOne(query);
        
        if (existingProduct) {
          if (safeProductData.code && existingProduct.code === safeProductData.code) {
            throw new Error('Product with this code already exists');
          }
          if (safeProductData.barcode && existingProduct.barcode === safeProductData.barcode) {
            throw new Error('Product with this barcode already exists');
          }
        }
      }

      const product = await Product.findOneAndUpdate(
        userId ? { _id: id, userId } : { _id: id },
        { ...safeProductData, updatedAt: Date.now() },
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
  static async deleteProduct(id, userId = null) {
    try {
      const result = await Product.findOneAndDelete(userId ? { _id: id, userId } : { _id: id });
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