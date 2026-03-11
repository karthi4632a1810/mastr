import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get users (with optional role filter)
router.get('/', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ email: 1 });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user password info (for HR/Admin to view)
router.get('/:id/password', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('email role password lastLogin');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get employee info if linked
    const employee = await Employee.findOne({ userId: user._id })
      .select('employeeId firstName lastName');

    // Test common passwords to show which one matches
    const commonPasswords = ['Temp@123', 'password', 'admin123', '123456', 'password123'];
    let matchedPassword = null;

    for (const testPassword of commonPasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      if (isMatch) {
        matchedPassword = testPassword;
        break;
      }
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        passwordHash: user.password, // Show the hash
        matchedPassword: matchedPassword, // Show if a common password matches
        lastLogin: user.lastLogin,
        employee: employee || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync user email with employee email (for HR/Admin)
router.put('/:id/sync-email', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find linked employee
    const employee = await Employee.findOne({ userId: user._id });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'No employee linked to this user' });
    }

    const oldEmail = user.email;
    const newEmail = employee.email.toLowerCase().trim();

    // Check if employee email already exists in another user account
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: `Email ${newEmail} already exists in another user account`
      });
    }

    // Update user email
    user.email = newEmail;
    await user.save();

    res.json({
      success: true,
      message: 'Email synced successfully',
      data: {
        userId: user._id,
        oldEmail: oldEmail,
        newEmail: newEmail,
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset user password (for HR/Admin)
router.put('/:id/password', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password (will be hashed automatically by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Get employee info if linked
    const employee = await Employee.findOne({ userId: user._id })
      .select('employeeId firstName lastName');

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        newPassword: newPassword, // Return the plain password for display
        employee: employee || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
