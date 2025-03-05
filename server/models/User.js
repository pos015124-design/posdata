const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  permissions: {
    dashboard: {
      type: Boolean,
      default: true
    },
    pos: {
      type: Boolean,
      default: false
    },
    inventory: {
      type: Boolean,
      default: false
    },
    customers: {
      type: Boolean,
      default: false
    },
    staff: {
      type: Boolean,
      default: false
    },
    reports: {
      type: Boolean,
      default: false
    },
    settings: {
      type: Boolean,
      default: false
    }
  }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);