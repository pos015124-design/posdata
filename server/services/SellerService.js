// SellerService.js
// Service for Seller CRUD and business logic
const Seller = require('../models/Seller');

const SellerService = {
  async createSeller(data) {
    const seller = new Seller(data);
    return seller.save();
  },
  async getSellerById(id) {
    return Seller.findById(id);
  },
  async getAllSellers(filter = {}) {
    return Seller.find(filter);
  },
  async updateSeller(id, updates) {
    return Seller.findByIdAndUpdate(id, updates, { new: true });
  },
  async deleteSeller(id) {
    return Seller.findByIdAndDelete(id);
  },
  async incrementSales(sellerId, amount) {
    const seller = await Seller.findById(sellerId);
    if (seller) {
      return seller.incrementSales(amount);
    }
    return null;
  }
};

module.exports = SellerService;
