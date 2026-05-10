/**
 * Supplier — a seller's stock supplier / wholesaler contact
 * Each supplier belongs to one user (the seller).
 * Stock-in records are embedded as a sub-document array so the full
 * delivery history lives with the supplier.
 */
const mongoose = require('mongoose');

const stockInItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: { type: String, required: true, trim: true },
  quantity:    { type: Number, required: true, min: 1 },
  unitCost:    { type: Number, required: true, min: 0 },  // purchase price per unit
  totalCost:   { type: Number, required: true, min: 0 }   // quantity × unitCost
}, { _id: true });

const stockInSchema = new mongoose.Schema({
  date:          { type: Date, default: Date.now },
  referenceNo:   { type: String, trim: true },            // invoice / delivery note number
  notes:         { type: String, trim: true },
  items:         [stockInItemSchema],
  totalCost:     { type: Number, required: true, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  amountPaid:    { type: Number, default: 0, min: 0 }
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  contactName:  { type: String, trim: true },
  phone:        { type: String, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  address:      { type: String, trim: true },
  paymentTerms: { type: String, trim: true },   // e.g. "30 days credit", "Cash on delivery"
  notes:        { type: String, trim: true },
  isActive:     { type: Boolean, default: true },

  // Aggregated totals — updated on every stock-in save
  totalSpent:   { type: Number, default: 0 },   // sum of all stock-in totalCost
  totalOwed:    { type: Number, default: 0 },   // totalSpent - totalPaid

  stockIns: [stockInSchema]
}, { timestamps: true });

supplierSchema.index({ userId: 1, name: 1 });
supplierSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
