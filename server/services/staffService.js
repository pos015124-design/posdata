const Staff = require('../models/Staff');
const User = require('../models/User');
const mongoose = require('mongoose');
const { generatePasswordHash } = require('../utils/password');

class StaffService {
  /**
   * Get all staff members
   * @returns {Promise<Array>} Array of staff members
   */
  static async getAllStaff() {
    try {
      return await Staff.find()
        .sort({ name: 1 })
        .populate('user', 'email role isApproved permissions');
    } catch (error) {
      throw new Error(`Error fetching staff: ${error.message}`);
    }
  }

  /**
   * Get staff member by ID
   * @param {string} id - Staff ID
   * @returns {Promise<Object>} Staff object
   */
  static async getStaffById(id) {
    try {
      const staff = await Staff.findById(id)
        .populate('user', 'email role isApproved permissions');
      
      if (!staff) {
        throw new Error('Staff member not found');
      }
      
      return staff;
    } catch (error) {
      throw new Error(`Error fetching staff member: ${error.message}`);
    }
  }

  /**
   * Get staff member by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Staff object
   */
  static async getStaffByUserId(userId) {
    try {
      const staff = await Staff.findOne({ user: userId })
        .populate('user', 'email role isApproved permissions');
      
      if (!staff) {
        throw new Error('Staff member not found');
      }
      
      return staff;
    } catch (error) {
      throw new Error(`Error fetching staff member by user ID: ${error.message}`);
    }
  }

  /**
   * Create a new staff member with user account
   * @param {Object} staffData - Staff data
   * @returns {Promise<Object>} Created staff
   */
  static async createStaff(staffData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: staffData.email }).session(session);
      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Create user account
      const user = new User({
        email: staffData.email,
        password: await generatePasswordHash(staffData.password || 'password123'), // Default password if not provided
        role: staffData.role === 'Manager' ? 'admin' : 'user',
        isApproved: staffData.role === 'Manager' ? true : false, // Only managers (admins) are auto-approved
        permissions: {
          dashboard: true,
          pos: false,
          inventory: false,
          customers: false,
          staff: false,
          reports: false,
          settings: false
        }
      });

      await user.save({ session });

      // Create staff record
      const staff = new Staff({
        name: staffData.name,
        role: staffData.role,
        email: staffData.email,
        phone: staffData.phone,
        user: user._id
      });

      await staff.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        email: staff.email,
        isApproved: user.isApproved,
        permissions: user.permissions,
        userId: user._id
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Error creating staff member: ${error.message}`);
    }
  }

  /**
   * Update a staff member
   * @param {string} id - Staff ID
   * @param {Object} staffData - Updated staff data
   * @returns {Promise<Object>} Updated staff
   */
  static async updateStaff(id, staffData) {
    try {
      console.log(`Server: Updating staff with ID: ${id}`);
      console.log(`Server: Staff data received:`, staffData);
      
      // Validate the ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid staff ID format: ${id}`);
      }
      
      // Find the staff member
      const staff = await Staff.findById(id);
      if (!staff) {
        throw new Error('Staff member not found');
      }
      
      // Validate required fields
      if (!staffData.name || !staffData.role || !staffData.email) {
        throw new Error('Name, role, and email are required fields');
      }

      // If email is being updated, check if it's already in use
      if (staffData.email && staffData.email !== staff.email) {
        const existingUser = await User.findOne({
          email: staffData.email,
          _id: { $ne: staff.user }
        });
        
        if (existingUser) {
          throw new Error('Email already in use');
        }

        // Update user email
        await User.findByIdAndUpdate(
          staff.user,
          { email: staffData.email }
        );
      }

      // If role is being updated, update user role
      if (staffData.role && staffData.role !== staff.role) {
        const newUserRole = staffData.role === 'Manager' ? 'admin' : 'user';
        await User.findByIdAndUpdate(
          staff.user,
          { role: newUserRole }
        );
      }

      // Update staff record
      const updatedStaff = await Staff.findByIdAndUpdate(
        id,
        {
          ...staffData,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      ).populate('user', 'email role isApproved permissions');

      console.log(`Server: Staff updated successfully:`, updatedStaff);
      return updatedStaff;
    } catch (error) {
      console.error(`Server: Error updating staff member:`, error);
      throw new Error(`Error updating staff member: ${error.message}`);
    }
  }

  /**
   * Delete a staff member
   * @param {string} id - Staff ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteStaff(id) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const staff = await Staff.findById(id).session(session);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      // Delete user account
      await User.findByIdAndDelete(staff.user).session(session);

      // Delete staff record
      await Staff.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
      session.endSession();

      return true;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Error deleting staff member: ${error.message}`);
    }
  }

  // updatePerformance method removed
}

module.exports = StaffService;