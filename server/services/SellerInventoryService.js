// SellerInventoryService.js
// Service for SellerInventory CRUD and business logic
const SellerInventory = require('../models/SellerInventory');

const SellerInventoryService = {
  async createInventory(data) {
    const inv = new SellerInventory(data);
    return inv.save();
  },
  async getInventoryById(id) {
    return SellerInventory.findById(id).populate('product').populate('seller');
  },
  async getAllInventories(filter = {}) {
    return SellerInventory.find(filter).populate('product').populate('seller');
  },
  async updateInventory(id, updates) {
    return SellerInventory.findByIdAndUpdate(id, updates, { new: true }).populate('product').populate('seller');
  },
  async deleteInventory(id) {
    return SellerInventory.findByIdAndDelete(id);
  },
  async findBySeller(sellerId) {
    return SellerInventory.find({ seller: sellerId }).populate('product');
  },
  async findByProduct(productId) {
    return SellerInventory.find({ product: productId }).populate('seller');
  }
};

module.exports = SellerInventoryService;
