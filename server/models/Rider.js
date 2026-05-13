/**
 * Rider — third-party delivery rider managed by BHABY GROUP LTD
 */
const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, required: true, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  vehicle:     { type: String, trim: true },          // e.g. "Bajaj", "Bicycle", "Motorbike"
  vehiclePlate:{ type: String, trim: true },
  isActive:    { type: Boolean, default: true },
  notes:       { type: String, trim: true },
  // Running stats
  totalDeliveries: { type: Number, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

riderSchema.index({ isActive: 1 });

module.exports = mongoose.model('Rider', riderSchema);
