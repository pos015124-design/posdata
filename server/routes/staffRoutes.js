const express = require('express');
const router = express.Router();
const StaffService = require('../services/staffService');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { requireUser, requireAdmin, checkPermission } = require('./middleware/auth');

// Get all staff members
router.get('/', requireUser, async (req, res) => {
  try {
    const staff = await StaffService.getAllStaff();
    
    // Format the response to match frontend expectations
    const formattedStaff = staff.map(member => ({
      _id: member._id,
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone || "",
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: {
        isApproved: member.user ? member.user.isApproved : false,
        permissions: member.user ? member.user.permissions : {
          dashboard: false,
          pos: false,
          inventory: false,
          customers: false,
          staff: false,
          reports: false,
          settings: false
        }
      }
    }));
    
    console.log("Sending staff data to client:", formattedStaff);
    res.json({ staff: formattedStaff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get staff member by ID
router.get('/:id', requireUser, async (req, res) => {
  try {
    const staff = await StaffService.getStaffById(req.params.id);
    
    // Format the response to include user details
    const formattedStaff = {
      _id: staff._id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone || "",
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      user: {
        isApproved: staff.user ? staff.user.isApproved : false,
        permissions: staff.user ? staff.user.permissions : {
          dashboard: false,
          pos: false,
          inventory: false,
          customers: false,
          staff: false,
          reports: false,
          settings: false
        }
      }
    };
    
    console.log("Sending staff member data to client:", formattedStaff);
    res.json({ staff: formattedStaff });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    if (error.message === 'Staff member not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Create a new staff member
router.post('/add', requireUser, async (req, res) => {
  try {
    const { name, role, email } = req.body;
    
    if (!name || !role || !email) {
      return res.status(400).json({ message: 'Name, role, and email are required' });
    }
    
    const staff = await StaffService.createStaff({
      name,
      role,
      email,
      password: req.body.password // Optional, will use default if not provided
    });
    
    res.status(201).json({ 
      success: true,
      staff 
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a staff member
router.put('/:id', requireUser, async (req, res) => {
  try {
    console.log(`Updating staff with ID: ${req.params.id}`);
    console.log('Request body:', req.body);
    
    const staff = await StaffService.updateStaff(req.params.id, req.body);
    
    // Format the response to match frontend expectations
    const formattedStaff = {
      _id: staff._id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone || "",
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      user: staff.user ? {
        isApproved: staff.user.isApproved,
        permissions: staff.user.permissions
      } : null
    };
    
    console.log('Staff updated successfully:', formattedStaff);
    
    res.json({
      success: true,
      staff: formattedStaff
    });
  } catch (error) {
    console.error('Error updating staff member:', error);
    if (error.message === 'Staff member not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete a staff member
router.delete('/:id', requireUser, async (req, res) => {
  try {
    await StaffService.deleteStaff(req.params.id);
    res.json({ 
      success: true,
      message: 'Staff member deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    if (error.message === 'Staff member not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Performance update endpoint removed

// Get all pending (unapproved) staff members
router.get('/pending', requireAdmin, async (req, res) => {
  try {
    // Find all staff members whose associated user is not approved
    const staff = await Staff.find()
      .populate({
        path: 'user',
        match: { isApproved: false },
        select: 'email role isApproved permissions'
      })
      .exec();
    
    // Filter out staff whose user is null (already approved)
    const pendingStaff = staff.filter(s => s.user !== null);
    
    res.json({
      success: true,
      pendingStaff
    });
  } catch (error) {
    console.error('Error fetching pending staff:', error);
    res.status(500).json({ message: error.message });
  }
});

// Approve a staff member
router.put('/:id/approve', requireUser, checkPermission('staff'), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('user');
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    if (!staff.user) {
      return res.status(404).json({ message: 'User account not found for this staff member' });
    }
    
    // Update the user's isApproved status
    staff.user.isApproved = true;
    await staff.user.save();
    
    console.log('Staff member approved successfully');
    
    // Return the updated staff with the same format as the GET endpoints
    res.json({
      success: true,
      message: 'Staff member approved successfully',
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        phone: staff.phone || "",
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        user: {
          isApproved: staff.user.isApproved,
          permissions: staff.user.permissions
        }
      }
    });
  } catch (error) {
    console.error('Error approving staff member:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update staff permissions
router.put('/:id/permissions', requireUser, checkPermission('staff'), async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions) {
      return res.status(400).json({ message: 'Permissions are required' });
    }
    
    const staff = await Staff.findById(req.params.id).populate('user');
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    if (!staff.user) {
      return res.status(404).json({ message: 'User account not found for this staff member' });
    }
    
    // Update the user's permissions
    staff.user.permissions = permissions;
    await staff.user.save();
    
    console.log('Permissions updated successfully');
    
    // Return the updated staff with the same format as the GET endpoints
    res.json({
      success: true,
      message: 'Staff permissions updated successfully',
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        phone: staff.phone || "",
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        user: {
          isApproved: staff.user.isApproved,
          permissions: staff.user.permissions
        }
      }
    });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;